/**
 * AgentXClient - High-level client for AgentX server
 *
 * Provides methods to interact with AgentX platform.
 * Uses SSEDriver internally for full AgentEngine support.
 */

import type { Agent } from "@deepractice-ai/agentx-types";
import type {
  AgentXClientOptions,
  PlatformInfo,
  HealthStatus,
  AgentInfo,
  CreateAgentOptions,
  CreatedAgent,
} from "./types";
import { AgentXApiError } from "./types";
import { createRemoteAgent } from "./createRemoteAgent";

/**
 * AgentX Client
 *
 * High-level client for interacting with AgentX platform.
 * Provides methods for agent management and connection.
 */
export class AgentXClient {
  private _baseUrl: string;
  private _headers: Record<string, string>;
  private _timeout: number;

  constructor(options: AgentXClientOptions) {
    this._baseUrl = options.baseUrl.replace(/\/+$/, "");
    this._headers = options.headers || {};
    this._timeout = options.timeout || 30000;
  }

  // ============================================================================
  // Platform Methods
  // ============================================================================

  /**
   * Get platform info
   */
  async getInfo(): Promise<PlatformInfo> {
    return this._fetch<PlatformInfo>("GET", "/info");
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthStatus> {
    return this._fetch<HealthStatus>("GET", "/health");
  }

  // ============================================================================
  // Agent Methods
  // ============================================================================

  /**
   * List all agents
   */
  async listAgents(): Promise<AgentInfo[]> {
    const response = await this._fetch<{ agents: AgentInfo[] }>("GET", "/agents");
    return response.agents;
  }

  /**
   * Get agent info
   */
  async getAgent(agentId: string): Promise<AgentInfo> {
    return this._fetch<AgentInfo>("GET", `/agents/${agentId}`);
  }

  /**
   * Create a new agent
   */
  async createAgent(options: CreateAgentOptions): Promise<CreatedAgent> {
    return this._fetch<CreatedAgent>("POST", "/agents", options);
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this._fetch<void>("DELETE", `/agents/${agentId}`);
  }

  /**
   * Connect to an existing agent
   *
   * Returns a full Agent instance with AgentEngine support.
   * Events are automatically assembled (Stream → Message events).
   *
   * @example
   * ```typescript
   * const agent = await client.connect("agent_123");
   *
   * agent.on((event) => {
   *   // Receives assembled events: assistant_message, tool_use_message, etc.
   *   console.log(event);
   * });
   *
   * await agent.receive("Hello!");
   * ```
   */
  async connect(agentId: string): Promise<Agent> {
    // Verify agent exists
    await this.getAgent(agentId);

    // Create agent with SSEDriver
    return createRemoteAgent({
      serverUrl: this._baseUrl,
      agentId,
      headers: this._headers,
    });
  }

  /**
   * Create and connect to a new agent
   *
   * Creates a new agent on the server and returns a connected Agent instance.
   */
  async createAndConnect(options: CreateAgentOptions): Promise<Agent> {
    const created = await this.createAgent(options);

    return createRemoteAgent({
      serverUrl: this._baseUrl,
      agentId: created.agentId,
      headers: this._headers,
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async _fetch<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this._baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...this._headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this._timeout);
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (response.status === 204) {
        return undefined as T;
      }

      const data = (await response.json()) as T & {
        error?: { code?: string; message?: string; details?: unknown };
      };

      if (!response.ok) {
        throw new AgentXApiError(
          data.error?.code || "UNKNOWN_ERROR",
          data.error?.message || "Request failed",
          data.error?.details
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AgentXApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new AgentXApiError("TIMEOUT", "Request timed out");
      }

      throw new AgentXApiError(
        "NETWORK_ERROR",
        error instanceof Error ? error.message : "Network error"
      );
    }
  }
}

/**
 * Connect to a specific agent directly
 *
 * Convenience function for simple use cases.
 *
 * @example
 * ```typescript
 * const agent = await connectAgent({
 *   baseUrl: "http://localhost:5200/agentx",
 *   agentId: "agent_123",
 * });
 *
 * agent.on((event) => console.log(event));
 * await agent.receive("Hello!");
 * ```
 */
export async function connectAgent(options: {
  baseUrl: string;
  agentId: string;
  headers?: Record<string, string>;
}): Promise<Agent> {
  const client = new AgentXClient({
    baseUrl: options.baseUrl,
    headers: options.headers,
  });
  return client.connect(options.agentId);
}
