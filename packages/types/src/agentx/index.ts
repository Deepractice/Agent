/**
 * AgentX - Unified High-Level API for AI Agents
 *
 * AgentX provides a simple, consistent API for both local and remote modes.
 * It wraps Runtime and provides the same interface regardless of deployment.
 *
 * ## Two Modes
 *
 * ```
 * Local Mode                          Remote Mode
 * ─────────────────────────────────────────────────────────
 * AgentX                              AgentX
 *   │                                   │
 *   └── Runtime (embedded)              └── WebSocket ──→ Server
 *         │                                                │
 *         └── LLM, Storage                                 └── Runtime
 * ```
 *
 * ## API Design
 *
 * All operations use CommandEvent pattern:
 * - `request(type, data)` - Send request, wait for response
 * - `on(type, handler)` - Subscribe to events
 * - `onCommand(type, handler)` - Type-safe command subscription
 *
 * ## Usage
 *
 * ```typescript
 * // Local mode (default)
 * const agentx = await createAgentX();
 *
 * // Local mode with custom LLM and storage
 * const agentx = await createAgentX({
 *   llm: { apiKey: "sk-...", model: "claude-opus-4-20250514" },
 *   storage: { driver: "postgresql", url: "postgres://..." },
 * });
 *
 * // Remote mode
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 *
 * // Same API for both modes!
 * const res = await agentx.request("container_create_request", {
 *   containerId: "my-container"
 * });
 *
 * agentx.on("text_delta", (e) => console.log(e.data.text));
 *
 * await agentx.dispose();
 * ```
 *
 * @packageDocumentation
 */

import type { SystemEvent } from "~/event/base";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
} from "~/event/command";
import type { LogLevel, LoggerFactory } from "~/common/logger";

// ============================================================================
// Configuration - Local Mode
// ============================================================================

/**
 * LLM configuration
 */
export interface LLMConfig {
  /**
   * Anthropic API key (required)
   */
  apiKey: string;

  /**
   * API base URL
   * @default "https://api.anthropic.com"
   */
  baseUrl?: string;

  /**
   * Model name
   * @default "claude-sonnet-4-20250514"
   */
  model?: string;
}

/**
 * Storage driver type
 */
export type StorageDriver =
  | "memory"
  | "fs"
  | "redis"
  | "mongodb"
  | "sqlite"
  | "mysql"
  | "postgresql";

/**
 * Storage configuration
 */
export interface StorageConfig {
  /**
   * Storage driver
   * @default "memory"
   */
  driver?: StorageDriver;

  /**
   * File path (for sqlite, fs drivers)
   * @example "./data.db" for sqlite
   * @example "./data" for fs
   */
  path?: string;

  /**
   * Connection URL (for redis, mongodb, mysql, postgresql)
   * @example "redis://localhost:6379"
   * @example "mongodb://localhost:27017/agentx"
   * @example "mysql://user:pass@localhost:3306/agentx"
   * @example "postgres://user:pass@localhost:5432/agentx"
   */
  url?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Log level
   * @default LogLevel.INFO
   */
  level?: LogLevel;

  /**
   * Custom logger factory implementation
   * If provided, this factory will be used to create all logger instances.
   * If not provided, uses ConsoleLogger with console options.
   */
  factory?: LoggerFactory;

  /**
   * Console logger options (only used when factory is not provided)
   */
  console?: {
    /**
     * Enable colored output
     * @default true (Node.js), false (browser)
     */
    colors?: boolean;

    /**
     * Include timestamps in log output
     * @default true
     */
    timestamps?: boolean;
  };
}

/**
 * Local mode configuration
 *
 * Runs AgentX with local runtime, connecting directly to LLM API.
 */
export interface LocalConfig {
  /**
   * LLM configuration
   */
  llm?: LLMConfig;

  /**
   * Logger configuration
   */
  logger?: LoggerConfig;

  /**
   * Default agent definition
   *
   * When creating a new image without explicit config, these values are used.
   * The definition is copied to ImageRecord at creation time.
   */
  defaultAgent?: AgentDefinition;

  /**
   * AgentX base directory for runtime data (containers, workdirs, storage, logs)
   * @default "~/.agentx" (user's home directory)
   * @example "/var/lib/agentx"
   * @example "/Users/john/.agentx"
   *
   * Directory structure:
   * - {agentxDir}/data/agentx.db - SQLite database (auto-configured)
   * - {agentxDir}/logs/ - Log files (if configured)
   * - {agentxDir}/containers/ - Agent workdirs
   */
  agentxDir?: string;

  /**
   * HTTP server to attach WebSocket to.
   * If provided, WebSocket upgrade will be handled on the same port.
   * The server should handle authentication before upgrading.
   *
   * @example
   * ```typescript
   * import { createServer } from "http";
   * import { Hono } from "hono";
   *
   * const app = new Hono();
   * // ... add auth middleware
   *
   * const server = createServer(app.fetch);
   * const agentx = await createAgentX({ server });
   *
   * server.listen(5200);
   * ```
   */
  server?: {
    on(
      event: "upgrade",
      listener: (
        request: { url?: string; headers: { host?: string } },
        socket: unknown,
        head: unknown
      ) => void
    ): void;
  };
}

