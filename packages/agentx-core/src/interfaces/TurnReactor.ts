/**
 * TurnReactor
 *
 * User-facing interface for handling Turn layer events.
 * All methods are optional - users only implement what they need.
 */

import type { TurnRequestEvent, TurnResponseEvent } from "@deepractice-ai/agentx-event";
import type { AgentReactorContext } from "./AgentReactor";

/**
 * Turn layer reactor
 *
 * Handles request-response pairs with analytics data.
 * Use this for cost tracking, performance monitoring, usage analytics, etc.
 *
 * @example
 * ```typescript
 * class CostTracker implements TurnReactor {
 *   private totalCost = 0;
 *
 *   onTurnResponse(event) {
 *     this.totalCost += event.data.costUsd;
 *     console.log(`Total cost: $${this.totalCost.toFixed(4)}`);
 *     console.log(`Duration: ${event.data.durationMs}ms`);
 *     console.log(`Tokens: ${event.data.usage.totalTokens}`);
 *   }
 * }
 * ```
 */
export interface TurnReactor {
  /**
   * Called when a user initiates a request
   */
  onTurnRequest?(event: TurnRequestEvent): void;

  /**
   * Called when assistant completes a response
   * Includes cost, duration, and token usage analytics
   */
  onTurnResponse?(event: TurnResponseEvent): void;

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
