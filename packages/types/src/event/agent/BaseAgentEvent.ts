/**
 * BaseAgentEvent - Base type for all Agent domain events
 *
 * All Agent events have:
 * - source: "agent"
 * - category: stream | state | message | turn
 * - intent: "notification"
 */

import type { SystemEvent, EventContext } from "../base";

/**
 * Agent event categories
 */
export type AgentEventCategory = "stream" | "state" | "message" | "turn";

/**
 * BaseAgentEvent - Base interface for all Agent events
 *
 * Extends SystemEvent with fixed source and intent.
 */
export interface BaseAgentEvent<
  T extends string,
  D,
  C extends AgentEventCategory,
> extends SystemEvent<T, D, "agent", C, "notification"> {
  /**
   * Runtime context (optional, added by Presenter)
   */
  readonly context?: EventContext;
}
