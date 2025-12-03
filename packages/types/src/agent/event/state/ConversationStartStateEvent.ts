/**
 * Conversation Start State Event (L2: State Layer)
 *
 * State transition: Idle → ConversationStarted
 *
 * Emitted when a new conversation round begins.
 * A conversation is a single user-assistant interaction cycle.
 *
 * Contains the user message that initiated this conversation.
 * Agent lifetime may contain multiple conversations.
 */

import type { StateEvent } from "./StateEvent";
import type { UserMessage } from "~/agent/message";

export interface ConversationStartStateEvent extends StateEvent {
  type: "conversation_start";

  /**
   * Event data
   */
  data: {
    /**
     * Optional conversation identifier
     */
    conversationId?: string;

    /**
     * User message that initiated this conversation
     */
    userMessage: UserMessage;
  };
}
