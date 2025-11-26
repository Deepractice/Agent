/**
 * getAgent - Get an existing Agent instance
 *
 * Retrieves an agent from the container.
 */

import type { Agent } from "./agent";
import { getContext } from "./context";

/**
 * Get an Agent by ID
 *
 * @param agentId - The agent ID
 * @returns The Agent instance or undefined if not found
 *
 * @example
 * ```typescript
 * const agent = getAgent("agent_123");
 * if (agent) {
 *   await agent.receive("Hello!");
 * }
 * ```
 */
export function getAgent(agentId: string): Agent | undefined {
  const ctx = getContext();
  return ctx.container.get(agentId);
}

/**
 * Check if an agent exists
 */
export function hasAgent(agentId: string): boolean {
  const ctx = getContext();
  return ctx.container.has(agentId);
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds(): string[] {
  const ctx = getContext();
  return ctx.container.getAllIds();
}

/**
 * Get agent count
 */
export function getAgentCount(): number {
  const ctx = getContext();
  return ctx.container.count();
}
