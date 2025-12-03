/**
 * Text Content Block Start Event (L1: Stream Layer)
 *
 * Emitted when a text content block begins in the streaming response.
 * After this event, expect TextDeltaEvent(s) with incremental text.
 */

import type { StreamEvent } from "./StreamEvent";

export interface TextContentBlockStartEvent extends StreamEvent {
  type: "text_content_block_start";

  /**
   * Event data (empty for start events)
   */
  data: Record<string, never>;
}
