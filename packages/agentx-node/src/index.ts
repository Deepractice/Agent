/**
 * AgentX Node Runtime
 *
 * "Define Once, Run Anywhere"
 *
 * Node.js Runtime for AgentX with Claude driver.
 * RuntimeConfig collected from environment variables via EnvLLMProvider.
 *
 * Required env vars:
 * - LLM_PROVIDER_KEY (required) - API key for LLM provider
 * - LLM_PROVIDER_URL (optional) - Base URL for API endpoint
 * - LLM_PROVIDER_MODEL (optional, defaults to claude-sonnet-4-20250514)
 *
 * @example
 * ```typescript
 * import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
 * import { runtime } from "@deepractice-ai/agentx-node";
 *
 * const MyAgent = defineAgent({
 *   name: "Translator",
 *   systemPrompt: "You are a translator",
 * });
 *
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 *
 * @packageDocumentation
 */

// ==================== Runtime ====================
export { runtime, NodeRuntime } from "./NodeRuntime";

// ==================== LLM Provider ====================
export { EnvLLMProvider, type LLMSupply } from "./llm";

// ==================== Driver (for advanced use) ====================
export { createClaudeDriver } from "./ClaudeDriver";
export type { ClaudeDriverConfig } from "./ClaudeDriver";

// ==================== Repository ====================
export { SQLiteRepository } from "./repository";

// ==================== Logger ====================
export { FileLogger, type FileLoggerOptions } from "./logger";
export { FileLoggerFactory, type FileLoggerFactoryOptions } from "./logger";
