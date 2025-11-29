/**
 * defineConfig - Configuration definition function
 *
 * Creates a reusable, composable configuration definition with validation,
 * defaults, and documentation generation capabilities.
 *
 * @example
 * ```typescript
 * import { defineConfig } from "@deepractice-ai/agentx-adk";
 *
 * const claudeConfig = defineConfig({
 *   apiKey: {
 *     type: "string",
 *     scope: "instance",
 *     required: true,
 *     fromEnv: "ANTHROPIC_API_KEY",
 *     sensitive: true,
 *     description: "Anthropic API key",
 *   },
 *   model: {
 *     type: "string",
 *     scope: "definition",
 *     default: "claude-sonnet-4-20250514",
 *     description: "Model identifier",
 *   },
 * });
 *
 * // Use in defineDriver
 * const driver = defineDriver({
 *   config: claudeConfig,
 *   create: (context) => { ... }
 * });
 * ```
 */

import type { ConfigSchema } from "~/config";

/**
 * Configuration definition with metadata and utilities
 */
export interface ConfigDefinition<S extends ConfigSchema = ConfigSchema> {
  /**
   * The configuration schema
   */
  readonly schema: S;

  /**
   * Validate a configuration object against the schema
   *
   * @param config - Configuration to validate
   * @returns true if valid, false otherwise
   */
  validate(config: Record<string, unknown>): boolean;

  /**
   * Apply default values from schema to config
   *
   * @param config - Input configuration
   * @returns Configuration with defaults applied
   */
  applyDefaults<T extends Record<string, unknown>>(config: T): T;

  /**
   * Generate Markdown documentation for the configuration
   *
   * @returns Markdown string
   */
  toMarkdown(): string;

  /**
   * Convert configuration schema to JSON Schema format
   *
   * @returns JSON Schema object
   */
  toJSONSchema(): object;
}

/**
 * defineConfig - Define a configuration schema
 *
 * This is the authoritative API definition.
 * The agentx-adk package must implement this function.
 *
 * @param schema - Configuration schema definition
 * @returns Configuration definition with utilities
 *
 * @example
 * ```typescript
 * const config = defineConfig({
 *   apiKey: {
 *     type: "string",
 *     scope: "instance",
 *     required: true,
 *     description: "API key for authentication",
 *   },
 * });
 * ```
 */
export declare function defineConfig<S extends ConfigSchema>(schema: S): ConfigDefinition<S>;
