/**
 * Base Layer
 *
 * Foundation types used across all event layers
 */

import type { StreamEventType } from "../stream";
import type { StateEventType } from "../state";
import type { MessageEventType } from "../message";
import type { TurnEventType } from "../turn";

export type { AgentEvent } from "./AgentEvent";

/**
 * Complete union of all AgentX events across all layers
 */
export type AgentEventType = StreamEventType | StateEventType | MessageEventType | TurnEventType;
