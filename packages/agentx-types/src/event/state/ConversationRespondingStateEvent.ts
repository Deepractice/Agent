/**
 * Conversation Responding State Event (L2: State Layer)
 *
 * State transition: Thinking → Responding
 *
 * Emitted when AI starts generating response (text stream begins).
 * Represents the active response generation phase.
 *
 * After this event, expect L1 stream events (TextDelta, etc.).
 */

import type { StateEvent } from "./StateEvent";

export interface ConversationRespondingStateEvent extends StateEvent {
  type: "conversation_responding";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
