/**
 * destroyAgent - Destroy an Agent instance
 *
 * Removes agent from container and cleans up resources.
 */

import { getContext } from "./context";

/**
 * Destroy an Agent by ID
 *
 * @param agentId - The agent ID to destroy
 * @returns true if agent was destroyed, false if not found
 *
 * @example
 * ```typescript
 * await destroyAgent("agent_123");
 * ```
 */
export async function destroyAgent(agentId: string): Promise<boolean> {
  const ctx = getContext();

  const agent = ctx.container.get(agentId);
  if (!agent) {
    return false;
  }

  // Destroy the agent (clean up resources)
  await agent.destroy();

  // Remove from container
  return ctx.container.unregister(agentId);
}

/**
 * Destroy all agents
 *
 * @returns Number of agents destroyed
 */
export async function destroyAllAgents(): Promise<number> {
  const ctx = getContext();

  const ids = ctx.container.getAllIds();
  let count = 0;

  for (const id of ids) {
    if (await destroyAgent(id)) {
      count++;
    }
  }

  return count;
}
