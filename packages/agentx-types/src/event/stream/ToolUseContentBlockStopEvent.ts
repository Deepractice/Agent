/**
 * Tool Use Content Block Stop Event (L1: Stream Layer)
 *
 * Emitted when a tool use content block completes streaming.
 * Marks the end of input JSON delta events for this tool call.
 */

import type { StreamEvent } from "./StreamEvent";

export interface ToolUseContentBlockStopEvent extends StreamEvent {
  type: "tool_use_content_block_stop";

  /**
   * Event data
   */
  data: {
    /**
     * Tool use ID
     */
    id: string;
  };
}
