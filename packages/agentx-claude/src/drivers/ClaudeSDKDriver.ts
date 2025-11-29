/**
 * ClaudeSDKDriver
 *
 * AgentDriver implementation using @anthropic-ai/claude-agent-sdk.
 *
 * @example
 * ```typescript
 * import { ClaudeSDKDriver } from "@deepractice-ai/agentx-claude";
 *
 * const MyAgent = agentx.agents.define({
 *   name: "Assistant",
 *   driver: ClaudeSDKDriver,
 * });
 *
 * const agent = agentx.agents.create(MyAgent, { apiKey: "xxx" });
 *
 * // Or with custom configuration
 * const MyAgent2 = agentx.agents.define({
 *   name: "CustomAssistant",
 *   driver: ClaudeSDKDriver.withConfig({ model: "claude-sonnet-4-5-20250929" }),
 * });
 * ```
 */

import {
  query,
  type SDKMessage,
  type SDKUserMessage,
  type SDKPartialAssistantMessage,
  type Query,
} from "@anthropic-ai/claude-agent-sdk";
import type {
  AgentDriver,
  AgentContext,
  DriverClass,
  UserMessage,
  StreamEventType,
  MessageStartEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextContentBlockStopEvent,
  TextDeltaEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  InputJsonDeltaEvent,
  ToolResultEvent,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { observableToAsyncIterable } from "../observableToAsyncIterable";
import { buildOptions } from "./ClaudeSDKOptions";
import { Subject } from "rxjs";

const logger = createLogger("ClaudeSDKDriver");

// ============================================================================
// Event Builders (inline, no external dependency)
// ============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function createEventBase(agentId: string) {
  return {
    uuid: generateUUID(),
    agentId,
    timestamp: Date.now(),
  };
}

function messageStart(agentId: string, id: string, model: string): MessageStartEvent {
  return {
    ...createEventBase(agentId),
    type: "message_start",
    data: { message: { id, model } },
  };
}

function messageStop(
  agentId: string,
  stopReason?: string,
  stopSequence?: string
): MessageStopEvent {
  return {
    ...createEventBase(agentId),
    type: "message_stop",
    data: {
      stopReason: stopReason as any,
      stopSequence,
    },
  };
}

function textContentBlockStart(agentId: string): TextContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_start",
    data: {},
  };
}

function textContentBlockStop(agentId: string): TextContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_stop",
    data: {},
  };
}

function toolUseContentBlockStop(agentId: string, id: string): ToolUseContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_stop",
    data: { id },
  };
}

function textDelta(agentId: string, text: string): TextDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "text_delta",
    data: { text },
  };
}

function toolUseContentBlockStart(
  agentId: string,
  toolId: string,
  toolName: string
): ToolUseContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_start",
    data: { id: toolId, name: toolName },
  };
}

function inputJsonDelta(agentId: string, partialJson: string): InputJsonDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "input_json_delta",
    data: { partialJson },
  };
}

function toolResult(
  agentId: string,
  toolId: string,
  content: string | any[],
  isError: boolean
): ToolResultEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_result",
    data: { toolId, content, isError },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildPrompt(message: UserMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => (part as any).text)
      .join("\n");
  }
  return "";
}

function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: buildPrompt(message) },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}

// ============================================================================
// SDK Message Processing
// ============================================================================

/**
 * Track current content block type for proper stop event generation
 */
interface ContentBlockContext {
  currentBlockType: "text" | "tool_use" | null;
  currentBlockIndex: number;
  currentToolId: string | null;
  lastStopReason: string | null;
  lastStopSequence: string | null;
}

