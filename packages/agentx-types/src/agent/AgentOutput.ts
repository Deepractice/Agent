/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: Raw streaming events
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 */

import type { StreamEventType, StateEventType, MessageEventType, TurnEventType } from "~/event";

/**
 * All possible output types from Agent
 */
export type AgentOutput = StreamEventType | StateEventType | MessageEventType | TurnEventType;
