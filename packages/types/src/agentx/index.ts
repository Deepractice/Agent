/**
 * AgentX - User-facing API Types
 *
 * ## Design Decision
 *
 * AgentX provides a unified API for both server (Source) and browser (Mirror) usage.
 * The configuration type determines which mode is used:
 *
 * - SourceConfig: Server-side, direct LLM access, data persistence
 * - MirrorConfig: Browser-side, connects to remote Source via WebSocket
 *
 * ## Usage Examples
 *
 * ```typescript
 * import { createAgentX } from "agentxjs";
 *
 * // Server - minimal (reads ANTHROPIC_API_KEY from env)
 * const agentx = createAgentX();
 *
 * // Server - with config
 * const agentx = createAgentX({
 *   apiKey: "sk-ant-...",
 *   model: "claude-sonnet-4-20250514",
 *   persistence: createPersistence({ driver: "sqlite", path: "./data.db" }),
 * });
 *
 * // Browser - connect to remote
 * const agentx = createAgentX({
 *   serverUrl: "ws://localhost:5200",
 *   token: "optional-auth-token",
 * });
 * ```
 *
 * ## API Structure
 *
 * ```typescript
 * agentx.run(config)              // Quick start - run agent in default container
 * agentx.containers.create(id)    // Create container
 * agentx.containers.get(id)       // Get container
 * agentx.agents.run(containerId, config)  // Run agent in container
 * agentx.agents.get(agentId)      // Get agent
 * agentx.images.snapshot(agent)   // Save agent state
 * agentx.images.list()            // List all images
 * agentx.dispose()                // Cleanup
 * ```
 *
 * @packageDocumentation
 */

import type { Persistence } from "~/persistence";
import type { Agent, Container, AgentImage } from "~/runtime";

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SourceConfig - Server-side configuration
 *
 * Creates a local AgentX instance with direct LLM access.
 */
export interface SourceConfig {
  /**
   * Anthropic API key
   * @default process.env.ANTHROPIC_API_KEY
   */
  apiKey?: string;

  /**
   * Claude model to use
   * @default "claude-sonnet-4-20250514"
   */
  model?: string;

  /**
   * Anthropic API base URL (for proxies)
   * @default "https://api.anthropic.com"
   */
  baseUrl?: string;

  /**
   * Persistence layer for storing data
   * @default In-memory persistence
   */
  persistence?: Persistence;
}

/**
 * MirrorConfig - Browser-side configuration
 *
 * Connects to a remote AgentX Source via WebSocket.
 * The `serverUrl` field distinguishes this from SourceConfig.
 */
export interface MirrorConfig {
  /**
   * WebSocket URL of the AgentX server
   * @example "ws://localhost:5200"
   */
  serverUrl: string;

  /**
   * Authentication token (optional)
   */
  token?: string;

  /**
   * Additional headers for WebSocket connection
   */
  headers?: Record<string, string>;
}

/**
 * AgentXConfig - Union of Source and Mirror configurations
 *
 * Type discrimination: presence of `serverUrl` determines Mirror mode.
 */
export type AgentXConfig = SourceConfig | MirrorConfig;

/**
 * Type guard: is this a MirrorConfig?
 */
export function isMirrorConfig(config: AgentXConfig): config is MirrorConfig {
  return "serverUrl" in config && typeof config.serverUrl === "string";
}

/**
 * Type guard: is this a SourceConfig?
 */
export function isSourceConfig(config: AgentXConfig): config is SourceConfig {
  return !isMirrorConfig(config);
}

// ============================================================================
// Agent Run Configuration
// ============================================================================

/**
 * AgentRunConfig - Configuration for running an agent
 */
export interface AgentRunConfig {
  /**
   * Agent name (for identification)
   */
  name: string;

  /**
   * System prompt for the agent
   */
  systemPrompt?: string;
}

// ============================================================================
// AgentX API Interface
// ============================================================================

/**
 * ContainersAPI - Container management
 */
export interface ContainersAPI {
  /**
   * Create a new container
   */
  create(containerId: string): Promise<Container>;

  /**
   * Get container by ID
   */
  get(containerId: string): Container | undefined;

  /**
   * List all containers
   */
  list(): Container[];
}

/**
 * AgentsAPI - Agent management (cross-container)
 */
export interface AgentsAPI {
  /**
   * Run an agent in a container
   */
  run(containerId: string, config: AgentRunConfig): Promise<Agent>;

  /**
   * Get agent by ID (searches all containers)
   */
  get(agentId: string): Agent | undefined;

  /**
   * List agents in a container
   */
  list(containerId: string): Agent[];

  /**
   * Destroy an agent
   */
  destroy(agentId: string): Promise<boolean>;

  /**
   * Destroy all agents in a container
   */
  destroyAll(containerId: string): Promise<void>;
}

/**
 * ImagesAPI - Image (snapshot) management
 */
export interface ImagesAPI {
  /**
   * Snapshot an agent's current state
   */
  snapshot(agent: Agent): Promise<AgentImage>;

  /**
   * List all images
   */
  list(): Promise<AgentImage[]>;

  /**
   * Get image by ID
   */
  get(imageId: string): Promise<AgentImage | null>;

  /**
   * Delete an image
   */
  delete(imageId: string): Promise<void>;
}

/**
 * AgentX - Main user-facing API
 *
 * Provides unified interface for both Source (server) and Mirror (browser) modes.
 */
export interface AgentX {
  /**
   * Quick start - run an agent in the default container
   *
   * @example
   * ```typescript
   * const agent = await agentx.run({ name: "Assistant" });
   * agent.on("text_delta", (e) => console.log(e.data.text));
   * await agent.receive("Hello!");
   * ```
   */
  run(config: AgentRunConfig): Promise<Agent>;

  /**
   * Container management API
   */
  readonly containers: ContainersAPI;

  /**
   * Agent management API (cross-container operations)
   */
  readonly agents: AgentsAPI;

  /**
   * Image (snapshot) management API
   */
  readonly images: ImagesAPI;

  /**
   * Dispose and cleanup all resources
   */
  dispose(): Promise<void>;
}

// ============================================================================
// Factory Function Types
// ============================================================================

/**
 * CreateAgentX - Factory function type
 *
 * Creates AgentX instance based on configuration:
 * - No config or SourceConfig → Local Source mode
 * - MirrorConfig (has serverUrl) → Remote Mirror mode
 */
export type CreateAgentX = {
  /**
   * Create with default config (server-side, reads env)
   */
  (): AgentX;

  /**
   * Create with explicit config
   */
  (config: AgentXConfig): AgentX;
};
