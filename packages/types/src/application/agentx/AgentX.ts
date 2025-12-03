/**
 * AgentX - Platform API (extends Ecosystem)
 *
 * The central entry point for all agent operations.
 * Like Express app or Vue app, AgentX provides a unified
 * interface for managing agents, errors, and sessions.
 *
 * As an Ecosystem, AgentX provides:
 * - on(): Subscribe to all RuntimeEvents from the ecosystem
 * - emit(): Emit events (delegated to Runtime)
 * - dispose(): Clean up all resources
 *
 * Two modes:
 * - Local: Direct in-memory operations
 * - Remote: Operations via network to remote AgentX server
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 *
 * // Local mode
 * const local = createAgentX();
 * const agent = local.agents.create(definition, config);
 *
 * // Listen to ecosystem events
 * local.on((event) => {
 *   if (event.type === "agent_ready") {
 *     console.log("Agent is ready!");
 *   }
 * });
 *
 * // Remote mode
 * const remote = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: "http://..." }
 * });
 * const info = await remote.platform.getInfo();
 * ```
 */

import type { AgentManager } from "./agent";
import type { ErrorManager } from "./error";
import type { SessionManager } from "./session";
import type { PlatformManager } from "./platform";
import type { DefinitionManager } from "./definition";
import type { ImageManager } from "./image";
import type { ContainerManager } from "./container";
import type { Ecosystem } from "~/ecosystem/Ecosystem";
import type { AnyEnvironmentEvent } from "~/ecosystem/event";

/**
 * Base AgentX interface (shared by Local and Remote)
 * Extends Ecosystem to provide event subscription across the entire ecosystem.
 */
interface AgentXBase extends Ecosystem<AnyEnvironmentEvent> {
  /**
   * Container management (resource isolation units)
   *
   * In multi-tenant scenarios, each tenant maps to a container.
   * Containers provide isolated environments for running agents.
   */
  readonly containers: ContainerManager;

  /**
   * Definition registry (Docker-style: source templates)
   */
  readonly definitions: DefinitionManager;

  /**
   * Image management (Docker-style: built artifacts)
   */
  readonly images: ImageManager;

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
   * Session management
   */
  readonly sessions: SessionManager;

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
   * Session management
   */
  readonly sessions: SessionManager;

  /**
   * Platform information (remote only)
   */
  readonly platform: PlatformManager;
}

/**
 * AgentX - Union type of Local and Remote modes
 */
export type AgentX = AgentXLocal | AgentXRemote;
