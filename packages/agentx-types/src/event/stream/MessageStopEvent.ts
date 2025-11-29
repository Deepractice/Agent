/**
 * Message Stop Event (L1: Stream Layer)
 *
 * Emitted when the streaming message completes.
 * This signals the end of a message cycle.
 *
 * stopReason determines whether the conversation turn is complete:
 * - "end_turn": Natural completion, turn is done
 * - "tool_use": Model wants to use a tool, more messages coming
 * - "max_tokens": Hit token limit, turn is done
 * - "stop_sequence": Hit custom stop sequence, turn is done
 */

import type { StreamEvent } from "./StreamEvent";
import type { StopReason } from "~/llm/StopReason";

export interface MessageStopEvent extends StreamEvent {
  type: "message_stop";

  /**
   * Event data
   */
  data: {
    /**
     * Reason why the message stopped
     *
     * - "end_turn": Natural conversation end (turn complete)
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
}
