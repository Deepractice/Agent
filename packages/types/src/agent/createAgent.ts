/**
 * CreateAgentOptions - Factory options for creating an AgentEngine
 */

import type { AgentDriver } from "./AgentDriver";
import type { AgentPresenter } from "./AgentPresenter";
import type { AgentEngine } from "./Agent";

/**
 * Options for creating an AgentEngine
 */
export interface CreateAgentOptions {
  /**
   * Driver - Event producer (LLM interaction)
   */
  driver: AgentDriver;

  /**
   * Presenter - Event consumer (side effects)
   */
  presenter: AgentPresenter;
}

/**
 * Factory function to create an AgentEngine
 *
 * AgentEngine is a logical processing unit that coordinates:
 * - Driver: produces stream events from LLM
 * - MealyMachine: assembles events (internal, created automatically)
 * - Presenter: consumes processed events
 *
 * @example
 * ```typescript
 * const engine = createAgent({
 *   driver: new ClaudeDriver(config),
 *   presenter: new SSEPresenter(connection),
 * });
 *
 * engine.on("text_delta", (e) => console.log(e.data.text));
 * await engine.receive("Hello!");
 * ```
 */
export declare function createAgent(options: CreateAgentOptions): AgentEngine;
