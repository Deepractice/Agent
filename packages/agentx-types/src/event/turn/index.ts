/**
 * Turn Layer
 *
 * Conversation turn events tracking complete user-AI interactions.
 * A turn is a complete conversation cycle including tool calls.
 *
 * Turn perspective:
 * - Groups related messages into user request + AI complete response
 * - Tracks turn-level metrics (duration, cost, tokens for entire agentic flow)
 * - Provides clear boundaries for each conversation turn
 *
 * Example flow:
 * 1. TurnRequestEvent - User sends request
 * 2. [Processing happens - Stream/State/Message events, tool calls]
 * 3. TurnResponseEvent - AI completes final response (after all tool calls)
 */

export type { TurnEvent, TurnEventType } from "./TurnEvent";
export type { TurnRequestEvent } from "./TurnRequestEvent";
export type { TurnResponseEvent } from "./TurnResponseEvent";

/**
 * Union of all Turn events
 */
export type TurnEventUnion =
  | import("./TurnRequestEvent").TurnRequestEvent
  | import("./TurnResponseEvent").TurnResponseEvent;
