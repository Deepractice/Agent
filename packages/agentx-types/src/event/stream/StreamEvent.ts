/**
 * Stream Event (L1: Stream Layer - Base)
 *
 * Base class for all streaming events.
 * Streaming events represent incremental, real-time updates during AI response generation.
 */

import type { AgentEvent } from "../base/AgentEvent";

/**
 * StreamEvent
 *
 * Base for all streaming events in L1 layer.
 * All stream events may have an index indicating which content block they belong to.
 */
export interface StreamEvent extends AgentEvent {
  /**
   * Content block index (for responses with multiple content blocks)
   */
  index?: number;
}
