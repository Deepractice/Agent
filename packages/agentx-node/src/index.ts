/**
 * AgentX for Node.js
 *
 * Node.js SDK for AgentX - integrates with Claude Agent SDK.
 * Automatically creates ClaudeProvider for you.
 *
 * @packageDocumentation
 */

import { createAgent as createAgentCore } from "@deepractice-ai/agentx-core";
import type { AgentConfig, Agent } from "@deepractice-ai/agentx-api";
import { ClaudeProvider } from "./providers/ClaudeProvider";

/**
 * Create a new Agent instance for Node.js
 *
 * Automatically creates and injects ClaudeProvider.
 * For direct Claude SDK integration in Node.js environment.
 *
 * @param config - Agent configuration including API key and model
 * @returns Agent instance ready to use
 * @throws {AgentConfigError} If configuration is invalid
 *
 * @example
 * ```typescript
 * import { createAgent } from '@deepractice-ai/agentx-node';
 *
 * const agent = createAgent({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-sonnet-4-20250514',
 *   systemPrompt: 'You are a helpful assistant.',
 * });
 *
 * // Listen for events
 * agent.on('assistant_message', (event) => {
 *   console.log('Assistant:', event.message.content);
 * });
 *
 * agent.on('result', (event) => {
 *   if (event.subtype === 'success') {
 *     console.log('Cost:', event.totalCostUsd);
 *     console.log('Tokens:', event.usage);
 *   }
 * });
 *
 * // Send message
 * await agent.send('Hello! How are you?');
 * ```
 */
export function createAgent(config: AgentConfig): Agent {
  const provider = new ClaudeProvider(config);
  return createAgentCore(config, provider);
}

// Re-export types for convenience
export type {
  Agent,
  AgentConfig,
  ApiConfig,
  LLMConfig,
  McpConfig,
  AgentEvent,
  EventType,
  EventPayload,
  UserMessageEvent,
  AssistantMessageEvent,
  StreamDeltaEvent,
  ResultEvent,
  SystemInitEvent,
} from "@deepractice-ai/agentx-api";

// Re-export errors
export { AgentConfigError, AgentAbortError } from "@deepractice-ai/agentx-api";

// Export provider for advanced usage
export { ClaudeProvider } from "./providers/ClaudeProvider";
