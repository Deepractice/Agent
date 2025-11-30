/**
 * Runtime - Complete environment encapsulation
 *
 * "Define Once, Run Anywhere"
 *
 * Runtime provides infrastructure:
 * - Container: Agent lifecycle management
 * - Sandbox: Resource isolation (OS + LLM)
 * - Driver: AI model communication
 * - Config: Collected from environment (env vars, config files)
 *
 * Agent is pure business (AgentDefinition), Runtime is infrastructure.
 *
 * NodeRuntime = MemoryContainer + LocalSandbox + ClaudeDriver + env config
 * BrowserRuntime = MemoryContainer + NoopSandbox + SSEDriver + server config
 */

import type { Container } from "./container";
import type { Sandbox } from "./sandbox";
import type { RuntimeDriver } from "./RuntimeDriver";
import type { AgentContext } from "~/agent/AgentContext";
import type { AgentDefinition } from "~/agent/AgentDefinition";

/**
 * Runtime - Complete environment encapsulation
 *
 * Provides all infrastructure for running Agents:
 * - container: Where agents live
 * - createSandbox: Resource isolation
 * - createDriver: Event source creation (merges AgentDefinition with RuntimeConfig)
 *
 * RuntimeConfig is collected internally from environment.
 */
export interface Runtime {
  /** Runtime identifier (e.g., "node", "browser") */
  readonly name: string;

  /** Container for managing Agent lifecycle */
  readonly container: Container;

  /** Create a Sandbox for resource isolation */
  createSandbox(name: string): Sandbox;

  /**
   * Create a RuntimeDriver
   *
   * Runtime merges:
   * - AgentDefinition (business config from user)
   * - RuntimeConfig (infrastructure config from environment)
   *
   * @param definition - Agent definition (business config)
   * @param context - Agent context (identity)
   * @param sandbox - Sandbox for isolation
   */
  createDriver(definition: AgentDefinition, context: AgentContext, sandbox: Sandbox): RuntimeDriver;
}
