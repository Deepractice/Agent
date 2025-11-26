/**
 * Tool Use Message Event (Message Layer)
 *
 * Message view: Represents a complete tool usage (call + result).
 * This event is emitted AFTER the tool execution completes.
 *
 * Different from State events:
 * - State: ToolPlannedStateEvent, ToolCompletedStateEvent (lifecycle transitions)
 * - Message: ToolUseMessageEvent (complete usage record for display)
 *
 * Philosophy:
 * - From user's perspective: "The agent used a tool and got results"
 * - Complete data for message history and UI rendering
 * - No runtime state - pure completed record
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { ToolUseMessage } from "~/message";

export interface ToolUseMessageEvent extends AgentEvent {
  type: "tool_use_message";

  /**
   * Complete tool use data from agentx-types
   */
  data: ToolUseMessage;
}
