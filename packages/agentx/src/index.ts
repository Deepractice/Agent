/**
 * agentxjs - Unified API for AI Agents
 *
 * @example
 * ```typescript
 * import { createAgentX, defineAgent } from "agentxjs";
 *
 * const config = defineAgent({ name: "Assistant", systemPrompt: "You are helpful" });
 * const agentx = await createAgentX();
 * const container = await agentx.containers.create();
 * const agent = await agentx.agents.run(container.id, config);
 * ```
 *
 * @packageDocumentation
 */

export { createAgentX } from "./createAgentX";
export { defineAgent } from "./defineAgent";

// Re-export types
export type {
  AgentX,
  SourceConfig,
  AgentDefinition,
  AgentConfig,
  Agent,
  AgentImage,
  Container,
  ContainersAPI,
  AgentsAPI,
  ImagesAPI,
  Unsubscribe,
} from "@agentxjs/types/agentx";
