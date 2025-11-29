/**
 * createRemoteAgent - Factory function for creating browser-side agents
 *
 * Creates a full Agent instance that connects to a remote AgentX server.
 * Uses SSEDriver internally, which means you get:
 * - Full AgentEngine event processing
 * - Automatic event assembly (Stream → Message events)
 * - Consistent API with local agents
 *
 * @example
 * ```typescript
 * import { createRemoteAgent } from "@deepractice-ai/agentx/client";
 *
 * const agent = createRemoteAgent({
 *   serverUrl: "http://localhost:5200/agentx",
 *   agentId: "agent_123",
 * });
 *
 * // Subscribe to events
 * agent.on((event) => {
 *   if (event.type === "assistant_message") {
 *     console.log("Assistant:", event.data.content);
 *   }
 *   if (event.type === "text_delta") {
 *     process.stdout.write(event.data.text);
 *   }
 * });
 *
 * await agent.receive("Hello!");
 * await agent.destroy();
 * ```
 */

import type { Agent } from "@deepractice-ai/agentx-types";
import { defineAgent } from "@deepractice-ai/agentx-adk";
import { createAgentX } from "../AgentX";
import { SSEDriver } from "./SSEDriver";

/**
 * Options for creating a remote agent
 */
export interface CreateRemoteAgentOptions {
  /**
   * Server base URL (e.g., "http://localhost:5200/agentx")
   */
  serverUrl: string;

  /**
   * Agent ID on the server
   */
  agentId: string;

  /**
   * Optional request headers (for auth, etc.)
   */
  headers?: Record<string, string>;
}

/**
 * Pre-defined agent definition for remote connections
 */
const RemoteAgentDefinition = defineAgent({
  name: "RemoteAgent",
  description: "Browser-side agent that connects to remote AgentX server via SSE",
  driver: SSEDriver,
});

/**
 * Create a remote agent that connects to an AgentX server
 *
 * This function creates a proper Agent instance with full AgentEngine support.
 * Events received from the server are automatically assembled into higher-level
 * events (assistant_message, tool_use_message, etc.).
 *
 * @param options - Connection options
 * @returns Agent instance
 *
 * @example
 * ```typescript
 * const agent = createRemoteAgent({
 *   serverUrl: "http://localhost:5200/agentx",
 *   agentId: "agent_123",
 * });
 *
 * agent.on("assistant_message", (event) => {
 *   console.log(event.data.content);
 * });
 *
 * await agent.receive("Hello!");
 * ```
 */
export function createRemoteAgent(options: CreateRemoteAgentOptions): Agent {
  const { serverUrl, agentId, headers } = options;

  // Create a dedicated AgentX instance for this remote agent
  // This ensures clean separation from any global agentx instance
  const agentx = createAgentX();

  // Create agent with SSEDriver config
  // Type assertion needed because AgentManager.create has generic constraints
  const agent = (agentx.agents as any).create(RemoteAgentDefinition, {
    serverUrl: serverUrl.replace(/\/+$/, ""), // Remove trailing slash
    agentId,
    headers,
  }) as Agent;

  return agent;
}
