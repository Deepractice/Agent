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

import type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";
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
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
} from "@deepractice-ai/agentx-event";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

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
export class AgentStateMachine implements AgentReactor {
  readonly id = "state-machine";
  readonly name = "StateMachineReactor";

  private context: AgentReactorContext | null = null;
  private logger: LoggerProvider;

  // State tracking
  private currentState: AgentState = "initializing";

  // Conversation tracking
  private conversationStartTime: number | null = null;

  constructor() {
    this.logger = createLogger("core/agent/AgentStateMachine");
  }

  async initialize(context: AgentReactorContext): Promise<void> {
    this.context = context;

    this.logger.info("Initializing StateMachine", {
      agentId: context.agentId,
      sessionId: context.sessionId,
    });

    // Subscribe to Stream Layer events
    this.subscribeToStreamEvents();

    this.logger.debug("StateMachine subscribed to stream events");
  }

  async destroy(): Promise<void> {
    this.logger.debug("Destroying StateMachine");
    // No explicit unsubscribe needed - ReactorContext handles lifecycle
    this.context = null;
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
    consumer.consumeByType("text_content_block_start", (event: TextContentBlockStartEvent) => {
      this.onTextContentBlockStart(event);
    });

    consumer.consumeByType("text_content_block_stop", (event: TextContentBlockStopEvent) => {
      this.onTextContentBlockStop(event);
    });

    consumer.consumeByType(
      "tool_use_content_block_start",
      (event: ToolUseContentBlockStartEvent) => {
        this.onToolUseContentBlockStart(event);
      }
    );

    consumer.consumeByType("tool_use_content_block_stop", (event: ToolUseContentBlockStopEvent) => {
      this.onToolUseContentBlockStop(event);
    });
  }

  /**
   * Handle MessageStartEvent
   * Triggers: ConversationStartStateEvent
   */
  private onMessageStart(event: MessageStartEvent): void {
    this.conversationStartTime = event.timestamp;

    // Emit ConversationStartStateEvent
    const conversationStartEvent: ConversationStartStateEvent = {
      type: "conversation_start",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "conversation_started",
        trigger: "message_start",
      },
      data: {
        // Note: We don't have UserMessage here in stream layer
        // This will be populated by a higher-level reactor that has message context
        userMessage: {} as any,
      },
    };
    this.emitStateEvent(conversationStartEvent);

    // Transition state
    this.transitionState("conversation_active");
  }

  /**
   * Handle MessageStopEvent
   * Triggers: ConversationEndStateEvent
   */
  private onMessageStop(event: MessageStopEvent): void {
    const duration = this.conversationStartTime ? event.timestamp - this.conversationStartTime : 0;

    // Emit ConversationEndStateEvent
    const conversationEndEvent: ConversationEndStateEvent = {
      type: "conversation_end",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      previousState: this.currentState,
      transition: {
        reason: "conversation_completed",
        durationMs: duration,
        trigger: "message_stop",
      },
      data: {
        // Note: These fields should be populated by a higher-level reactor
        // that has access to complete messages and stats.
        // AgentStateMachine only tracks state transitions at stream level.
        assistantMessage: {} as any,
        durationMs: duration,
        durationApiMs: 0,
        numTurns: 0,
        result: "completed",
        totalCostUsd: 0,
        usage: {
          input: 0,
          output: 0,
        },
      },
    };
    this.emitStateEvent(conversationEndEvent);

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
    const previousState = this.currentState;
    this.currentState = newState;

    this.logger.debug("State transition", {
      from: previousState,
      to: newState,
    });
  }

  /**
   * Emit State event to EventBus
   */
  private emitStateEvent(
    event:
      | AgentInitializingStateEvent
      | AgentReadyStateEvent
      | ConversationStartStateEvent
      | ConversationThinkingStateEvent
      | ConversationRespondingStateEvent
      | ConversationEndStateEvent
      | ToolPlannedStateEvent
      | ToolExecutingStateEvent
      | ToolCompletedStateEvent
  ): void {
    if (!this.context) return;
    this.context.producer.produce(event as any);
  }

  private generateId(): string {
    return `state_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
