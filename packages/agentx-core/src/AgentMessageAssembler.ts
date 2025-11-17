/**
 * MessageAssemblerReactor
 *
 * Reactor that assembles complete Message Layer events from Stream Layer events.
 *
 * Architecture:
 * ```
 * Stream Events (deltas from DriverReactor)
 *     ↓ Subscribe & Accumulate
 * MessageAssemblerReactor (this class)
 *     ↓ Emit
 * Message Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Stream Layer delta events
 * 2. Accumulate incremental data (text deltas, tool input JSON, etc.)
 * 3. Detect completion signals (MessageStopEvent, ContentBlockStopEvent)
 * 4. Assemble and emit complete Message events
 */

import type { Reactor } from "./reactor/Reactor";
import type { ReactorContext } from "./reactor/ReactorContext";
import type {
  // Stream Events (input)
  TextDeltaEvent,
  TextContentBlockStopEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  MessageStopEvent,
  // Message Events (output)
  AssistantMessageEvent,
  ToolUseMessageEvent,
} from "@deepractice-ai/agentx-event";
import type {
  AssistantMessage,
  ToolUseMessage,
  ToolCallPart,
  ToolResultPart,
} from "@deepractice-ai/agentx-types";
import { emitError } from "./utils/emitError";

/**
 * Pending content accumulator
 */
interface PendingContent {
  type: "text" | "tool_use";
  index: number;
  // For text content
  textDeltas?: string[];
  // For tool use
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
}

/**
 * MessageAssemblerReactor
 *
 * Assembles complete Message events from Stream deltas.
 */
export class AgentMessageAssembler implements Reactor {
  readonly id = "message-assembler";
  readonly name = "MessageAssemblerReactor";

  private context: ReactorContext | null = null;

  // Content accumulation
  private pendingContents: Map<number, PendingContent> = new Map();
  private currentMessageId: string | null = null;
  private messageStartTime: number | null = null;

  async initialize(context: ReactorContext): Promise<void> {
    this.context = context;

    context.logger?.debug(`[MessageAssemblerReactor] Initializing`, {
      reactorId: this.id,
    });

    this.subscribeToStreamEvents();

    context.logger?.info(`[MessageAssemblerReactor] Initialized`, {
      reactorId: this.id,
    });
  }

  async destroy(): Promise<void> {
    const logger = this.context?.logger;

    logger?.debug(`[MessageAssemblerReactor] Destroying`, {
      reactorId: this.id,
    });

    this.pendingContents.clear();
    this.context = null;

    logger?.info(`[MessageAssemblerReactor] Destroyed`, {
      reactorId: this.id,
    });
  }

  /**
   * Subscribe to Stream Layer events
   */
  private subscribeToStreamEvents(): void {
    if (!this.context) return;

    const { consumer } = this.context;

    // Text content deltas
    consumer.consumeByType("text_delta", (event) => {
      this.onTextDelta(event as TextDeltaEvent);
    });

    consumer.consumeByType("text_content_block_stop", (event) => {
      this.onTextContentBlockStop(event as TextContentBlockStopEvent);
    });

    // Tool use content
    consumer.consumeByType("tool_use_content_block_start", (event) => {
      this.onToolUseContentBlockStart(event as ToolUseContentBlockStartEvent);
    });

    consumer.consumeByType("input_json_delta", (event) => {
      this.onInputJsonDelta(event as InputJsonDeltaEvent);
    });

    consumer.consumeByType("tool_use_content_block_stop", (event) => {
      this.onToolUseContentBlockStop(event as ToolUseContentBlockStopEvent);
    });

    // Message lifecycle
    consumer.consumeByType("message_start", (event) => {
      this.onMessageStart(event);
    });

    consumer.consumeByType("message_stop", (event) => {
      this.onMessageStop(event as MessageStopEvent);
    });

    // Note: user_message events are already complete and emitted by AgentService
    // No need to subscribe here - they don't require assembly
  }

  /**
   * Handle message start
   */
  private onMessageStart(event: any): void {
    this.currentMessageId = this.generateId();
    this.messageStartTime = event.timestamp;
    this.pendingContents.clear();
  }

  /**
   * Handle TextDeltaEvent
   * Accumulate text deltas for later assembly
   */
  private onTextDelta(event: TextDeltaEvent): void {
    // Use index 0 for text content (single text block)
    const index = 0;

    if (!this.pendingContents.has(index)) {
      this.pendingContents.set(index, {
        type: "text",
        index,
        textDeltas: [],
      });
    }

    const pending = this.pendingContents.get(index)!;
    if (pending.type === "text") {
      pending.textDeltas!.push(event.data.text);
    }
  }

  /**
   * Handle TextContentBlockStopEvent
   * Assemble accumulated text deltas (but don't emit yet, wait for MessageStop)
   */
  private onTextContentBlockStop(_event: TextContentBlockStopEvent): void {
    // Text accumulation is complete, but we wait for MessageStop to emit
  }

  /**
   * Handle ToolUseContentBlockStartEvent
   * Initialize tool use accumulator
   */
  private onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void {
    console.log("[AgentMessageAssembler] Tool use content block start:", {
      toolId: event.data.id,
      toolName: event.data.name,
    });

    // Use index 1 for tool content (separate from text block)
    const index = 1;

    this.pendingContents.set(index, {
      type: "tool_use",
      index,
      toolId: event.data.id,
      toolName: event.data.name,
      toolInputJson: "",
    });
  }

