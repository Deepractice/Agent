/**
 * Text Delta Event (L1: Stream Layer)
 *
 * Emitted when AI is generating text content incrementally.
 * This represents the "thinking" or "typing" phase of AI response.
 *
 * Usage: Display streaming text with typewriter effect
 */

import type { StreamEvent } from "./StreamEvent";

export interface TextDeltaEvent extends StreamEvent {
  type: "text_delta";

  /**
   * Event data
   */
  data: {
    /**
     * Incremental text content
     * Append this to previous deltas to build complete text
     */
    text: string;
  };
}
