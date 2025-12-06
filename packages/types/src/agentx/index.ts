/**
 * AgentX - Unified API for AI Agents
 *
 * Simple, consistent API for both local and remote modes.
 *
 * @example
 * ```typescript
 * // Local mode (default)
 * const agentx = await createAgentX();
 *
 * // Local mode with server
 * const agentx = await createAgentX({ apiKey: "sk-..." });
 * await agentx.listen(5200);
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

import type { Persistence } from "~/persistence";
import type { SystemEvent } from "~/event/base";
import type {
  CommandEventMap,
  CommandRequestType,
  ResponseEventFor,
  RequestDataFor,
} from "~/event/command";

// ============================================================================
// Configuration
// ============================================================================

/**
 * AgentX configuration
 *
 * - No `server`: Local mode (uses Claude API directly)
 * - With `server`: Remote mode (connects to AgentX server)
 */
export interface AgentXConfig {
  /**
   * Remote server URL (WebSocket)
   * If provided, AgentX runs in remote mode.
   * @example "ws://localhost:5200"
   */
  server?: string;

  /**
   * Anthropic API key (local mode only)
   * @default process.env.ANTHROPIC_API_KEY
   */
  apiKey?: string;

  /**
   * Claude model to use (local mode only)
   * @default "claude-sonnet-4-20250514"
   */
  model?: string;

  /**
   * Persistence layer (local mode only)
   * @default In-memory persistence
   */
  persistence?: Persistence;
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
  on<T extends string>(
    type: T,
    handler: (event: SystemEvent & { type: T }) => void
  ): Unsubscribe;

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
  emitCommand<T extends keyof CommandEventMap>(
    type: T,
    data: CommandEventMap[T]["data"]
  ): void;

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
 * // Local mode
 * const agentx = await createAgentX();
 *
 * // Remote mode
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 * ```
 */
export declare function createAgentX(config?: AgentXConfig): Promise<AgentX>;
