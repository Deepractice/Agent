/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: Raw streaming events
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 * - Error: Independent error events (transportable via SSE)
 */

import type {
  StreamEventType,
  StateEventType,
  MessageEventType,
  TurnEventType,
} from "~/agent/event";
import type { ErrorEvent } from "~/agent/event/error";

/**
 * All possible output types from Agent
 */
export type AgentOutput =
  | StreamEventType
  | StateEventType
  | MessageEventType
  | TurnEventType
  | ErrorEvent;
