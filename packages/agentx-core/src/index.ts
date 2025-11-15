/**
 * AgentX Core
 *
 * Provider-agnostic core implementation of the AgentX ecosystem.
 * Requires a Provider to be injected (e.g., ClaudeProvider, WebSocketProvider).
 *
 * For platform-specific SDKs, use:
 * - @deepractice-ai/agentx-node (Node.js with ClaudeProvider)
 * - @deepractice-ai/agentx-browser (Browser with WebSocketProvider)
 *
 * @packageDocumentation
 */

import type { AgentConfig, Agent as IAgent } from "@deepractice-ai/agentx-api";
import { Agent } from "./Agent";
import type { AgentProvider } from "./AgentProvider";

/**
 * Create a new Agent instance with provider injection
 *
 * This is the low-level API. Most users should use platform-specific SDKs:
 * - @deepractice-ai/agentx-node for Node.js
 * - @deepractice-ai/agentx-browser for Browser
 *
 * @param config - Agent configuration
 * @param provider - Platform-specific provider implementation
 * @returns Agent instance
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-core";
 * import { ClaudeProvider } from "@deepractice-ai/agentx-node";
 *
 * const provider = new ClaudeProvider(config);
 * const agent = createAgent(config, provider);
 *
 * agent.on("assistant_message", (event) => {
 *   console.log("Assistant:", event.message);
 * });
 *
 * await agent.send("Hello!");
 * ```
 */
export function createAgent(config: AgentConfig, provider: AgentProvider): IAgent {
  return new Agent(config, provider);
}

// Re-export types from API for convenience
export type {
  Agent as IAgent,
  AgentConfig,
  ApiConfig,
  LLMConfig,
  McpConfig,
  AgentEvent,
  EventType,
  EventPayload,
} from "@deepractice-ai/agentx-api";

// Export AgentProvider (SPI)
export type { AgentProvider } from "./AgentProvider";

// Re-export errors
export { AgentConfigError, AgentAbortError } from "@deepractice-ai/agentx-api";
