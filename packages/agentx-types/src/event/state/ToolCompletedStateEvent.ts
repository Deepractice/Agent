/**
 * Tool Completed State Event (L2: State Layer)
 *
 * State transition: ToolExecuting → ToolCompleted
 *
 * Emitted when a tool execution completes successfully.
 * Represents successful completion with result data.
 *
 * Philosophy:
 * - Tools are third-party executors
 * - Tool results are system events, not user messages
 * - Carries the tool's complete output back to the AI
 *
 * Aligned with: Claude SDK's tool_result content block (success case)
 */

import type { AgentEvent } from "../base/AgentEvent";

/**
 * Tool result data structure
 * Matches Claude SDK's tool_result content block format
 */
export interface ToolResultData {
  /**
   * Tool call ID this result corresponds to
   */
  tool_use_id: string;

  /**
   * Complete tool execution result content
   */
  content: string | Array<{ type: "text"; text: string } | { type: "image"; source: unknown }>;

  /**
   * Execution duration in milliseconds
   */
  executionTimeMs?: number;
}

export interface ToolCompletedStateEvent extends AgentEvent {
  type: "tool_completed";

  /**
   * Event data
   */
  data: ToolResultData;
}
