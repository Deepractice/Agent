/**
 * Turn Response Event (L4: Turn Layer)
 *
 * Emitted when assistant completes response for a turn.
 * Marks the end of a conversation turn (entire agentic flow complete including tool calls).
 *
 * Contains the assistant's final response and turn statistics.
 */

import type { TurnEvent } from "./TurnEvent";
import type { AssistantMessage } from "~/agent/message";

export interface TurnResponseEvent extends TurnEvent {
  type: "turn_response";

  /**
   * Event data
   */
  data: {
    /**
     * Assistant's final response message
     */
    assistantMessage: AssistantMessage;

    /**
     * Response timestamp
     */
    respondedAt: number;

    /**
     * Turn duration (milliseconds)
     */
    durationMs: number;

    /**
     * Token usage for this entire turn (including tool calls)
     */
    usage?: {
      input: number;
      output: number;
      cacheRead?: number;
      cacheWrite?: number;
    };

    /**
     * Cost for this turn (USD)
     */
    costUsd?: number;
  };
}
