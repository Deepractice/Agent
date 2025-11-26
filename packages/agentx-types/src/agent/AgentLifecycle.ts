/**
 * AgentLifecycle - Agent lifecycle states
 */

/**
 * Agent lifecycle states
 *
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 */
export type AgentLifecycle = "running" | "destroyed";
