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
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { createSSERuntime } from "@deepractice-ai/agentx/client";
 * import { defineAgent } from "@deepractice-ai/agentx";
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
  Container,
  Sandbox,
  RuntimeDriver,
  AgentContext,
  AgentDefinition,
  Agent,
  Repository,
  AgentImage,
  Session,
  LoggerFactory,
} from "@deepractice-ai/agentx-types";
import { AgentInstance } from "@deepractice-ai/agentx-agent";
import { AgentEngine } from "@deepractice-ai/agentx-engine";
import { setLoggerFactory } from "@deepractice-ai/agentx-common";
import { createSSEDriver } from "./SSEDriver";
import { RemoteRepository } from "../repository";
import { BrowserLoggerFactory } from "./logger";

/**
 * Server response for run/resume endpoints
 */
interface CreateAgentResponse {
  agentId: string;
  name: string;
  lifecycle: string;
  state: string;
  createdAt: number;
  endpoints: {
    sse: string;
    messages: string;
    interrupt: string;
  };
}

// ============================================================================
// RemoteContainer - Container that calls remote server for agent creation
// ============================================================================

class RemoteContainer implements Container {
  readonly id: string;
  private readonly agents = new Map<string, Agent>();
  private readonly serverUrl: string;
  private readonly headers: Record<string, string>;
  private readonly sseParams: Record<string, string>;
  private readonly engine: AgentEngine;

  constructor(
    serverUrl: string,
    headers: Record<string, string> = {},
    sseParams: Record<string, string> = {}
  ) {
    this.id = "remote-container";
    this.serverUrl = serverUrl;
    this.headers = headers;
    this.sseParams = sseParams;
    this.engine = new AgentEngine();
  }

  /**
   * Run agent from image (calls server POST /images/:imageId/run)
   */
  async run(image: AgentImage): Promise<Agent> {
    // Call server to create agent
    const response = await fetch(`${this.serverUrl}/images/${image.imageId}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
    });

    if (!response.ok) {
      const errorBody = (await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }))) as {
        error?: { message?: string };
      };
      throw new Error(errorBody.error?.message || `Failed to run image: ${response.status}`);
    }

    const data = (await response.json()) as CreateAgentResponse;

    // Create local agent with SSE driver
    return this.createLocalAgent(data.agentId, image.definition);
  }

  /**
   * Resume agent from session (calls server POST /sessions/:sessionId/resume)
   */
  async resume(session: Session): Promise<Agent> {
    // Call server to resume agent
    const response = await fetch(`${this.serverUrl}/sessions/${session.sessionId}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
    });

    if (!response.ok) {
      const errorBody = (await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }))) as {
        error?: { message?: string };
      };
      throw new Error(errorBody.error?.message || `Failed to resume session: ${response.status}`);
    }

    const data = (await response.json()) as CreateAgentResponse;

    // Get definition from session's image (simplified - use name as fallback)
    const definition: AgentDefinition = {
      name: data.name,
      systemPrompt: "", // Server handles system prompt
    };

    // Create local agent with SSE driver
    return this.createLocalAgent(data.agentId, definition);
  }

  /**
   * Create a local AgentInstance with SSE driver
   */
  private createLocalAgent(agentId: string, definition: AgentDefinition): Agent {
    // Create context
    const context: AgentContext = {
      agentId,
      createdAt: Date.now(),
    };

    // Create SSE driver
    const driver = createSSEDriver({
      serverUrl: this.serverUrl,
      agentId,
      headers: this.headers,
      sseParams: this.sseParams,
    });

    // Create agent instance
    const agent = new AgentInstance(definition, context, this.engine, driver, noopSandbox);

    // Register agent
    this.agents.set(agentId, agent);

    return agent;
  }

  /**
   * Destroy agent (calls server DELETE /agents/:agentId)
   */
  async destroy(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.destroy();
    }

    // Remove from local cache
    this.agents.delete(agentId);

    // Call server to destroy agent
    await fetch(`${this.serverUrl}/agents/${agentId}`, {
      method: "DELETE",
      headers: this.headers,
    }).catch(() => {
      // Ignore errors - local cleanup is done
    });
  }

  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  async destroyAll(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    await Promise.all(agentIds.map((id) => this.destroy(id)));
  }
}

// ============================================================================
// NoopSandbox - Browser doesn't need local resources
// ============================================================================

const noopSandbox: Sandbox = {
  name: "browser-noop",
  os: {
    name: "noop",
    fs: null as any,
    process: null as any,
    env: null as any,
    disk: null as any,
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
  readonly container: Container;
  readonly repository: Repository;
  readonly loggerFactory: LoggerFactory;

  private readonly serverUrl: string;
  private readonly headers: Record<string, string>;
  private readonly sseParams: Record<string, string>;

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

    // Use RemoteContainer - it calls server to resolve agentId
    this.container = new RemoteContainer(this.serverUrl, this.headers, this.sseParams);
    this.repository = new RemoteRepository({
      serverUrl: this.serverUrl,
      headers: this.headers,
    });
  }

  createSandbox(_name: string): Sandbox {
    // Browser doesn't need local resources
    return noopSandbox;
  }

  createDriver(
    _definition: AgentDefinition,
    context: AgentContext,
    _sandbox: Sandbox
  ): RuntimeDriver {
    // context.agentId is already resolved by RemoteContainer.resolveAgentId()
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
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create SSE Runtime for browser
 *
 * @example
 * ```typescript
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { createSSERuntime } from "@deepractice-ai/agentx/client";
 *
 * const runtime = createSSERuntime({ serverUrl: "http://localhost:5200/agentx" });
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 * ```
 */
export function createSSERuntime(config: SSERuntimeConfig): Runtime {
  return new SSERuntime(config);
}

// Also export class for advanced use
export { SSERuntime };
