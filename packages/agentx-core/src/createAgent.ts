/**
 * createAgent - Create a new Agent instance
 *
 * Main entry point for creating agents.
 */

import { Agent, type AgentDefinition, type AgentConfig } from "./agent";
import { getContext } from "./context";

/**
 * Create a new Agent instance
 *
 * @param definition - Agent definition (static config)
 * @param config - Runtime configuration (optional)
 * @returns The created Agent instance
 *
 * @example
 * ```typescript
 * const agent = createAgent(
 *   { name: "Claude", driver: claudeDriver },
 *   { model: "claude-3-5-sonnet" }
 * );
 *
 * await agent.receive("Hello!");
 * ```
 */
export function createAgent(
  definition: AgentDefinition,
  config: AgentConfig = {}
): Agent {
  const ctx = getContext();

  // Create agent instance
  const agent = new Agent(definition, config, ctx.engine);

  // Register in container
  ctx.container.register(agent);

  return agent;
}