async function* processStreamEvent(
  agentId: string,
  sdkMsg: SDKPartialAssistantMessage,
  context: ContentBlockContext
): AsyncIterable<StreamEventType> {
  const event = sdkMsg.event;

  switch (event.type) {
    case "message_start":
      // Reset context on new message
      context.currentBlockType = null;
      context.currentBlockIndex = 0;
      context.currentToolId = null;
      context.lastStopReason = null;
      context.lastStopSequence = null;
      yield messageStart(agentId, event.message.id, event.message.model);
      break;

    case "content_block_start":
      context.currentBlockIndex = event.index;
      if (event.content_block.type === "text") {
        context.currentBlockType = "text";
        yield textContentBlockStart(agentId);
      } else if (event.content_block.type === "tool_use") {
        context.currentBlockType = "tool_use";
        context.currentToolId = event.content_block.id;
        yield toolUseContentBlockStart(agentId, event.content_block.id, event.content_block.name);
      }
      break;

    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        yield textDelta(agentId, event.delta.text);
      } else if (event.delta.type === "input_json_delta") {
        yield inputJsonDelta(agentId, event.delta.partial_json);
      }
      break;

    case "content_block_stop":
      // Send appropriate stop event based on current block type
      if (context.currentBlockType === "tool_use" && context.currentToolId) {
        yield toolUseContentBlockStop(agentId, context.currentToolId);
      } else {
        yield textContentBlockStop(agentId);
      }
      // Reset current block type after stop
      context.currentBlockType = null;
      context.currentToolId = null;
      break;

    case "message_delta":
      if (event.delta.stop_reason) {
        // Track stopReason for message_stop event
        context.lastStopReason = event.delta.stop_reason;
        context.lastStopSequence = event.delta.stop_sequence || null;
      }
      break;

    case "message_stop":
      yield messageStop(
        agentId,
        context.lastStopReason || undefined,
        context.lastStopSequence || undefined
      );
      // Reset after emitting
      context.lastStopReason = null;
      context.lastStopSequence = null;
      break;
  }
}

async function* transformSDKMessages(
  agentId: string,
  sdkMessages: AsyncIterable<SDKMessage>,
  onSessionIdCaptured?: (sessionId: string) => void
): AsyncIterable<StreamEventType> {
  // Create context to track content block type across events
  const context: ContentBlockContext = {
    currentBlockType: null,
    currentBlockIndex: 0,
    currentToolId: null,
    lastStopReason: null,
    lastStopSequence: null,
  };

  for await (const sdkMsg of sdkMessages) {
    // Log raw SDK message for debugging
    logger.debug("[RAW SDK MESSAGE]", {
      type: sdkMsg.type,
      session_id: sdkMsg.session_id,
      message_id: (sdkMsg as any).message?.id,
      model: (sdkMsg as any).message?.model,
      event_type: (sdkMsg as any).event?.type,
    });

    if (sdkMsg.session_id && onSessionIdCaptured) {
      onSessionIdCaptured(sdkMsg.session_id);
    }

    switch (sdkMsg.type) {
      case "system":
        break;

      case "assistant":
        // Only check for synthetic error messages
        // All content processing is done via stream_event
        if (sdkMsg.message.model === "<synthetic>") {
          const errorText = sdkMsg.message.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join(" ");
          throw new Error(`Claude SDK error: ${errorText}`);
        }
        // Ignore assistant messages - stream_event provides all necessary events
        // MessageAssembler will assemble complete messages from stream events
        break;

      case "stream_event":
        yield* processStreamEvent(agentId, sdkMsg, context);
        break;

      case "result":
        if (sdkMsg.subtype !== "success") {
          throw new Error(`Claude SDK error: ${sdkMsg.subtype}`);
        }
        break;

      case "user":
        if (sdkMsg.message && Array.isArray(sdkMsg.message.content)) {
          for (const block of sdkMsg.message.content) {
            if (block.type === "tool_result") {
              yield toolResult(agentId, block.tool_use_id, block.content, block.is_error || false);
            }
          }
        }
        break;
    }
  }
}

// ============================================================================
// ClaudeSDKDriver Class
// ============================================================================

