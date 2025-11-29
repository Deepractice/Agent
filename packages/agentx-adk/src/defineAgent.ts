/**
 * defineAgent implementation
 *
 * Creates an agent definition (template) that can be instantiated at runtime.
 */

import type { AgentDefinition, DriverClass, DefineAgentInput } from "@deepractice-ai/agentx-types";

/**
 * defineAgent - Create an agent definition
 *
 * @param input - Agent definition input
 * @returns Agent definition
 */
export function defineAgent<TDriver extends DriverClass>(
  input: DefineAgentInput<TDriver>
): AgentDefinition<TDriver> {
  const { name, description, driver, presenters, config } = input;

  // Return the agent definition as-is
  // The type system ensures config is correctly typed based on driver schema
  return {
    name,
    description,
    driver,
    presenters,
    config,
  } as AgentDefinition<TDriver>;
}
