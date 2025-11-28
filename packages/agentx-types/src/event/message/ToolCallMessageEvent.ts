/**
 * Tool Call Message Event (Message Layer)
 *
 * Emitted when AI decides to call a tool.
 * Contains the tool call request (name, parameters).
 *
 * Subject: Assistant
 * Timing: At tool_use_content_block_stop
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { ToolCallMessage } from "~/message";

export interface ToolCallMessageEvent extends AgentEvent {
  type: "tool_call_message";

  /**
   * Tool call message data
   */
  data: ToolCallMessage;
}
