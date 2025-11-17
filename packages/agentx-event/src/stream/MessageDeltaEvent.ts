/**
 * Message Delta Event (L1: Stream Layer)
 *
 * Emitted for message-level metadata updates during streaming.
 * Contains information like stop reason and stop sequence.
 */

import type { StreamEvent } from "./StreamEvent";
import type { StopReason } from "../types/StopReason";

export interface MessageDeltaEvent extends StreamEvent {
  type: "message_delta";

  /**
   * Event data
   */
  data: {
    /**
     * Message-level delta (metadata updates)
     */
    delta: {
      /**
       * Reason why the message stopped
       *
       * - "end_turn": Natural conversation end (exchange complete)
       * - "tool_use": Model wants to use a tool (more messages coming)
       * - "max_tokens": Reached token limit
       * - "stop_sequence": Encountered custom stop sequence
       */
      stopReason?: StopReason;

      /**
       * Stop sequence that triggered message stop
       * Only present when stopReason is "stop_sequence"
       */
      stopSequence?: string;
    };
  };
}
