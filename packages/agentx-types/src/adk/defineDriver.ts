/**
 * defineDriver - Driver definition function
 *
 * Creates a type-safe Driver class with configuration schema attached.
 * This is the recommended way to create drivers in the AgentX ecosystem.
 *
 * @example
 * ```typescript
 * import { defineConfig, defineDriver } from "@deepractice-ai/agentx-adk";
 *
 * const config = defineConfig({
 *   apiKey: { type: "string", scope: "instance", required: true },
 *   model: { type: "string", scope: "definition", default: "gpt-4" },
 * });
 *
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *   description: "Custom AI driver",
 *   config,
 *   create: (context) => ({
 *     name: "MyDriver",
 *     async *receive(message) {
 *       // Implementation
 *     },
 *     async destroy() {
 *       // Cleanup
 *     },
 *   }),
 * });
 * ```
 */

import type { AgentDriver } from "~/agent/AgentDriver";
import type { AgentContext } from "~/agent/AgentContext";
import type { DriverClass } from "~/agent/AgentDriver";
import type { ConfigDefinition } from "./defineConfig";
import type { ConfigSchema, FullConfig } from "~/config";

/**
 * Input for defining a driver
 */
export interface DefineDriverInput<S extends ConfigSchema> {
  /**
   * Driver name (for identification and logging)
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Configuration definition (from defineConfig)
   */
  config: ConfigDefinition<S>;

  /**
   * Factory function to create driver instance
   *
   * @param context - Agent context with merged configuration
   * @returns AgentDriver instance
   */
  create: (context: AgentContext<FullConfig<S>>) => AgentDriver;
}

/**
 * defineDriver - Define a driver with configuration schema
 *
 * This is the authoritative API definition.
 * The agentx-adk package must implement this function.
 *
 * @param input - Driver definition input
 * @returns Driver class with schema attached
 *
 * @example
 * ```typescript
 * const config = defineConfig({ ... });
 *
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *   config,
 *   create: (context) => new MyDriverImpl(context),
 * });
 * ```
 */
export declare function defineDriver<S extends ConfigSchema>(
  input: DefineDriverInput<S>
): DriverClass & { schema: S };