  /**
   * Handle InputJsonDeltaEvent
   * Accumulate tool input JSON deltas
   */
  private onInputJsonDelta(event: InputJsonDeltaEvent): void {
    // Use index 1 for tool content
    const index = 1;
    const pending = this.pendingContents.get(index);

    if (pending && pending.type === "tool_use") {
      pending.toolInputJson! += event.data.partialJson;
      console.log("[AgentMessageAssembler] Input JSON delta accumulated:", {
        partialJson: event.data.partialJson,
        totalLength: pending.toolInputJson!.length,
      });
    } else {
      console.warn("[AgentMessageAssembler] Input JSON delta received but no pending tool_use content!");
    }
  }

  /**
   * Handle ToolUseContentBlockStopEvent
   * Assemble complete ToolUseMessage event
   */
  private onToolUseContentBlockStop(_event: ToolUseContentBlockStopEvent): void {
    console.log("[AgentMessageAssembler] Tool use content block stop");

    // Use index 1 for tool content
    const index = 1;
    const pending = this.pendingContents.get(index);

    if (!pending || pending.type !== "tool_use") {
      console.warn("[AgentMessageAssembler] No pending tool_use content found!");
      return;
    }

    console.log("[AgentMessageAssembler] Assembling tool use message:", {
      toolId: pending.toolId,
      toolName: pending.toolName,
      toolInputJson: pending.toolInputJson,
    });

    try {
      // Parse accumulated JSON
      const toolInput = pending.toolInputJson
        ? JSON.parse(pending.toolInputJson)
        : {};

      console.log("[AgentMessageAssembler] Parsed tool input:", toolInput);

      // Create ToolCallPart
      const toolCall: ToolCallPart = {
        type: "tool-call",
        id: pending.toolId!,
        name: pending.toolName!,
        input: toolInput,
      };

      // Create ToolResultPart (placeholder, will be filled later by actual tool execution)
      const toolResult: ToolResultPart = {
        type: "tool-result",
        id: pending.toolId!,
        name: pending.toolName!,
        output: {
          type: "text",
          value: "", // Will be filled by tool execution
        },
      };

      // Create ToolUseMessage
      const toolUseMessage: ToolUseMessage = {
        id: this.generateId(),
        role: "tool-use",
        toolCall,
        toolResult,
        timestamp: Date.now(),
      };

      // Emit ToolUseMessageEvent
      const toolUseEvent: ToolUseMessageEvent = {
        type: "tool_use_message",
        uuid: this.generateId(),
        agentId: this.context!.agentId,
        timestamp: Date.now(),
        data: toolUseMessage,
      };

      console.log("[AgentMessageAssembler] Emitting tool_use_message event:", toolUseEvent);

      this.emitMessageEvent(toolUseEvent);

      // Remove from pending
      this.pendingContents.delete(index);
    } catch (error) {
      console.error("[AgentMessageAssembler] Failed to parse tool input JSON:", error);

      // Emit error_message event
      if (this.context) {
        emitError(
          this.context.producer,
          error instanceof Error ? error : new Error(String(error)),
          "validation",
          {
            agentId: this.context.agentId,
            componentName: "MessageAssembler",
          },
          {
            code: "TOOL_INPUT_PARSE_ERROR",
            details: { toolInputJson: pending.toolInputJson },
          }
        );
      }
    }
  }

  /**
   * Handle MessageStopEvent
   * Assemble complete AssistantMessage from all accumulated content
   */
  private onMessageStop(event: MessageStopEvent): void {
    if (!this.currentMessageId) {
      return;
    }

    // Assemble all text content
    const textParts: string[] = [];

    // Sort by index to maintain order
    const sortedContents = Array.from(this.pendingContents.values())
      .sort((a, b) => a.index - b.index);

    for (const pending of sortedContents) {
      if (pending.type === "text" && pending.textDeltas) {
        const fullText = pending.textDeltas.join("");
        textParts.push(fullText);
      }
    }

    const content = textParts.join(""); // Combine all text parts

    // Skip empty messages (e.g., tool-only messages with no text)
    if (!content || content.trim().length === 0) {
      console.log("[AgentMessageAssembler] Skipping empty assistant message");
      // Reset state
      this.currentMessageId = null;
      this.messageStartTime = null;
      this.pendingContents.clear();
      return;
    }

    // Create AssistantMessage
    const assistantMessage: AssistantMessage = {
      id: this.currentMessageId,
      role: "assistant",
      content,
      timestamp: this.messageStartTime || Date.now(),
      usage: event.data.usage,
    };

    // Emit AssistantMessageEvent
    const assistantEvent: AssistantMessageEvent = {
      type: "assistant_message",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      data: assistantMessage,
    };

    this.emitMessageEvent(assistantEvent);

    // Reset state
    this.currentMessageId = null;
    this.messageStartTime = null;
    this.pendingContents.clear();
  }

  /**
   * Emit Message event to EventBus
   */
  private emitMessageEvent(
    event: AssistantMessageEvent | ToolUseMessageEvent
  ): void {
    if (!this.context) return;
    this.context.producer.produce(event as any);
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
