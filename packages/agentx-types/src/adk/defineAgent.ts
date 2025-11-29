/**
 * defineAgent - Agent definition function
 *
 * Creates an agent definition (template) that can be instantiated at runtime.
 * Combines driver, presenters, and definition-level configuration.
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-adk";
 * import { ClaudeSDKDriver } from "@deepractice-ai/agentx-claude";
 *
 * const TranslatorAgent = defineAgent({
 *   name: "TranslatorAgent",
 *   description: "AI translator agent",
 *   driver: ClaudeSDKDriver,
 *   presenters: [LogPresenter],
 *   config: {
 *     model: "claude-sonnet-4-20250514",
 *     systemPrompt: "You are a professional translator",
 *   },
 * });
 *
 * // Use at runtime
 * const agentx = createAgentX();
 * const agent = agentx.agents.create(TranslatorAgent, {
 *   apiKey: "sk-ant-xxxxx",
 * });
 * ```
 */

import type { AgentDefinition } from "~/agent/AgentDefinition";
import type { DriverClass } from "~/agent/AgentDriver";
import type { AgentPresenter } from "~/agent/AgentPresenter";
import type { ConfigSchema, DefinitionConfig } from "~/config";

/**
 * Input for defining an agent
 */
export interface DefineAgentInput<TDriver extends DriverClass = DriverClass> {
  /**
   * Agent name
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Driver class (from defineDriver)
   */
  driver: TDriver;

  /**
   * Optional presenters for output handling
   */
  presenters?: AgentPresenter[];

  /**
   * Definition-level configuration
   *
   * Type is automatically inferred from driver's schema.
   */
  config?: TDriver extends { schema: infer S extends ConfigSchema }
    ? DefinitionConfig<S>
    : Record<string, unknown>;
}

/**
 * defineAgent - Define an agent template
 *
 * This is the authoritative API definition.
 * The agentx-adk package must implement this function.
 *
 * @param input - Agent definition input
 * @returns Agent definition
 *
 * @example
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   driver: MyDriver,
 *   config: {
 *     model: "gpt-4", // Type-safe based on driver schema
 *   },
 * });
 * ```
 */
export declare function defineAgent<TDriver extends DriverClass>(
  input: DefineAgentInput<TDriver>
): AgentDefinition<TDriver>;
