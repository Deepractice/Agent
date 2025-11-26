/**
 * TurnTrackerReactor
 *
 * Reactor that tracks request-response turn pairs and generates Turn Layer events.
 *
 * Architecture:
 * ```
 * Message Events (from MessageAssemblerReactor)
 *     ↓ Subscribe & Track
 * TurnTrackerReactor (this class)
 *     ↓ Emit
 * Turn Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Message Layer events
 * 2. Track user requests and assistant responses
 * 3. Pair requests with responses to form turns
 * 4. Calculate turn-level metrics (duration, cost, tokens)
 * 5. Emit Turn Layer events
 */

import type { AgentReactor, AgentReactorContext } from "./AgentReactor";
import type {
  // Stream Events (input)
  MessageDeltaEvent,
  // Message Events (input)
  UserMessageEvent,
  AssistantMessageEvent,
  // Turn Events (output)
  TurnRequestEvent,
  TurnResponseEvent,
} from "@deepractice-ai/agentx-event";
import type { UserMessage, TokenUsage } from "@deepractice-ai/agentx-types";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * Pending turn tracking
 */
interface PendingTurn {
  turnId: string;
  userMessage: UserMessage;
  requestedAt: number;
  lastStopReason?: string; // Track stop reason to determine turn completion
}

/**
 * TurnTrackerReactor
 *
 * Tracks request-response pairs and generates Turn events.
 */
export class AgentTurnTracker implements AgentReactor {
  readonly id = "turn-tracker";
  readonly name = "TurnTrackerReactor";

  private context: AgentReactorContext | null = null;
  private logger: LoggerProvider;

  // Turn tracking
  private pendingTurn: PendingTurn | null = null;

  // Cost calculation (configurable)
  private costPerInputToken: number = 0.000003; // $3 per 1M tokens
  private costPerOutputToken: number = 0.000015; // $15 per 1M tokens

  constructor() {
    this.logger = createLogger("core/agent/AgentTurnTracker");
  }

  async initialize(context: AgentReactorContext): Promise<void> {
    this.context = context;
    this.logger.debug("TurnTracker initialized");
    this.subscribeToMessageEvents();
  }

  async destroy(): Promise<void> {
    this.pendingTurn = null;
    this.context = null;
  }

  /**
   * Configure cost calculation
   */
  configureCost(inputTokenCost: number, outputTokenCost: number): void {
    this.costPerInputToken = inputTokenCost;
    this.costPerOutputToken = outputTokenCost;
  }

  /**
   * Subscribe to Message Layer events
   */
  private subscribeToMessageEvents(): void {
    if (!this.context) return;

    const { consumer } = this.context;

    // User messages start new turns
    consumer.consumeByType("user_message", (event: any) => {
      this.onUserMessage(event as UserMessageEvent);
    });

    // Message delta events contain stop reason
    consumer.consumeByType("message_delta", (event: any) => {
      this.onMessageDelta(event as MessageDeltaEvent);
    });

    // Assistant messages may complete turns (depending on stop reason)
    consumer.consumeByType("assistant_message", (event: any) => {
      this.onAssistantMessage(event as AssistantMessageEvent);
    });
  }

  /**
   * Handle UserMessageEvent
   * Creates new turn and emits TurnRequestEvent
   */
  private onUserMessage(event: UserMessageEvent): void {
    const turnId = this.generateId();

    // Store pending turn
    this.pendingTurn = {
      turnId,
      userMessage: event.data,
      requestedAt: event.timestamp,
      lastStopReason: undefined,
    };

    // Emit TurnRequestEvent
    const requestEvent: TurnRequestEvent = {
      type: "turn_request",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      turnId,
      data: {
        userMessage: event.data,
        requestedAt: event.timestamp,
      },
    };

    this.emitTurnEvent(requestEvent);
  }

  /**
   * Handle MessageDeltaEvent
   * Captures stop reason and immediately completes turn if stop_reason === "end_turn"
   */
  private onMessageDelta(event: MessageDeltaEvent): void {
    if (!this.pendingTurn) {
      this.logger.debug("MessageDelta received but no pending turn");
      return;
    }

    // Save stop reason from message delta
    if (event.data.delta.stopReason) {
      this.pendingTurn.lastStopReason = event.data.delta.stopReason;
      this.logger.info("Captured stop reason", {
        stopReason: event.data.delta.stopReason,
        turnId: this.pendingTurn.turnId,
      });

      // Complete turn based on stop reason
      // - "end_turn": Normal completion (no tool use)
      // - "tool_use": Tool calling in progress, DON'T complete yet
      // - "max_tokens": Hit token limit, complete turn
      // - "stop_sequence": Hit stop sequence, complete turn
      if (
        event.data.delta.stopReason === "end_turn" ||
        event.data.delta.stopReason === "max_tokens" ||
        event.data.delta.stopReason === "stop_sequence"
      ) {
        this.logger.info("Completing turn due to stop reason", {
          stopReason: event.data.delta.stopReason,
        });
        this.completeTurn(event.timestamp);
      } else if (event.data.delta.stopReason === "tool_use") {
        this.logger.info("Tool use detected, turn will continue", {
          turnId: this.pendingTurn.turnId,
        });
      }
    } else {
      this.logger.debug("MessageDelta without stop reason");
    }
  }

  /**
   * Handle AssistantMessageEvent
   * (Turn completion is now handled in onMessageDelta)
   */
  private onAssistantMessage(_event: AssistantMessageEvent): void {
    // Turn completion is now handled in onMessageDelta when stopReason === "end_turn"
    // This method is kept for backward compatibility but doesn't complete turns anymore
  }

  /**
   * Complete the turn and emit TurnResponseEvent
   */
  private completeTurn(completedAt: number): void {
    if (!this.pendingTurn) {
      return;
    }

    const { turnId, requestedAt } = this.pendingTurn;
    this.logger.debug("Completing turn", { turnId });

    const duration = completedAt - requestedAt;

    // Calculate cost (we don't have usage here, will be 0)
    const usage = { input: 0, output: 0 };
    const cost = this.calculateCost(usage);

    // Emit TurnResponseEvent
    const responseEvent: TurnResponseEvent = {
      type: "turn_response",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      turnId,
      data: {
        assistantMessage: {
          id: this.generateId(),
          role: "assistant",
          content: "",
          timestamp: completedAt,
        },
        respondedAt: completedAt,
        durationMs: duration,
        usage,
        costUsd: cost,
      },
    };

    this.emitTurnEvent(responseEvent);

    // Clear pending turn
    this.pendingTurn = null;
  }

  /**
   * Calculate cost from token usage
   */
  private calculateCost(usage: TokenUsage): number {
    const inputCost = usage.input * this.costPerInputToken;
    const outputCost = usage.output * this.costPerOutputToken;
    return inputCost + outputCost;
  }

  /**
   * Emit Turn event to EventBus
   */
  private emitTurnEvent(event: TurnRequestEvent | TurnResponseEvent): void {
    if (!this.context) return;
    this.context.producer.produce(event as any);
  }

  private generateId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
