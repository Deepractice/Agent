/**
 * defineAgent
 *
 * Framework's top-level API for composing agents.
 * Combines driver, reactors, and config into a complete agent definition.
 *
 * @example
 * ```typescript
 * import { defineAgent, defineDriver, defineReactor, defineConfig } from "@deepractice-ai/agentx-framework";
 *
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *
 *   driver: defineDriver({
 *     name: "MyDriver",
 *     generate: async function* (message) {
 *       yield "Hello: " + message;
 *     }
 *   }),
 *
 *   reactors: [
 *     defineReactor({
 *       name: "Logger",
 *       onTextDelta: (event) => console.log(event.data.text)
 *     })
 *   ],
 *
 *   config: defineConfig({
 *     sessionId: { type: "string" },
 *     logLevel: { type: "enum", values: ["debug", "info"], default: "info" }
 *   })
 * });
 *
 * const agent = MyAgent.create({
 *   sessionId: "test",
 *   logLevel: "debug"
 * });
 * ```
 */

import type { AgentDriver, EngineConfig } from "@deepractice-ai/agentx-engine";
import { AgentInstance } from "@deepractice-ai/agentx-core";
import type { AgentInfo } from "@deepractice-ai/agentx-types";
import type { DefinedDriver } from "./defineDriver";
import type { DefinedReactor } from "./defineReactor";
import type { DefinedConfig, ConfigSchema, InferConfig } from "./defineConfig";

/**
 * Agent definition
 */
export interface AgentDefinition<TConfig extends ConfigSchema = any> {
  /**
   * Agent name (for identification)
   */
  name: string;

  /**
   * Driver definition
   * Can be:
   * - DefinedDriver (from defineDriver())
   * - DefinedAgent (from defineAgent()) - enables Agent composition!
   * - AgentInstance instance - for dynamic composition
   */
  driver: DefinedDriver<any> | DefinedAgent<any> | AgentInstance | { create: (config: any) => any };

  /**
   * Reactor definitions (optional)
   * Array of reactors created by defineReactor()
   */
  reactors?: DefinedReactor<any>[];

  /**
   * Config definition (optional)
   * Created by defineConfig() or undefined for no config
   */
  config?: DefinedConfig<TConfig>;

  /**
   * Logger (optional)
   * TODO: Integrate with logger system
   */
  logger?: any;
}

/**
 * Defined agent factory
 */
export interface DefinedAgent<TConfig extends ConfigSchema = any> {
  /**
   * Agent name
   */
  name: string;

  /**
   * Create agent instance
   *
   * @param userConfig - User configuration (merged with defaults)
   * @returns AgentInstance instance
   */
  create: (userConfig?: Partial<InferConfig<TConfig>>) => AgentInstance;

  /**
   * Get agent definition
   */
  getDefinition: () => AgentDefinition<TConfig>;
}

/**
 * Define an agent
 *
 * Top-level framework API for composing agents from:
 * - Driver (how to communicate with LLM)
 * - Reactors (how to handle events)
 * - Config (schema and validation)
 *
 * @param definition - Agent definition
 * @returns Defined agent factory
 *
 * @example Simple agent
 * ```typescript
 * const EchoAgent = defineAgent({
 *   name: "Echo",
 *   driver: defineDriver({
 *     name: "Echo",
 *     generate: async function* (msg) {
 *       yield "You said: " + msg;
 *     }
 *   })
 * });
 *
 * const agent = EchoAgent.create();
 * ```
 *
 * @example Agent with reactors
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   driver: ClaudeSDKDriver,
 *   reactors: [
 *     defineReactor({
 *       name: "Logger",
 *       onTextDelta: (e) => console.log(e.data.text)
 *     })
 *   ],
 *   config: defineConfig({
 *     apiKey: { type: "string", required: true }
 *   })
 * });
 *
 * const agent = MyAgent.create({ apiKey: "xxx" });
 * ```
 *
 * @example Agent with pre-built drivers
 * ```typescript
 * import { ClaudeSDKDriver } from "@deepractice-ai/agentx-framework/drivers";
 *
 * const ClaudeAgent = defineAgent({
 *   name: "Claude",
 *   driver: ClaudeSDKDriver,
 *   config: defineConfig({
 *     apiKey: { type: "string", required: true },
 *     model: { type: "string", default: "claude-3-5-sonnet-20241022" }
 *   })
 * });
 * ```
 */
export function defineAgent<TConfig extends ConfigSchema = any>(
  definition: AgentDefinition<TConfig>
): DefinedAgent<TConfig> {
  return {
    name: definition.name,

    create: (userConfig?: Partial<InferConfig<TConfig>>) => {
      // 1. Validate and merge config
      let config: any = userConfig || {};

      if (definition.config) {
        config = definition.config.create(userConfig || {});
      }

      // 2. Create or get driver
      let driver: AgentDriver;

      // Check if driver is an AgentInstance instance (duck typing)
      if (
        typeof definition.driver === "object" &&
        "send" in definition.driver &&
        "initialize" in definition.driver
      ) {
        // Direct AgentInstance instance - it has processMessage method from driver
        driver = definition.driver as any as AgentDriver;
      } else if ("create" in definition.driver) {
        // DefinedDriver or DefinedAgent - both have create() method
        driver = definition.driver.create(config);
      } else {
        throw new Error(`[defineAgent] Invalid driver type for agent "${definition.name}"`);
      }

      // 3. Create AgentInfo data structure
      const agentInfo: AgentInfo = {
        id: definition.name,
        name: definition.name,
        createdAt: Date.now(),
      };

      // 4. Create reactors (optional)
      const reactors = definition.reactors?.map((reactor) => reactor.create(config));

      // 5. Build engine config
      const engineConfig: EngineConfig | undefined = reactors ? { reactors } : undefined;

      // 6. Create and return AgentInstance instance
      return new AgentInstance(agentInfo, driver, engineConfig);
    },

    getDefinition: () => definition,
  };
}
