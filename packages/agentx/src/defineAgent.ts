/**
 * defineAgent - Create an AgentDefinition with config schema
 *
 * Convenience function that delegates to agentx.agents.define()
 * with additional ConfigSchema support for compile-time type inference.
 *
 * @example
 * ```typescript
 * const ClaudeAgent = defineAgent({
 *   name: "ClaudeAssistant",
 *   driver: claudeDriver,
 *   configSchema: {
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-sonnet-4-20250514" },
 *     systemPrompt: { type: "string" },
 *   },
 * });
 *
 * // Or use agentx.agents.define() directly (simpler, no ConfigSchema):
 * const MyAgent = agentx.agents.define({
 *   name: "MyAssistant",
 *   driver: myDriver,
 * });
 * ```
 */

import type { AgentDefinition, AgentDriver, AgentPresenter } from "@deepractice-ai/agentx-types";
import type { ConfigSchema, InferConfig } from "./ConfigSchema";

/**
 * Options for defineAgent (with ConfigSchema support)
 */
export interface DefineAgentOptions<TConfigSchema extends ConfigSchema> {
  /**
   * Agent name (identifier)
   */
  name: string;

  /**
   * Description (optional)
   */
  description?: string;

  /**
   * Stateless driver for message processing
   */
  driver: AgentDriver<InferConfig<TConfigSchema>>;

  /**
   * Output presenters (optional)
   */
  presenters?: AgentPresenter[];

  /**
   * Config schema - developer defines what config this agent needs
   */
  configSchema?: TConfigSchema;
}

/**
 * Defined agent with config schema attached
 */
export interface DefinedAgent<TConfigSchema extends ConfigSchema = ConfigSchema>
  extends AgentDefinition<InferConfig<TConfigSchema>> {
  /**
   * Config schema for this agent
   */
  readonly configSchema?: TConfigSchema;
}

/**
 * Define an agent with config schema (convenience function)
 *
 * This is a convenience function that adds ConfigSchema support
 * on top of agentx.agents.define().
 *
 * @param options - Agent definition options
 * @returns Frozen AgentDefinition with config schema
 */
export function defineAgent<TConfigSchema extends ConfigSchema = ConfigSchema>(
  options: DefineAgentOptions<TConfigSchema>
): DefinedAgent<TConfigSchema> {
  if (!options.name) {
    throw new Error("[defineAgent] name is required");
  }
  if (!options.driver) {
    throw new Error("[defineAgent] driver is required");
  }

  // Create frozen definition with configSchema
  return Object.freeze({
    name: options.name,
    description: options.description,
    driver: options.driver,
    presenters: options.presenters,
    configSchema: options.configSchema,
  }) as DefinedAgent<TConfigSchema>;
}
