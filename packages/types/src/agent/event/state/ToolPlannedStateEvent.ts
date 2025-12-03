/**
 * Tool Planned State Event (L2: State Layer)
 *
 * State transition: Idle → ToolPlanned
 *
 * Emitted when AI decides to call a tool with complete parameters.
 * Represents the planning phase - tool call is decided but not yet executing.
 *
 * Philosophy:
 * - Tools are third-party executors (even though initiated by AI)
 * - Independent event for better UI responsiveness
 * - Fired as soon as complete tool call parameters are available
 *
 * Aligned with: Claude SDK's tool_use content block
 */

import type { AgentEvent } from "../base/AgentEvent";

/**
 * Tool use data structure
 * Matches Claude SDK's tool_use content block format
 */
export interface ToolUseData {
  /**
   * Unique identifier for this tool call
   */
  id: string;

  /**
   * Tool name
   */
  name: string;

  /**
   * Tool input parameters (complete JSON object, not partial)
   */
  input: Record<string, unknown>;
}

export interface ToolPlannedStateEvent extends AgentEvent {
  type: "tool_planned";

  /**
   * Event data
   */
  data: ToolUseData;
}
