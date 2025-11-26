/**
 * defineAgent - Create an AgentDefinition with config schema
 *
 * This is the main entry point for defining agents in the framework.
 * Only provides essential fields - any additional config (systemPrompt,
 * version, apiKey, etc.) should be defined in configSchema.
 *
 * @example
 * ```typescript
 * const ClaudeAgent = defineAgent({
 *   name: "ClaudeAssistant",
 *   driver: claudeDriver,
 *   configSchema: {
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-sonnet-4-20250514" },
 *     systemPrompt: { type: "string" },  // Developer decides what config to have
 *   },
 * });
 * ```
 */

import type { AgentDefinition, AgentDriver, AgentPresenter } from "@deepractice-ai/agentx-core";
import type { ConfigSchema, InferConfig } from "./ConfigSchema";

/**
 * Options for defineAgent
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
 * Define an agent with config schema
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

  return Object.freeze({
    name: options.name,
    description: options.description,
    driver: options.driver,
    presenters: options.presenters,
    configSchema: options.configSchema,
  }) as DefinedAgent<TConfigSchema>;
}
