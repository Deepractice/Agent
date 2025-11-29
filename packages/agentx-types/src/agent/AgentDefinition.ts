/**
 * AgentDefinition - Static definition of an Agent
 *
 * Like Spring's BeanDefinition, this defines WHAT an agent is.
 * Only contains the essentials:
 * - Identity (name, description)
 * - Driver class (instantiated per agent)
 * - Presenters (output adapters)
 *
 * Any other fields (systemPrompt, version, etc.) should be
 * defined by developers in their configSchema.
 */

import type { DriverClass } from "./AgentDriver";
import type { AgentPresenter } from "./AgentPresenter";
import type { ConfigSchema, DefinitionConfig } from "~/config";

/**
 * AgentDefinition - Static agent definition
 *
 * Defines the template for creating agent instances.
 * Configuration is split into two scopes:
 * - Definition-scope: Set here in the template (shared by all instances)
 * - Instance-scope: Set when creating each instance (per-instance)
 */
export interface AgentDefinition<TDriver extends DriverClass = DriverClass> {
  /**
   * Agent name (identifier)
   */
  name: string;

  /**
   * Description (optional)
   */
  description?: string;

  /**
   * Driver class for message processing
   *
   * Pass the class itself, not an instance.
   * AgentInstance will instantiate the driver with AgentContext.
   *
   * @example
   * ```typescript
   * // Basic usage
   * defineAgent({
   *   name: "MyAgent",
   *   driver: ClaudeDriver,
   * });
   *
   * // With schema - type-safe config
   * defineAgent({
   *   name: "MyAgent",
   *   driver: ClaudeDriver,  // has static schema
   *   config: {
   *     systemPrompt: "...",  // ✅ definition scope
   *     model: "sonnet",      // ✅ definition scope
   *     apiKey: "xxx",        // ❌ type error! instance scope
   *   },
   * });
   * ```
   */
  driver: TDriver;

  /**
   * Output presenters (optional)
   */
  presenters?: AgentPresenter[];

  /**
   * Definition-level configuration
   *
   * Fields set here are shared by all instances created from this definition.
   * Type is automatically inferred from the driver's schema (if available).
   * Only fields with scope: "definition" can be set here.
   *
   * @example
   * ```typescript
   * const ClaudeAgent = defineAgent({
   *   driver: ClaudeSDKDriver,
   *   config: {
   *     // Type-safe: only definition-scope fields allowed
   *     systemPrompt: "You are a code reviewer",
   *     model: "claude-sonnet-4-5",
   *     allowedTools: ["Read", "Grep"],
   *   },
   * });
   * ```
   */
  config?: TDriver extends { schema: infer S extends ConfigSchema }
    ? DefinitionConfig<S>
    : Record<string, unknown>;
}
