/**
 * AgentState
 *
 * Agent conversation states for fine-grained monitoring.
 *
 * State transitions:
 * ```
 * idle → thinking → responding → idle
 *                       ↓
 *              planning_tool → awaiting_tool_result
 *                       ↓
 *                   thinking → responding → idle
 *
 * Any state can transition to error:
 * thinking/responding/planning_tool/awaiting_tool_result → error → idle
 * ```
 */

/**
 * Agent state types
 */
export type AgentState =
  | "idle" // Waiting for user input
  | "thinking" // LLM is thinking
  | "responding" // LLM is generating response
  | "planning_tool" // Generating tool call parameters
  | "awaiting_tool_result" // Waiting for tool execution result
  | "error"; // Error occurred during processing
