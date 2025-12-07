/**
 * AgentOutput - Union of all possible agent output events
 *
 * Includes all event layers:
 * - Stream: Real-time streaming events from Driver
 * - State: State machine transitions
 * - Message: Assembled messages
 * - Turn: Turn analytics
 */

import type { StreamEvent } from "./event/stream";
import type { AgentStateEvent } from "./event/state";
import type { AgentMessageEvent } from "./event/message";
import type { AgentTurnEvent } from "./event/turn";

/**
 * All possible output types from Agent
 */
export type AgentOutput = StreamEvent | AgentStateEvent | AgentMessageEvent | AgentTurnEvent;
