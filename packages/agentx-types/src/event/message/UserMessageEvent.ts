/**
 * User Message Event (L3: Message Layer)
 *
 * Message view: Represents a complete user message.
 * Different from L2 State view which focuses on state transitions.
 *
 * L2 vs L3:
 * - L2 (State): ConversationStartStateEvent - "conversation started" (state transition)
 * - L3 (Message): UserMessageEvent - "user sent a message" (message perspective)
 *
 * Both can coexist - same data, different perspectives.
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { UserMessage } from "~/message";

export interface UserMessageEvent extends AgentEvent {
  type: "user_message";

  /**
   * Message data
   */
  data: UserMessage;
}
