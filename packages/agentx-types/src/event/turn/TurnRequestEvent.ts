/**
 * Turn Request Event (L4: Turn Layer)
 *
 * Emitted when a user request initiates a new turn.
 * Marks the start of a conversation turn (user input + complete AI response with tool calls).
 *
 * Contains the user's request and metadata about the turn.
 */

import type { TurnEvent } from "./TurnEvent";
import type { UserMessage } from "~/message";

export interface TurnRequestEvent extends TurnEvent {
  type: "turn_request";

  /**
   * Event data
   */
  data: {
    /**
     * User's request message
     */
    userMessage: UserMessage;

    /**
     * Request timestamp
     */
    requestedAt: number;
  };
}
