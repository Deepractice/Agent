/**
 * Text Content Block Stop Event (L1: Stream Layer)
 *
 * Emitted when a text content block completes streaming.
 * Marks the end of text delta events for this block.
 */

import type { StreamEvent } from "./StreamEvent";

export interface TextContentBlockStopEvent extends StreamEvent {
  type: "text_content_block_stop";

  /**
   * Event data (empty for stop events)
   */
  data: Record<string, never>;
}
