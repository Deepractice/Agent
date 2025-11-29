/**
 * Turn Events (L4: Turn Layer)
 *
 * Turn Layer events track complete conversation turns (user request + AI response with tool calls).
 * Useful for analytics, cost tracking, and performance monitoring.
 */

import type { AgentEvent } from "../base/AgentEvent";

/**
 * Base Turn Event
 *
 * All turn layer events include a turnId for pairing requests with responses.
 */
export interface TurnEvent extends AgentEvent {
  /**
   * Unique ID for this turn (used to pair request/response)
   */
  turnId: string;
}

/**
 * Union type of all Turn Events
 */
export type TurnEventType =
  | import("./TurnRequestEvent").TurnRequestEvent
  | import("./TurnResponseEvent").TurnResponseEvent;
