/**
 * AgentX - Platform API
 *
 * The central entry point for all agent operations.
 * Like Express app or Vue app, AgentX provides a unified
 * interface for managing agents, errors, and sessions.
 *
 * Two modes:
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
 * const remote = createAgentX({ serverUrl: "http://..." });
 * const agent = await remote.agents.get("agent_123");
 * const info = await remote.platform.getInfo();
 * ```
 */

import type { AgentManager } from "./agent";
import type { ErrorManager } from "./error";
import type { LocalSessionManager, RemoteSessionManager } from "./session";
import type { PlatformManager } from "./platform";

/**
 * Base AgentX interface (shared by Local and Remote)
 */
interface AgentXBase {
  /**
   * Agent lifecycle management
   */
  readonly agents: AgentManager;
}

/**
 * Local mode AgentX
 *
 * Direct in-memory operations, no network required.
 */
export interface AgentXLocal extends AgentXBase {
  /**
   * Mode identifier
   */
  readonly mode: "local";

  /**
   * Session management (local variant)
   */
  readonly sessions: LocalSessionManager;

  /**
   * Platform-level error management (Local only)
   *
   * Remote clients handle errors themselves due to
   * environment-specific differences (network, CORS, etc.)
   */
  readonly errors: ErrorManager;
}

/**
 * Remote mode AgentX
 *
 * Operations via network to remote AgentX server.
 */
export interface AgentXRemote extends AgentXBase {
  /**
   * Mode identifier
   */
  readonly mode: "remote";

  /**
   * Session management (remote variant)
   */
  readonly sessions: RemoteSessionManager;

  /**
   * Platform information (remote only)
   */
  readonly platform: PlatformManager;
}

/**
 * AgentX - Union type of Local and Remote modes
 */
export type AgentX = AgentXLocal | AgentXRemote;
