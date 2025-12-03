/**
 * Tool Use Content Block Start Event (L1: Stream Layer)
 *
 * Emitted when a tool use content block begins in the streaming response.
 * After this event, expect InputJsonDeltaEvent(s) with tool input JSON fragments.
 */

import type { StreamEvent } from "./StreamEvent";

export interface ToolUseContentBlockStartEvent extends StreamEvent {
  type: "tool_use_content_block_start";

  /**
   * Event data
   */
  data: {
    /**
     * Tool use ID
     */
    id: string;

    /**
     * Tool name
     */
    name: string;
  };
}
