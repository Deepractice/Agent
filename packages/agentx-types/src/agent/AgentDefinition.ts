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

/**
 * AgentDefinition - Static agent definition
 */
export interface AgentDefinition<TConfig = Record<string, unknown>> {
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
   * // With configuration (closure pattern)
   * defineAgent({
   *   name: "MyAgent",
   *   driver: ClaudeDriver.withConfig({ model: "xxx" }),
   * });
   * ```
   */
  driver: DriverClass<TConfig>;

  /**
   * Output presenters (optional)
   */
  presenters?: AgentPresenter[];
}
