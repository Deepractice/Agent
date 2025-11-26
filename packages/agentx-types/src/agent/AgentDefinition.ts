/**
 * AgentDefinition - Static definition of an Agent
 *
 * Like Spring's BeanDefinition, this defines WHAT an agent is.
 * Only contains the essentials:
 * - Identity (name, description)
 * - Driver (stateless, receives context)
 * - Presenters (output adapters)
 *
 * Any other fields (systemPrompt, version, etc.) should be
 * defined by developers in their configSchema.
 */

import type { AgentDriver } from "./AgentDriver";
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
   * Stateless driver for message processing
   * Receives AgentContext with config on each call
   */
  driver: AgentDriver<TConfig>;

  /**
   * Output presenters (optional)
   */
  presenters?: AgentPresenter[];
}
