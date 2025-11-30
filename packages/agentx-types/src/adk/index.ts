/**
 * ADK (Agent Development Kit) Module
 *
 * Type definitions for agent/driver development tools.
 * Implementations are provided by @deepractice-ai/agentx-adk package.
 *
 * ## Design Decision: Three-Layer Pattern
 *
 * ADK uses a layered approach for type-safe agent/driver creation:
 *
 * ```text
 * defineConfig()     → ConfigSchema (reusable config definition)
 *      ↓
 * defineDriver()     → DriverDefinition (uses ConfigSchema)
 *      ↓
 * defineAgent()      → AgentDefinition (uses DriverDefinition)
 * ```
 *
 * Why three layers?
 * 1. **Config reuse**: Same config schema for multiple drivers
 * 2. **Type inference**: Config types flow from defineConfig to defineAgent
 * 3. **Separation of concerns**: Each layer handles one responsibility
 *
 * ## Design Decision: Types-Only Package
 *
 * This package only contains TYPE DECLARATIONS for ADK functions.
 * Actual implementations are in @deepractice-ai/agentx-adk.
 *
 * Why separate types from implementation?
 * 1. **Circular dependency prevention**: types → adk → core → types would cycle
 * 2. **Contract stability**: Type declarations rarely change
 * 3. **Import flexibility**: Import types without pulling runtime code
 *
 * ## Usage Pattern
 *
 * ```typescript
 * // In driver package
 * import { defineConfig, defineDriver } from "@deepractice-ai/agentx-adk";
 *
 * const claudeConfig = defineConfig({
 *   apiKey: { type: "string", required: true, scope: "instance" },
 *   model: { type: "string", default: "claude-3-5-sonnet", scope: "definition" },
 * });
 *
 * export const ClaudeDriver = defineDriver({
 *   name: "ClaudeDriver",
 *   config: claudeConfig,
 *   create: (context) => ({ ... }),
 * });
 *
 * // In application
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 * });
 * ```
 *
 * @module adk
 */

// defineConfig
export type { ConfigDefinition } from "./defineConfig";
export { defineConfig } from "./defineConfig";

// defineDriver
export type { DefineDriverInput } from "./defineDriver";
export { defineDriver } from "./defineDriver";

// defineAgent
export type { DefineAgentInput } from "./defineAgent";
export { defineAgent } from "./defineAgent";
