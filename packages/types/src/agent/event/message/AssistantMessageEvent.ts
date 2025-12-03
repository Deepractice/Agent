/**
 * Assistant Message Event (L3: Message Layer)
 *
 * Message view: Represents a complete assistant response.
 * Different from L2 State view which focuses on state transitions.
 *
 * L2 vs L3:
 * - L2 (State): ConversationEndStateEvent - "conversation ended" (state transition)
 * - L3 (Message): AssistantMessageEvent - "assistant replied" (message perspective)
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { AssistantMessage } from "~/agent/message";

export interface AssistantMessageEvent extends AgentEvent {
  type: "assistant_message";

  /**
   * Message data
   */
  data: AssistantMessage;
}
