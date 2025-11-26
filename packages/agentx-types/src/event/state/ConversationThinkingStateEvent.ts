/**
 * Conversation Thinking State Event (L2: State Layer)
 *
 * State transition: ConversationStarted → Thinking
 *
 * Emitted when AI has received the user message and begins processing/thinking.
 * Represents the cognitive phase before response generation.
 */

import type { StateEvent } from "./StateEvent";

export interface ConversationThinkingStateEvent extends StateEvent {
  type: "conversation_thinking";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
