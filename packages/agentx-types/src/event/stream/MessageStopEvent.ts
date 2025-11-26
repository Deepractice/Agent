/**
 * Message Stop Event (L1: Stream Layer)
 *
 * Emitted when the streaming message completes.
 * This signals the end of the entire streaming response.
 */

import type { StreamEvent } from "./StreamEvent";

export interface MessageStopEvent extends StreamEvent {
  type: "message_stop";

  /**
   * Event data (empty for stop events)
   */
  data: Record<string, never>;
}
