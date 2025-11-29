/**
 * Conversation Queued State Event (L2: State Layer)
 *
 * State transition: Idle → Queued
 *
 * Emitted when a user message is received and queued for processing.
 * This is the first state in the conversation lifecycle, indicating
 * the message has been accepted but the agent hasn't started processing yet.
 *
 * Typical flow:
 * idle → queued → conversation_active → thinking → responding → idle
 */

import type { StateEvent } from "./StateEvent";
import type { UserMessage } from "~/message";

export interface ConversationQueuedStateEvent extends StateEvent {
  type: "conversation_queued";

  /**
   * Event data
   */
  data: {
    /**
     * User message that was queued
     */
    userMessage: UserMessage;

    /**
     * Queue position (optional, for future multi-message support)
     */
    queuePosition?: number;
  };
}