/**
 * ClaudeSDKDriver - Stateful driver for Claude Agent SDK
 *
 * Each instance is bound to a single Agent and manages its own
 * connection to the Claude SDK.
 *
 * Accepts any config via AgentContext and adapts it to Claude SDK Options internally.
 */
export class ClaudeSDKDriver implements AgentDriver {
  readonly name = "ClaudeSDK";
  readonly description = "Claude AI SDK integration using Streaming Input Mode";

  private readonly context: AgentContext;
  private readonly promptSubject: Subject<SDKUserMessage>;
  private readonly responseSubject: Subject<SDKMessage>;
  private readonly abortController: AbortController;
  private readonly sessionMap: Map<string, string>;
  private claudeQuery: Query | null = null;
  private isInitialized = false;

  constructor(context: AgentContext) {
    this.context = context;
    this.promptSubject = new Subject<SDKUserMessage>();
    this.responseSubject = new Subject<SDKMessage>();
    this.abortController = new AbortController();
    this.sessionMap = new Map();

    logger.debug("ClaudeSDKDriver created", { agentId: context.agentId });
  }

  /**
   * Initialize the driver (lazy initialization on first message)
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const agentId = this.context.agentId;
    logger.info("Initializing ClaudeSDKDriver", { agentId });

    // Convert AgentContext to Claude SDK Options
    const options = buildOptions(this.context, this.abortController);
    const promptStream = observableToAsyncIterable(this.promptSubject);

    this.claudeQuery = query({
      prompt: promptStream,
      options,
    });

    this.isInitialized = true;

    // Background listener for SDK responses
    (async () => {
      try {
        for await (const sdkMsg of this.claudeQuery!) {
          this.responseSubject.next(sdkMsg);
        }
        this.responseSubject.complete();
      } catch (error) {
        logger.error("Background listener error", { agentId, error });
        this.responseSubject.error(error);
      }
    })();

    logger.info("ClaudeSDKDriver initialized", { agentId });
  }

  /**
   * Receive a user message and yield stream events
   */
  async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
    const agentId = this.context.agentId;

    await this.initialize();

    const sessionId = agentId;
    const sdkUserMessage = buildSDKUserMessage(message, sessionId);

    logger.debug("Sending message", { agentId, content: buildPrompt(message).substring(0, 80) });
    this.promptSubject.next(sdkUserMessage);

    const responseStream = (async function* (self: ClaudeSDKDriver) {
      for await (const sdkMsg of observableToAsyncIterable(self.responseSubject)) {
        yield sdkMsg;
        if (sdkMsg.type === "result") break;
      }
    })(this);

    yield* transformSDKMessages(agentId, responseStream, (capturedSessionId) => {
      this.sessionMap.set(agentId, capturedSessionId);
    });
  }

  /**
   * Destroy the driver and cleanup resources
   */
  async destroy(): Promise<void> {
    const agentId = this.context.agentId;

    this.promptSubject.complete();
    this.responseSubject.complete();
    this.abortController.abort();

    logger.info("ClaudeSDKDriver destroyed", { agentId });
  }

  /**
   * Create a configured driver class with custom default options
   *
   * Allows pre-configuring driver defaults that will be merged with user config.
   *
   * @example
   * ```typescript
   * const MyAgent = defineAgent({
   *   name: "CustomAgent",
   *   driver: ClaudeSDKDriver.withConfig({
   *     model: "claude-sonnet-4-5-20250929",
   *     maxTurns: 10,
   *   }),
   * });
   * ```
   */
  static withConfig(extraConfig: Partial<Record<string, unknown>>): DriverClass {
    return class ConfiguredClaudeSDKDriver extends ClaudeSDKDriver {
      constructor(context: AgentContext) {
        // Merge extra config with context config
        const mergedContext = {
          ...context,
          ...extraConfig,
        } as AgentContext;
        super(mergedContext);
      }
    };
  }
}
