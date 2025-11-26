/**
 * Message Start Event (L1: Stream Layer)
 *
 * Emitted when a streaming message begins.
 * Contains initial message metadata.
 */

import type { StreamEvent } from "./StreamEvent";

export interface MessageStartEvent extends StreamEvent {
  type: "message_start";

  /**
   * Event data
   */
  data: {
    /**
     * Initial message metadata
     */
    message: {
      id: string;
      model: string;
    };
  };
}
