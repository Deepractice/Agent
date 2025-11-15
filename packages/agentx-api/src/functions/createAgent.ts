/**
 * Create Agent
 *
 * Factory function to create Agent instances.
 */

import type { Agent } from "~/interfaces";
import type { AgentConfig } from "~/config";

/**
 * Create an Agent instance
 *
 * @param config - Agent configuration
 * @returns Agent instance
 *
 * @example
 * ```typescript
 * import { createAgent } from '@deepractice-ai/agentx-api';
 *
 * const agent = createAgent({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: 'claude-3-5-sonnet-20241022',
 *   systemPrompt: 'You are a helpful assistant'
 * });
 *
 * agent.on('assistant', (event) => {
 *   console.log(event.message.content);
 * });
 *
 * await agent.send("Hello!");
 * ```
 */
export function createAgent(_config: AgentConfig): Agent {
  throw new Error("Not implemented - use @deepractice-ai/agentx-core");
}
