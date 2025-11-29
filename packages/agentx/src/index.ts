/**
 * @deepractice-ai/agentx
 *
 * Define, Run, Scale AI Agents - The Open Source Agent Platform
 *
 * @example
 * ```typescript
 * import { agentx, createAgentX } from "@deepractice-ai/agentx";
 *
 * // Define an agent
 * const MyAgent = agentx.agents.define({
 *   name: "MyAssistant",
 *   driver: myDriver,
 * });
 *
 * // Create agent instance
 * const agent = agentx.agents.create(MyAgent, { apiKey: "xxx" });
 *
 * // Or create custom instance
 * const local = createAgentX();  // Local mode
 * const remote = createAgentX({ mode: 'remote', remote: { serverUrl: "http://..." } });  // Remote mode
 * ```
 *
 * @packageDocumentation
 */

import type { AgentXLocal, Agent, AgentDefinition } from "@deepractice-ai/agentx-types";
import { createAgentX } from "./AgentX";

// ===== Default AgentX Instance (Local) =====

/**
 * Default AgentX instance (local singleton)
 *
 * Use this for simple scenarios. For advanced use cases
 * (remote mode, multiple instances), use createAgentX().
 *
 * @example
 * ```typescript
 * import { agentx } from "@deepractice-ai/agentx";
 *
 * const agent = agentx.agents.create(MyAgent, config);
 * agentx.agents.get(agentId);
 * await agentx.agents.destroy(agentId);
 *
 * agentx.errors.addHandler({ handle: (id, err) => ... });
 * ```
 */
export const agentx: AgentXLocal = createAgentX() as AgentXLocal;

// ===== Convenience Functions =====
// These use the default agentx instance

/**
 * Create a new agent (using default agentx instance)
 *
 * @example
 * ```typescript
 * const agent = createAgent(MyAgent, { apiKey: "xxx" });
 * ```
 */
export function createAgent<TDriver extends import("@deepractice-ai/agentx-types").DriverClass>(
  definition: AgentDefinition<TDriver>,
  config: Record<string, unknown>
): Agent {
  return agentx.agents.create(definition, config);
}

/**
 * Get an existing agent by ID (using default agentx instance)
 */
export function getAgent(agentId: string): Agent | undefined {
  return agentx.agents.get(agentId);
}

/**
 * Check if an agent exists (using default agentx instance)
 */
export function hasAgent(agentId: string): boolean {
  return agentx.agents.has(agentId);
}

/**
 * Destroy an agent by ID (using default agentx instance)
 */
export function destroyAgent(agentId: string): Promise<void> {
  return agentx.agents.destroy(agentId);
}

/**
 * Destroy all agents (using default agentx instance)
 */
export function destroyAll(): Promise<void> {
  return agentx.agents.destroyAll();
}

// ===== Advanced: Custom AgentX Instance =====

export { createAgentX } from "./AgentX";

// ===== Re-export Types from @deepractice-ai/agentx-types =====

export type {
  // AgentX platform
  AgentX,
  AgentXLocal,
  AgentXRemote,
  AgentXOptions,
  AgentXLocalOptions,
  AgentXRemoteOptions,
  // Agent module
  AgentManager,
  // Error module
  ErrorManager,
  ErrorHandler,
  // Session module
  SessionManager,
  LocalSessionManager,
  RemoteSessionManager,
  Session,
  // Platform module
  PlatformManager,
  // HTTP Endpoints
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
  // Agent contracts
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  AgentContextBase,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  // Error types
  AgentError,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";
