/**
 * AgentX Client Module
 *
 * Client SDK for connecting to AgentX servers.
 *
 * The client uses the same agentx stack as the server, which means:
 * - Full AgentEngine processing (event assembly, state tracking)
 * - Consistent API between local and remote agents
 * - Automatic assembly of Stream events into Message events
 *
 * @example
 * ```typescript
 * import { createRemoteAgent } from "@deepractice-ai/agentx/client";
 *
 * // Simple: Create and use a remote agent
 * const agent = createRemoteAgent({
 *   serverUrl: "http://localhost:5200/agentx",
 *   agentId: "agent_123",
 * });
 *
 * // Subscribe to events (receives ASSEMBLED events!)
 * agent.on((event) => {
 *   // event.type can be: assistant_message, tool_use_message, text_delta, etc.
 *   console.log(event);
 * });
 *
 * await agent.receive("Hello!");
 * ```
 *
 * @example
 * ```typescript
 * import { AgentXClient } from "@deepractice-ai/agentx/client";
 *
 * // Advanced: Use client for full platform access
 * const client = new AgentXClient({ baseUrl: "/agentx" });
 *
 * // List agents, create new ones, etc.
 * const agents = await client.listAgents();
 * const agent = await client.connect("agent_123");
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  // Connection
  ConnectionState,
  ReconnectOptions,
  // Client
  AgentXClientOptions,
  ConnectAgentOptions,
  // API
  PlatformInfo,
  HealthStatus,
  AgentInfo,
  CreateAgentOptions,
  CreatedAgent,
  ApiError,
} from "./types";

export { AgentXApiError } from "./types";

// SSE Driver (core building block)
export { SSEDriver } from "./SSEDriver";

// Remote Agent Factory
export { createRemoteAgent, type CreateRemoteAgentOptions } from "./createRemoteAgent";

// Client (for platform management)
export { AgentXClient, connectAgent } from "./AgentXClient";

// Transport (for advanced use)
export { SSEClientTransport } from "./SSEClientTransport";
