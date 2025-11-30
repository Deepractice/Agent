/**
 * defineAgent implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Creates an AgentDefinition with business-level config.
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 */

import type { AgentDefinition, DefineAgentInput } from "@deepractice-ai/agentx-types";

/**
 * defineAgent - Create an agent definition
 *
 * @param input - Agent definition input
 * @returns Agent definition
 */
export function defineAgent(input: DefineAgentInput): AgentDefinition {
  const { name, description, systemPrompt } = input;

  return {
    name,
    description,
    systemPrompt,
  };
}
