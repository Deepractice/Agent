/**
 * AgentX - Platform API Implementation
 *
 * The central entry point for all agent operations.
 * Supports two modes:
 * - Local: Direct in-memory operations
 * - Remote: Operations via network to remote AgentX server
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 *
 * // Local mode
 * const local = createAgentX();
 * const agent = local.agents.create(definition, config);
 *
 * // Remote mode
 * const remote = createAgentX({ serverUrl: "http://localhost:5200/agentx" });
 * const agent = await remote.agents.get("agent_123");
 * ```
 */

import type {
  AgentX,
  AgentXLocal,
  AgentXRemote,
  AgentXOptions,
  AgentXLocalOptions,
  AgentXRemoteOptions,
} from "@deepractice-ai/agentx-types";
import { MemoryAgentContainer } from "@deepractice-ai/agentx-core";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { LocalAgentManager, LocalSessionManager, ErrorManager } from "./managers";

/**
 * Create a Local AgentX instance
 */
function createLocalAgentX(options: AgentXLocalOptions = {}): AgentXLocal {
  // Create shared infrastructure
  const container = new MemoryAgentContainer();
  const engine = new AgentEngine();

  // Create managers
  const errorManager = new ErrorManager();
  const sessionManager = new LocalSessionManager();
  const agentManager = new LocalAgentManager(container, engine, errorManager);

  // Register default error handler if provided
  if (options.onError) {
    errorManager.addHandler({
      handle: (agentId, error) => options.onError!(agentId, error),
    });
  }

  return {
    mode: "local",
    agents: agentManager,
    sessions: sessionManager,
    errors: errorManager,
  };
}

/**
 * Create a Remote AgentX instance
 *
 * TODO: Implement remote mode
 */
function createRemoteAgentX(_options: AgentXRemoteOptions): AgentXRemote {
  // TODO: Implement remote managers
  throw new Error("Remote mode not yet implemented");
}

/**
 * Create a new AgentX instance
 *
 * @overload Create Local AgentX (no options or options without serverUrl)
 * @overload Create Remote AgentX (options with serverUrl)
 *
 * @example
 * ```typescript
 * // Local mode
 * const local = createAgentX();
 *
 * // Local mode with error handler
 * const local = createAgentX({
 *   onError: (agentId, error) => Sentry.captureException(error)
 * });
 *
 * // Remote mode
 * const remote = createAgentX({
 *   serverUrl: "http://localhost:5200/agentx"
 * });
 * ```
 */
export function createAgentX(): AgentXLocal;
export function createAgentX(options: AgentXLocalOptions): AgentXLocal;
export function createAgentX(options: AgentXRemoteOptions): AgentXRemote;
export function createAgentX(options?: AgentXOptions): AgentX;
export function createAgentX(options?: AgentXOptions): AgentX {
  if (options && "serverUrl" in options && options.serverUrl) {
    return createRemoteAgentX({
      serverUrl: options.serverUrl,
      headers: options.headers,
    });
  }
  return createLocalAgentX({
    onError: options?.onError,
  });
}
