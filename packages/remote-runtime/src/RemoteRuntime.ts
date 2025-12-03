/**
 * RemoteRuntime - Remote Runtime implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Provides Runtime that connects to remote AgentX server via SSE (or WebSocket in future).
 * Uses the same API as NodeRuntime, enabling unified code across platforms.
 *
 * Can run in:
 * - Browser: Connect to backend AgentX server
 * - Node.js: Connect to remote AgentX server as client
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { remoteRuntime } from "@agentxjs/remote-runtime";
 * import { defineAgent } from "agentxjs";
 *
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   systemPrompt: "You are a helpful assistant",
 * });
 *
 * // Connect to remote server
 * const runtime = remoteRuntime({ serverUrl: "http://localhost:5200/agentx" });
 * const agentx = createAgentX(runtime);
 *
 * // Listen to ecosystem events
 * agentx.on((event) => {
 *   if (event.type === "agent_ready") {
 *     console.log("Agent is ready!");
 *   }
 * });
 *
 * const agent = agentx.agents.create(MyAgent);
 * await agent.receive("Hello!");
 * ```
 */

import type {
  Runtime,
  Sandbox,
  RuntimeDriver,
  AgentContext,
  AgentDefinition,
  Repository,
  LoggerFactory,
  Logger,
  AgentIdResolver,
  AnyEnvironmentEvent,
  Unsubscribe,
  EcosystemEventHandler,
} from "@agentxjs/types";
import { setLoggerFactory } from "@agentxjs/common";
import { Subject } from "rxjs";
import { createSSEDriver } from "./SSEDriver";
import { RemoteRepository } from "./repository";
import { BrowserLoggerFactory } from "./logger";
import { RemoteAgentIdResolver } from "./RemoteAgentIdResolver";

// ============================================================================
// NoopSandbox - Remote runtime doesn't need local resources
// ============================================================================

const noopSandbox: Sandbox = {
  name: "remote-noop",
  workspace: {
    id: "noop",
    name: "noop",
    path: "", // Remote has no local workspace
  },
  llm: {
    name: "noop",
    provide: () => ({}),
  },
};

// ============================================================================
// RemoteRuntime - Remote Runtime implementation
// ============================================================================

/**
 * RemoteRuntime configuration
 */
export interface RemoteRuntimeConfig {
  /**
   * Server base URL (e.g., "http://localhost:5200/agentx")
   */
  serverUrl: string;

  /**
   * Optional request headers (for auth, etc.)
   * Note: These headers are used for HTTP requests (POST, DELETE, etc.)
   * but NOT for SSE connections (EventSource doesn't support headers).
   * For SSE auth, use sseParams to pass token via query string.
   */
  headers?: Record<string, string>;

  /**
   * Optional query parameters to append to SSE URL.
   * Use this for authentication since EventSource doesn't support headers.
   *
   * @example
   * ```typescript
   * remoteRuntime({
   *   serverUrl: "http://localhost:5200/agentx",
   *   headers: { Authorization: "Bearer xxx" }, // For HTTP requests
   *   sseParams: { token: "xxx" }, // For SSE connections
   * });
   * ```
   */
  sseParams?: Record<string, string>;
}

/**
 * RemoteRuntime - Runtime that connects to remote AgentX server
 *
 * Connects to remote AgentX server via SSE.
 * All resources (LLM, etc.) are provided by the server.
 *
 * As an Ecosystem, RemoteRuntime collects events from all Receptors
 * (which receive events via SSE transport) and makes them available
 * via on() for external observers.
 */
class RemoteRuntime implements Runtime {
  readonly name = "remote";
  readonly repository: Repository;
  readonly loggerFactory: LoggerFactory;
  readonly agentIdResolver: AgentIdResolver;

  private readonly serverUrl: string;
  private readonly headers: Record<string, string>;
  private readonly sseParams: Record<string, string>;

  // Ecosystem event bus
  private readonly eventSubject = new Subject<AnyEnvironmentEvent>();

  constructor(config: RemoteRuntimeConfig) {
    this.serverUrl = config.serverUrl.replace(/\/+$/, ""); // Remove trailing slash
    this.headers = config.headers ?? {};
    this.sseParams = config.sseParams ?? {};

    // Create and configure BrowserLoggerFactory
    this.loggerFactory = new BrowserLoggerFactory({
      collapsed: true,
    });

    // Set as global logger factory
    setLoggerFactory(this.loggerFactory);

    this.repository = new RemoteRepository({
      serverUrl: this.serverUrl,
      headers: this.headers,
    });

    // Create agent ID resolver for remote agent creation
    this.agentIdResolver = new RemoteAgentIdResolver({
      serverUrl: this.serverUrl,
      headers: this.headers,
    });
  }

  createSandbox(_containerId: string): Sandbox {
    // Remote runtime doesn't need local resources
    return noopSandbox;
  }

  createDriver(
    _definition: AgentDefinition,
    context: AgentContext,
    _sandbox: Sandbox
  ): RuntimeDriver {
    // context.agentId is already resolved by RemoteContainer
    // which called POST /agents on server - so it's the server's agentId
    const driver = createSSEDriver({
      serverUrl: this.serverUrl,
      agentId: context.agentId,
      headers: this.headers,
      sseParams: this.sseParams,
    });

    // SSEDriver implements AgentDriver, wrap it as RuntimeDriver
    return {
      ...driver,
      sandbox: noopSandbox,
    };
  }

  createLogger(name: string): Logger {
    return this.loggerFactory.getLogger(name);
  }

  // ============================================================================
  // Ecosystem Interface Implementation
  // ============================================================================

  /**
   * Subscribe to all ecosystem events
   *
   * @param handler - Callback invoked for each event
   * @returns Unsubscribe function
   */
  on(handler: EcosystemEventHandler<AnyEnvironmentEvent>): Unsubscribe {
    const subscription = this.eventSubject.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  /**
   * Emit an event to the ecosystem
   * Used internally by Receptors (which receive events via SSE)
   *
   * @param event - The event to emit
   */
  emit(event: AnyEnvironmentEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * Dispose the runtime and clean up resources
   */
  dispose(): void {
    this.eventSubject.complete();
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create Remote Runtime
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { remoteRuntime } from "@agentxjs/remote-runtime";
 *
 * createAgentX(remoteRuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 *   headers: { Authorization: "Bearer xxx" },
 * }));
 * ```
 */
export function remoteRuntime(config: RemoteRuntimeConfig): Runtime {
  return new RemoteRuntime(config);
}

/**
 * @deprecated Use `remoteRuntime()` instead
 */
export const sseRuntime = remoteRuntime;

/**
 * @deprecated Use `remoteRuntime()` instead
 */
export const createSSERuntime = remoteRuntime;

// Also export class for advanced use
export { RemoteRuntime };
