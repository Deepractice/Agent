/**
 * SSERuntime - Browser Runtime implementation
 *
 * "Define Once, Run Anywhere"
 *
 * Provides Runtime for browser that connects to remote AgentX server via SSE.
 * Uses the same API as NodeRuntime, enabling unified code across platforms.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { createSSERuntime } from "agentxjs/client";
 * import { defineAgent } from "agentxjs";
 *
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   systemPrompt: "You are a helpful assistant",
 * });
 *
 * // Browser: connect to remote server
 * const runtime = createSSERuntime({ serverUrl: "http://localhost:5200/agentx" });
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 *
 * // Same API as server-side!
 * agent.on("assistant_message", (event) => {
 *   console.log(event.data.content);
 * });
 *
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
  EcosystemEventHandler,
  Unsubscribe,
} from "@agentxjs/types";
import { setLoggerFactory } from "@agentxjs/common";
import { Subject } from "rxjs";
import { createSSEDriver } from "./SSEDriver";
import { RemoteRepository } from "./repository";
import { BrowserLoggerFactory } from "./logger";
import { RemoteAgentIdResolver } from "./RemoteAgentIdResolver";

// ============================================================================
// NoopSandbox - Browser doesn't need local resources
// ============================================================================

const noopSandbox: Sandbox = {
  name: "browser-noop",
  workspace: {
    id: "noop",
    name: "noop",
    path: "", // Browser has no local workspace
  },
  llm: {
    name: "noop",
    provide: () => ({}),
  },
};

// ============================================================================
// SSERuntime - Browser Runtime implementation
// ============================================================================

/**
 * SSERuntime configuration
 */
export interface SSERuntimeConfig {
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
   * createSSERuntime({
   *   serverUrl: "http://localhost:5200/agentx",
   *   headers: { Authorization: "Bearer xxx" }, // For HTTP requests
   *   sseParams: { token: "xxx" }, // For SSE connections
   * });
   * ```
   */
  sseParams?: Record<string, string>;
}

/**
 * SSERuntime - Runtime for browser with SSE driver
 *
 * Connects to remote AgentX server via SSE.
 * All resources (LLM, etc.) are provided by the server.
 *
 * Uses RemoteContainer which calls server POST /agents to create agents.
 * This ensures browser and server use the same agentId.
 */
class SSERuntime implements Runtime {
  readonly name = "sse";
  readonly repository: Repository;
  readonly loggerFactory: LoggerFactory;
  readonly agentIdResolver: AgentIdResolver;

  private readonly serverUrl: string;
  private readonly headers: Record<string, string>;
  private readonly sseParams: Record<string, string>;

  // Ecosystem event bus
  private readonly eventSubject = new Subject<AnyEnvironmentEvent>();

  constructor(config: SSERuntimeConfig) {
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
    // Browser doesn't need local resources
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

  // ==================== Ecosystem Implementation ====================

  on(handler: EcosystemEventHandler<AnyEnvironmentEvent>): Unsubscribe {
    const subscription = this.eventSubject.subscribe(handler);
    return () => subscription.unsubscribe();
  }

  emit(event: AnyEnvironmentEvent): void {
    this.eventSubject.next(event);
  }

  dispose(): void {
    this.eventSubject.complete();
  }
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create SSE Runtime for browser
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { sseRuntime } from "agentxjs/runtime/sse";
 *
 * createAgentX(sseRuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 *   headers: { Authorization: "Bearer xxx" },
 * }));
 * ```
 */
export function sseRuntime(config: SSERuntimeConfig): Runtime {
  return new SSERuntime(config);
}

/**
 * @deprecated Use `sseRuntime()` instead for consistency with `nodeRuntime()`
 */
export const createSSERuntime = sseRuntime;

// Also export class for advanced use
export { SSERuntime };
