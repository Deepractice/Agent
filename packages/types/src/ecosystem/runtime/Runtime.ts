/**
 * Runtime - Technical Infrastructure Layer (extends Ecosystem)
 *
 * "Define Once, Run Anywhere"
 *
 * Runtime provides pure technical infrastructure via create functions:
 * - createSandbox: Creates isolated Sandbox environments
 * - createDriver: Creates RuntimeDriver instances
 * - createLogger: Creates Logger instances
 * - repository: Data persistence (optional)
 *
 * As an Ecosystem, Runtime also provides:
 * - on(): Subscribe to all RuntimeEvents from Receptors
 * - emit(): Emit events (used internally by Receptors)
 * - dispose(): Clean up all resources
 *
 * Agent lifecycle (Container) is managed at AgentX layer, not Runtime.
 * Runtime only provides create functions for technical components.
 *
 * NodeRuntime = Receptors (direct) + SSEEffector + createSandbox + createDriver + ...
 * BrowserRuntime = Receptors (via transport) + EventDriver + createSandbox (noop) + ...
 */

import type { Sandbox } from "~/ecosystem/runtime/container/sandbox";
import type { RuntimeDriver } from "~/ecosystem/runtime/container/driver/RuntimeDriver";
import type { Repository } from "./repository";
import type { Logger } from "~/application/common/logger";
import type { AgentDefinition } from "~/ecosystem/runtime/agent/AgentDefinition";
import type { AgentContext } from "~/ecosystem/runtime/agent/AgentContext";
import type { Ecosystem } from "~/ecosystem/Ecosystem";
import type { AnyEnvironmentEvent } from "../event";

/**
 * Runtime - Technical infrastructure layer (extends Ecosystem)
 *
 * Provides create functions for runtime components.
 * ContainerManager (at AgentX layer) uses these to create Agents.
 *
 * As an Ecosystem, Runtime collects events from all Receptors and
 * makes them available via on() for external observers.
 *
 * This is a pure infrastructure interface - no business concepts (tenant, etc.).
 */
export interface Runtime extends Ecosystem<AnyEnvironmentEvent> {
  /** Runtime identifier (e.g., "node", "sse") */
  readonly name: string;

  /** Repository for persistence (optional) */
  readonly repository?: Repository;

  /**
   * Create a Sandbox for resource isolation
   *
   * @param containerId - Container identifier, determines isolation boundary
   * @returns New Sandbox instance with Workspace and LLM provider
   */
  createSandbox(containerId: string): Sandbox;

  /**
   * Create a RuntimeDriver
   *
   * Merges AgentDefinition (business config) with Runtime config (infrastructure).
   *
   * @param definition - Agent definition (business config)
   * @param context - Agent context (identity)
   * @param sandbox - Sandbox for isolation
   * @returns New RuntimeDriver instance
   */
  createDriver(definition: AgentDefinition, context: AgentContext, sandbox: Sandbox): RuntimeDriver;

  /**
   * Create a Logger instance
   *
   * @param name - Logger name (typically module path like "engine/AgentEngine")
   * @returns Logger instance
   */
  createLogger(name: string): Logger;

  /**
   * Agent ID resolver for remote runtimes
   *
   * For local runtimes (Node.js): undefined, ContainerManager generates local ID.
   * For remote runtimes (SSE): provided to call server API and get server's agent ID.
   */
  readonly agentIdResolver?: AgentIdResolver;
}

/**
 * AgentIdResolver - Resolves agent ID from remote server
 *
 * Used by SSERuntime to call server API before creating local agent.
 * This ensures browser and server use the same agentId.
 */
export interface AgentIdResolver {
  /**
   * Resolve agent ID for running an image
   *
   * Calls server POST /images/:imageId/run
   *
   * @param imageId - Image to run
   * @param containerId - Container for isolation
   * @returns Agent ID from server
   */
  resolveForRun(imageId: string, containerId: string): Promise<string>;

  /**
   * Resolve agent ID for resuming a session
   *
   * Calls server POST /sessions/:sessionId/resume
   *
   * @param sessionId - Session to resume
   * @param containerId - Container for isolation
   * @returns Agent ID from server
   */
  resolveForResume(sessionId: string, containerId: string): Promise<string>;
}
