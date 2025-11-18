/**
 * StateMachineReactor
 *
 * Reactor that automatically generates State Layer events from Stream Layer events.
 *
 * Architecture:
 * ```
 * Stream Events (from DriverReactor)
 *     ↓ Subscribe
 * StateMachineReactor (this class)
 *     ↓ Emit
 * State Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Stream Layer events from EventBus
 * 2. Track agent state transitions
 * 3. Automatically emit State Layer events
 * 4. Maintain state machine logic
 *
 * State Transitions:
 * ```
 * AgentInitializing
 *     ↓ (MessageStartEvent)
 * ConversationStart
 *     ↓ (ThinkingContentBlockStart)
 * ConversationThinking
 *     ↓ (TextContentBlockStart)
 * ConversationResponding
 *     ↓ (MessageStopEvent)
 * ConversationEnd
 * ```
 */

import type { Reactor } from "./reactor/Reactor";
import type { ReactorContext } from "./reactor/ReactorContext";
import type {
  // Stream Events (input)
  MessageStartEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  // State Events (output)
  AgentInitializingStateEvent,
  AgentReadyStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
} from "@deepractice-ai/agentx-event";

/**
 * Agent state types
 */
type AgentState =
  | "initializing"
  | "ready"
  | "conversation_active"
  | "thinking"
  | "responding"
  | "tool_executing"
  | "idle";

/**
 * StateMachineReactor
 *
 * Automatically generates State Layer events from Stream Layer events.
 */
export class AgentStateMachine implements Reactor {
  readonly id = "state-machine";
  readonly name = "StateMachineReactor";

  private context: ReactorContext | null = null;

  // State tracking
  private currentState: AgentState = "initializing";

  // Conversation tracking
  private conversationStartTime: number | null = null;

  async initialize(context: ReactorContext): Promise<void> {
    this.context = context;

    context.logger?.debug(`[StateMachineReactor] Initializing`, {
      reactorId: this.id,
    });

    // Subscribe to Stream Layer events
    this.subscribeToStreamEvents();

    context.logger?.info(`[StateMachineReactor] Initialized`, {
      reactorId: this.id,
    });
  }

  async destroy(): Promise<void> {
    const logger = this.context?.logger;

    logger?.debug(`[StateMachineReactor] Destroying`, {
      reactorId: this.id,
    });

    // No explicit unsubscribe needed - ReactorContext handles lifecycle

    this.context = null;

    logger?.info(`[StateMachineReactor] Destroyed`, {
      reactorId: this.id,
    });
  }

  /**
   * Subscribe to Stream Layer events
   */
  private subscribeToStreamEvents(): void {
    if (!this.context) return;

    const { consumer } = this.context;

    // Message lifecycle
    consumer.consumeByType("message_start", (event: MessageStartEvent) => {
      this.onMessageStart(event);
    });

    consumer.consumeByType("message_stop", (event: MessageStopEvent) => {
      this.onMessageStop(event);
    });

    // Content blocks
    consumer.consumeByType(
      "text_content_block_start",
      (event: TextContentBlockStartEvent) => {
        this.onTextContentBlockStart(event);
      }
    );

    consumer.consumeByType(
      "text_content_block_stop",
      (event: TextContentBlockStopEvent) => {
        this.onTextContentBlockStop(event);
      }
    );

    consumer.consumeByType(
      "tool_use_content_block_start",
      (event: ToolUseContentBlockStartEvent) => {
        this.onToolUseContentBlockStart(event);
      }
    );

    consumer.consumeByType(
      "tool_use_content_block_stop",
      (event: ToolUseContentBlockStopEvent) => {
        this.onToolUseContentBlockStop(event);
      }
    );
  }

  /**
   * Handle MessageStartEvent
   * Triggers: StreamStartStateEvent
   */
  private onMessageStart(event: MessageStartEvent): void {
    this.conversationStartTime = event.timestamp;

    // Emit StreamStartStateEvent
    const streamStartEvent: StreamStartStateEvent = {
      type: "stream_start",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "message_started",
        trigger: "message_start",
      },
      data: {},
    };
    this.emitStateEvent(streamStartEvent);

    // Transition state
    this.transitionState("conversation_active");
  }

  /**
   * Handle MessageStopEvent
   * Triggers: StreamCompleteStateEvent
   */
  private onMessageStop(event: MessageStopEvent): void {
    const duration = this.conversationStartTime
      ? event.timestamp - this.conversationStartTime
      : 0;

    // Emit StreamCompleteStateEvent
    const streamCompleteEvent: StreamCompleteStateEvent = {
      type: "stream_complete",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "stream_completed",
        durationMs: duration,
        trigger: "message_stop",
      },
      data: {},
    };
    this.emitStateEvent(streamCompleteEvent);

    // Transition state
    this.transitionState("idle");
    this.conversationStartTime = null;
  }

  /**
   * Handle TextContentBlockStartEvent
   * Triggers: ConversationRespondingStateEvent
   */
  private onTextContentBlockStart(_event: TextContentBlockStartEvent): void {
    const respondingEvent: ConversationRespondingStateEvent = {
      type: "conversation_responding",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "assistant_responding",
        trigger: "text_content_block_start",
      },
      data: {},
    };
    this.emitStateEvent(respondingEvent);

    this.transitionState("responding");
  }

  /**
   * Handle TextContentBlockStopEvent
   */
  private onTextContentBlockStop(_event: TextContentBlockStopEvent): void {
    // No state transition needed
  }

  /**
   * Handle ToolUseContentBlockStartEvent
   * Triggers: ToolPlannedStateEvent, ToolExecutingStateEvent
   */
  private onToolUseContentBlockStart(event: ToolUseContentBlockStartEvent): void {
    // Emit ToolPlannedStateEvent
    const toolPlannedEvent: ToolPlannedStateEvent = {
      type: "tool_planned",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      data: {
        id: event.data.id,
        name: event.data.name,
        input: {},
      },
    };
    this.emitStateEvent(toolPlannedEvent);

    // Emit ToolExecutingStateEvent
    const toolExecutingEvent: ToolExecutingStateEvent = {
      type: "tool_executing",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "tool_execution_started",
        trigger: "tool_use_content_block_start",
      },
      data: {},
    };
    this.emitStateEvent(toolExecutingEvent);

    this.transitionState("tool_executing");
  }

  /**
   * Handle ToolUseContentBlockStopEvent
   */
  private onToolUseContentBlockStop(_event: ToolUseContentBlockStopEvent): void {
    this.transitionState("conversation_active");
  }

  /**
   * Transition to new state
   */
  private transitionState(newState: AgentState): void {
    this.currentState = newState;
  }

  /**
   * Emit State event to EventBus
   */
  private emitStateEvent(
    event:
      | AgentInitializingStateEvent
      | AgentReadyStateEvent
      | ConversationThinkingStateEvent
      | ConversationRespondingStateEvent
      | ToolPlannedStateEvent
      | ToolExecutingStateEvent
      | ToolCompletedStateEvent
      | StreamStartStateEvent
      | StreamCompleteStateEvent
  ): void {
    if (!this.context) return;
    this.context.producer.produce(event as any);
  }

  private generateId(): string {
    return `state_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
