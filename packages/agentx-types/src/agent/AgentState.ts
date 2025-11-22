/**
 * AgentState
 *
 * Standard agent lifecycle states.
 * Used to track and query the current operational state of an agent.
 *
 * State transitions:
 * ```
 * initializing → ready → idle
 *                         ↓
 *              conversation_active ↔ thinking ↔ responding
 *                         ↓
 *                  planning_tool → awaiting_tool_result
 *                         ↓
 *              conversation_active (process tool result)
 * ```
 *
 * Tool execution flow:
 * - planning_tool: Agent is generating tool call parameters (JSON generation)
 * - awaiting_tool_result: Agent is waiting for tool execution result
 */

/**
 * Agent state types
 */
export type AgentState =
  | "initializing" // Agent is being initialized
  | "ready" // Agent is ready but not yet active
  | "idle" // Agent is idle, waiting for user input
  | "queued" // Message received, queued for processing
  | "conversation_active" // Conversation has started
  | "thinking" // Agent is processing/thinking
  | "responding" // Agent is generating response
  | "planning_tool" // Agent is planning tool use (generating tool call JSON)
  | "awaiting_tool_result"; // Agent is waiting for tool execution result
