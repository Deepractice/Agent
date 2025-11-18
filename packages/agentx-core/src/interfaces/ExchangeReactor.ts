/**
 * ExchangeReactor
 *
 * User-facing interface for handling Exchange layer events.
 * All methods are optional - users only implement what they need.
 */

import type {
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";
import type { AgentReactorContext } from "./AgentReactor";

/**
 * Exchange layer reactor
 *
 * Handles request-response pairs with analytics data.
 * Use this for cost tracking, performance monitoring, usage analytics, etc.
 *
 * @example
 * ```typescript
 * class CostTracker implements ExchangeReactor {
 *   private totalCost = 0;
 *
 *   onExchangeResponse(event) {
 *     this.totalCost += event.data.costUsd;
 *     console.log(`Total cost: $${this.totalCost.toFixed(4)}`);
 *     console.log(`Duration: ${event.data.durationMs}ms`);
 *     console.log(`Tokens: ${event.data.usage.totalTokens}`);
 *   }
 * }
 * ```
 */
export interface ExchangeReactor {
  /**
   * Called when a user initiates a request
   */
  onExchangeRequest?(event: ExchangeRequestEvent): void;

  /**
   * Called when assistant completes a response
   * Includes cost, duration, and token usage analytics
   */
  onExchangeResponse?(event: ExchangeResponseEvent): void;

  /**
   * Optional lifecycle: Called when reactor is initialized
   * Use this to set up resources (e.g., connect to database)
   */
  onInitialize?(context: AgentReactorContext): void | Promise<void>;

  /**
   * Optional lifecycle: Called when reactor is destroyed
   * Use this to clean up resources (e.g., close connections)
   */
  onDestroy?(): void | Promise<void>;
}
