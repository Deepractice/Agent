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
 *                  tool_executing
 * ```
 */

/**
 * Agent state types
 */
export type AgentState =
  | "initializing" // Agent is being initialized
  | "ready" // Agent is ready but not yet active
  | "idle" // Agent is idle, waiting for user input
  | "pending" // Message sent, waiting for server response
  | "conversation_active" // Conversation has started
  | "thinking" // Agent is processing/thinking
  | "responding" // Agent is generating response
  | "tool_executing"; // Agent is executing a tool
