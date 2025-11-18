/**
 * ExchangeTrackerReactor
 *
 * Reactor that tracks request-response exchange pairs and generates Exchange Layer events.
 *
 * Architecture:
 * ```
 * Message Events (from MessageAssemblerReactor)
 *     ↓ Subscribe & Track
 * ExchangeTrackerReactor (this class)
 *     ↓ Emit
 * Exchange Events (to EventBus)
 * ```
 *
 * Responsibilities:
 * 1. Subscribe to Message Layer events
 * 2. Track user requests and assistant responses
 * 3. Pair requests with responses to form exchanges
 * 4. Calculate exchange-level metrics (duration, cost, tokens)
 * 5. Emit Exchange Layer events
 */

import type { Reactor } from "./reactor/Reactor";
import type { ReactorContext } from "./reactor/ReactorContext";
import type {
  // Stream Events (input)
  MessageDeltaEvent,
  // Message Events (input)
  UserMessageEvent,
  AssistantMessageEvent,
  // Exchange Events (output)
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";
import type { UserMessage, TokenUsage } from "@deepractice-ai/agentx-types";

/**
 * Pending exchange tracking
 */
interface PendingExchange {
  exchangeId: string;
  userMessage: UserMessage;
  requestedAt: number;
  lastStopReason?: string; // Track stop reason to determine exchange completion
}

/**
 * ExchangeTrackerReactor
 *
 * Tracks request-response pairs and generates Exchange events.
 */
export class AgentExchangeTracker implements Reactor {
  readonly id = "exchange-tracker";
  readonly name = "ExchangeTrackerReactor";

  private context: ReactorContext | null = null;

  // Exchange tracking
  private pendingExchange: PendingExchange | null = null;

  // Cost calculation (configurable)
  private costPerInputToken: number = 0.000003; // $3 per 1M tokens
  private costPerOutputToken: number = 0.000015; // $15 per 1M tokens

  async initialize(context: ReactorContext): Promise<void> {
    this.context = context;

    context.logger?.debug(`[ExchangeTrackerReactor] Initializing`, {
      reactorId: this.id,
    });

    this.subscribeToMessageEvents();

    context.logger?.info(`[ExchangeTrackerReactor] Initialized`, {
      reactorId: this.id,
    });
  }

  async destroy(): Promise<void> {
    const logger = this.context?.logger;

    logger?.debug(`[ExchangeTrackerReactor] Destroying`, {
      reactorId: this.id,
    });

    this.pendingExchange = null;
    this.context = null;

    logger?.info(`[ExchangeTrackerReactor] Destroyed`, {
      reactorId: this.id,
    });
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

    // User messages start new exchanges
    consumer.consumeByType("user_message", (event) => {
      this.onUserMessage(event as UserMessageEvent);
    });

    // Message delta events contain stop reason
    consumer.consumeByType("message_delta", (event) => {
      this.onMessageDelta(event as MessageDeltaEvent);
    });

    // Assistant messages may complete exchanges (depending on stop reason)
    consumer.consumeByType("assistant_message", (event) => {
      this.onAssistantMessage(event as AssistantMessageEvent);
    });
  }

  /**
   * Handle UserMessageEvent
   * Creates new exchange and emits ExchangeRequestEvent
   */
  private onUserMessage(event: UserMessageEvent): void {
    const exchangeId = this.generateId();

    // Store pending exchange
    this.pendingExchange = {
      exchangeId,
      userMessage: event.data,
      requestedAt: event.timestamp,
      lastStopReason: undefined,
    };

    // Emit ExchangeRequestEvent
    const requestEvent: ExchangeRequestEvent = {
      type: "exchange_request",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      exchangeId,
      data: {
        userMessage: event.data,
        requestedAt: event.timestamp,
      },
    };

    this.emitExchangeEvent(requestEvent);
  }

  /**
   * Handle MessageDeltaEvent
   * Captures stop reason and immediately completes exchange if stop_reason === "end_turn"
   */
  private onMessageDelta(event: MessageDeltaEvent): void {
    if (!this.pendingExchange) {
      return;
    }

    // Save stop reason from message delta
    if (event.data.delta.stopReason) {
      this.pendingExchange.lastStopReason = event.data.delta.stopReason;
      console.log("[AgentExchangeTracker] Captured stop reason:", event.data.delta.stopReason);

      // If stop_reason is "end_turn", complete the exchange immediately
      // (Don't wait for assistant_message which might be empty or delayed)
      if (event.data.delta.stopReason === "end_turn") {
        this.completeExchange(event.timestamp);
      }
    }
  }

  /**
   * Handle AssistantMessageEvent
   * (Exchange completion is now handled in onMessageDelta)
   */
  private onAssistantMessage(_event: AssistantMessageEvent): void {
    // Exchange completion is now handled in onMessageDelta when stopReason === "end_turn"
    // This method is kept for backward compatibility but doesn't complete exchanges anymore
  }

  /**
   * Complete the exchange and emit ExchangeResponseEvent
   */
  private completeExchange(completedAt: number): void {
    if (!this.pendingExchange) {
      return;
    }

    const { exchangeId, requestedAt } = this.pendingExchange;
    console.log("[AgentExchangeTracker] Completing exchange:", exchangeId);

    const duration = completedAt - requestedAt;

    // Calculate cost (we don't have usage here, will be 0)
    const usage = { input: 0, output: 0 };
    const cost = this.calculateCost(usage);

    // Emit ExchangeResponseEvent
    const responseEvent: ExchangeResponseEvent = {
      type: "exchange_response",
      uuid: this.generateId(),
      agentId: this.context!.agentId,
      timestamp: Date.now(),
      exchangeId,
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

    this.emitExchangeEvent(responseEvent);

    // Clear pending exchange
    this.pendingExchange = null;
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
   * Emit Exchange event to EventBus
   */
  private emitExchangeEvent(event: ExchangeRequestEvent | ExchangeResponseEvent): void {
    if (!this.context) return;
    this.context.producer.produce(event as any);
  }

  private generateId(): string {
    return `exchange_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