// ============================================================================
// Configuration - Remote Mode
// ============================================================================

/**
 * Remote mode configuration
 *
 * Connects to a remote AgentX server via WebSocket.
 */
export interface RemoteConfig {
  /**
   * Remote server URL (WebSocket)
   * @example "ws://localhost:5200"
   */
  serverUrl: string;
}

// ============================================================================
// Union Type
// ============================================================================

/**
 * AgentX configuration
 *
 * - LocalConfig: Run with local runtime (default)
 * - RemoteConfig: Connect to remote server
 */
export type AgentXConfig = LocalConfig | RemoteConfig;

/**
 * Type guard: is this a remote config?
 */
export function isRemoteConfig(config: AgentXConfig): config is RemoteConfig {
  return "serverUrl" in config && typeof config.serverUrl === "string";
}

/**
 * Type guard: is this a local config?
 */
export function isLocalConfig(config: AgentXConfig): config is LocalConfig {
  return !isRemoteConfig(config);
}

// ============================================================================
// Unsubscribe
// ============================================================================

/**
 * Unsubscribe function
 */
export type Unsubscribe = () => void;

// ============================================================================
// AgentX Interface
// ============================================================================

/**
 * AgentX - Main API interface
 *
 * Unified API for both local and remote modes.
 */
export interface AgentX {
  // ==================== Core API ====================

  /**
   * Send a command request and wait for response.
   *
   * @example
   * ```typescript
   * const res = await agentx.request("container_create_request", {
   *   containerId: "my-container"
   * });
   * console.log(res.data.containerId);
   * ```
   */
  request<T extends CommandRequestType>(
    type: T,
    data: RequestDataFor<T>,
    timeout?: number
  ): Promise<ResponseEventFor<T>>;

  /**
   * Subscribe to events.
   *
   * @example
   * ```typescript
   * agentx.on("text_delta", (e) => {
   *   process.stdout.write(e.data.text);
   * });
   * ```
   */
  on<T extends string>(type: T, handler: (event: SystemEvent & { type: T }) => void): Unsubscribe;

  /**
   * Subscribe to command events with full type safety.
   *
   * @example
   * ```typescript
   * agentx.onCommand("container_create_response", (e) => {
   *   console.log(e.data.containerId);
   * });
   * ```
   */
  onCommand<T extends keyof CommandEventMap>(
    type: T,
    handler: (event: CommandEventMap[T]) => void
  ): Unsubscribe;

  /**
   * Emit a command event.
   *
   * For fine-grained control. Usually prefer `request()`.
   */
  emitCommand<T extends keyof CommandEventMap>(type: T, data: CommandEventMap[T]["data"]): void;

  // ==================== Server API (local mode only) ====================

  /**
   * Start listening for remote connections.
   *
   * Only available in local mode.
   *
   * @example
   * ```typescript
   * await agentx.listen(5200);
   * console.log("Server running on ws://localhost:5200");
   * ```
   */
  listen(port: number, host?: string): Promise<void>;

  /**
   * Stop listening for remote connections.
   */
  close(): Promise<void>;

  // ==================== Lifecycle ====================

  /**
   * Dispose AgentX and release all resources.
   */
  dispose(): Promise<void>;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create AgentX instance
 *
 * @example
 * ```typescript
 * // Local mode (default)
 * const agentx = await createAgentX();
 *
 * // Local mode with config
 * const agentx = await createAgentX({
 *   llm: { apiKey: "sk-..." },
 *   storage: { driver: "sqlite", path: "./data.db" },
 * });
 *
 * // Remote mode
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 * ```
 */
export declare function createAgentX(config?: AgentXConfig): Promise<AgentX>;

// ============================================================================
// Agent Definition
// ============================================================================

import type { McpServerConfig } from "~/runtime/internal/container/sandbox/mcp";

/**
 * AgentDefinition - Static template for defining an Agent
 *
 * Used to define agent behavior and capabilities before instantiation.
 * This is the "application layer" configuration that describes what an agent does.
 *
 * @example
 * ```typescript
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   description: "A helpful AI assistant",
 *   systemPrompt: "You are a helpful assistant.",
 *   mcpServers: {
 *     filesystem: {
 *       command: "npx",
 *       args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
 *     }
 *   }
 * });
 * ```
 */
export interface AgentDefinition {
  /**
   * Agent name (required)
   */
  name: string;

  /**
   * Agent description
   */
  description?: string;

  /**
   * System prompt - controls agent behavior
   */
  systemPrompt?: string;

  /**
   * MCP servers configuration
   *
   * Key is server name, value is server configuration.
   * Supports stdio, sse, http, and sdk transport types.
   */
  mcpServers?: Record<string, McpServerConfig>;
}

/**
 * Define an Agent with type safety
 *
 * Helper function that provides type inference for AgentDefinition.
 * The returned definition can be used with AgentX to create agent instances.
 *
 * Implementation is in `agentxjs` package.
 *
 * @example
 * ```typescript
 * import { defineAgent } from "agentxjs";
 *
 * export const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   systemPrompt: "You are helpful.",
 *   mcpServers: {
 *     github: { type: "sse", url: "http://localhost:3000/sse" }
 *   }
 * });
 * ```
 */
export declare function defineAgent<T extends AgentDefinition>(definition: T): T;
