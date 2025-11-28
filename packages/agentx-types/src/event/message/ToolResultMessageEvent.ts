/**
 * Tool Result Message Event (Message Layer)
 *
 * Emitted when tool execution completes.
 * Contains the tool execution result.
 *
 * Subject: Tool
 * Timing: At tool_result event
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { ToolResultMessage } from "~/message";

export interface ToolResultMessageEvent extends AgentEvent {
  type: "tool_result_message";

  /**
   * Tool result message data
   */
  data: ToolResultMessage;
}
