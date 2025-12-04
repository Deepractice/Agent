/**
 * ApplicationClientImpl - HTTP client implementation for Application layer
 *
 * Provides typed HTTP client for accessing Application layer APIs.
 * Used by browser/remote clients to interact with AgentX server.
 *
 * @example
 * ```typescript
 * const client = createApplicationClient({
 *   baseUrl: "http://localhost:5200/api",
 *   headers: { Authorization: "Bearer xxx" },
 * });
 *
 * // List definitions
 * const definitions = await client.definitions.list();
 *
 * // Run agent from image
 * const agent = await client.images.run(imageId);
 * ```
 */

import type {
  ApplicationClient,
  ApplicationClientConfig,
  DefinitionRecord,
  ImageRecord,
  SessionRecord,
  MessageRecord,
  ContainerRecord,
  PlatformInfoResponse,
  HealthResponse,
  AgentListResponse,
  AgentInfoResponse,
  CreateAgentResponse,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("network/ApplicationClient");

/**
 * HTTP client implementation
 */
class ApplicationClientImpl implements ApplicationClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly timeout: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: ApplicationClientConfig) {
    // Remove trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.headers = config.headers ?? {};
    this.timeout = config.timeout ?? 30000;
    this.fetchFn = config.fetch ?? fetch;

    logger.debug("ApplicationClient created", { baseUrl: this.baseUrl });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...this.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          (error as { error?: { message?: string } }).error?.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  private async head(path: string): Promise<boolean> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method: "HEAD",
        headers: this.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }

  // ============================================================================
  // Platform
  // ============================================================================

  readonly platform = {
    info: async (): Promise<PlatformInfoResponse> => {
      return this.request<PlatformInfoResponse>("GET", "/info");
    },

    health: async (): Promise<HealthResponse> => {
      return this.request<HealthResponse>("GET", "/health");
    },
  };

  // ============================================================================
  // Definitions
  // ============================================================================

  readonly definitions = {
    list: async (): Promise<DefinitionRecord[]> => {
      return this.request<DefinitionRecord[]>("GET", "/definitions");
    },

    get: async (name: string): Promise<DefinitionRecord> => {
      return this.request<DefinitionRecord>("GET", `/definitions/${encodeURIComponent(name)}`);
    },

    save: async (definition: DefinitionRecord): Promise<void> => {
      await this.request<void>(
        "PUT",
        `/definitions/${encodeURIComponent(definition.name)}`,
        definition
      );
    },

    delete: async (name: string): Promise<void> => {
      await this.request<void>("DELETE", `/definitions/${encodeURIComponent(name)}`);
    },

    exists: async (name: string): Promise<boolean> => {
      return this.head(`/definitions/${encodeURIComponent(name)}`);
    },
  };

  // ============================================================================
  // Images
  // ============================================================================

  readonly images = {
    list: async (): Promise<ImageRecord[]> => {
      return this.request<ImageRecord[]>("GET", "/images");
    },

    get: async (imageId: string): Promise<ImageRecord> => {
      return this.request<ImageRecord>("GET", `/images/${encodeURIComponent(imageId)}`);
    },

    save: async (image: ImageRecord): Promise<void> => {
      await this.request<void>(
        "PUT",
        `/images/${encodeURIComponent(image.imageId)}`,
        image
      );
    },

    delete: async (imageId: string): Promise<void> => {
      await this.request<void>("DELETE", `/images/${encodeURIComponent(imageId)}`);
    },

    exists: async (imageId: string): Promise<boolean> => {
      return this.head(`/images/${encodeURIComponent(imageId)}`);
    },

    run: async (
      imageId: string,
      options?: { containerId?: string }
    ): Promise<CreateAgentResponse> => {
      return this.request<CreateAgentResponse>(
        "POST",
        `/images/${encodeURIComponent(imageId)}/run`,
        options
      );
    },

    listSessions: async (imageId: string): Promise<SessionRecord[]> => {
      return this.request<SessionRecord[]>(
        "GET",
        `/images/${encodeURIComponent(imageId)}/sessions`
      );
    },

    deleteSessions: async (imageId: string): Promise<void> => {
      await this.request<void>(
        "DELETE",
        `/images/${encodeURIComponent(imageId)}/sessions`
      );
    },

    listByDefinition: async (definitionName: string): Promise<ImageRecord[]> => {
      return this.request<ImageRecord[]>(
        "GET",
        `/images?definitionName=${encodeURIComponent(definitionName)}`
      );
    },
  };

  // ============================================================================
  // Sessions
  // ============================================================================

  readonly sessions = {
    list: async (): Promise<SessionRecord[]> => {
      return this.request<SessionRecord[]>("GET", "/sessions");
    },

    get: async (sessionId: string): Promise<SessionRecord> => {
      return this.request<SessionRecord>("GET", `/sessions/${encodeURIComponent(sessionId)}`);
    },

    save: async (session: SessionRecord): Promise<void> => {
      await this.request<void>(
        "PUT",
        `/sessions/${encodeURIComponent(session.sessionId)}`,
        session
      );
    },

    delete: async (sessionId: string): Promise<void> => {
      await this.request<void>("DELETE", `/sessions/${encodeURIComponent(sessionId)}`);
    },

    exists: async (sessionId: string): Promise<boolean> => {
      return this.head(`/sessions/${encodeURIComponent(sessionId)}`);
    },

    resume: async (
      sessionId: string,
      options?: { containerId?: string }
    ): Promise<CreateAgentResponse> => {
      return this.request<CreateAgentResponse>(
        "POST",
        `/sessions/${encodeURIComponent(sessionId)}/resume`,
        options
      );
    },

    listMessages: async (sessionId: string): Promise<MessageRecord[]> => {
      return this.request<MessageRecord[]>(
        "GET",
        `/sessions/${encodeURIComponent(sessionId)}/messages`
      );
    },

    deleteMessages: async (sessionId: string): Promise<void> => {
      await this.request<void>(
        "DELETE",
        `/sessions/${encodeURIComponent(sessionId)}/messages`
      );
    },

    countMessages: async (sessionId: string): Promise<number> => {
      const result = await this.request<{ count: number }>(
        "GET",
        `/sessions/${encodeURIComponent(sessionId)}/messages/count`
      );
      return result.count;
    },

    listByContainer: async (containerId: string): Promise<SessionRecord[]> => {
      return this.request<SessionRecord[]>(
        "GET",
        `/sessions?containerId=${encodeURIComponent(containerId)}`
      );
    },
  };

  // ============================================================================
  // Agents
  // ============================================================================

  readonly agents = {
    list: async (): Promise<AgentListResponse> => {
      return this.request<AgentListResponse>("GET", "/agents");
    },

    get: async (agentId: string): Promise<AgentInfoResponse> => {
      return this.request<AgentInfoResponse>("GET", `/agents/${encodeURIComponent(agentId)}`);
    },

    delete: async (agentId: string): Promise<void> => {
      await this.request<void>("DELETE", `/agents/${encodeURIComponent(agentId)}`);
    },

    sendMessage: async (agentId: string, content: string): Promise<void> => {
      await this.request<void>(
        "POST",
        `/agents/${encodeURIComponent(agentId)}/messages`,
        { content }
      );
    },

    interrupt: async (agentId: string): Promise<void> => {
      await this.request<void>("POST", `/agents/${encodeURIComponent(agentId)}/interrupt`);
    },
  };

  // ============================================================================
  // Containers
  // ============================================================================

  readonly containers = {
    list: async (): Promise<ContainerRecord[]> => {
      return this.request<ContainerRecord[]>("GET", "/containers");
    },

    get: async (containerId: string): Promise<ContainerRecord> => {
      return this.request<ContainerRecord>(
        "GET",
        `/containers/${encodeURIComponent(containerId)}`
      );
    },

    create: async (config?: Record<string, unknown>): Promise<ContainerRecord> => {
      return this.request<ContainerRecord>("POST", "/containers", { config });
    },

    save: async (container: ContainerRecord): Promise<void> => {
      await this.request<void>(
        "PUT",
        `/containers/${encodeURIComponent(container.containerId)}`,
        container
      );
    },

    delete: async (containerId: string): Promise<void> => {
      await this.request<void>("DELETE", `/containers/${encodeURIComponent(containerId)}`);
    },

    exists: async (containerId: string): Promise<boolean> => {
      return this.head(`/containers/${encodeURIComponent(containerId)}`);
    },
  };

  // ============================================================================
  // Messages
  // ============================================================================

  readonly messages = {
    get: async (messageId: string): Promise<MessageRecord> => {
      return this.request<MessageRecord>("GET", `/messages/${encodeURIComponent(messageId)}`);
    },

    save: async (message: MessageRecord): Promise<void> => {
      await this.request<void>(
        "PUT",
        `/messages/${encodeURIComponent(message.messageId)}`,
        message
      );
    },

    delete: async (messageId: string): Promise<void> => {
      await this.request<void>("DELETE", `/messages/${encodeURIComponent(messageId)}`);
    },
  };
}

/**
 * Create Application HTTP client
 */
export function createApplicationClient(
  config: ApplicationClientConfig
): ApplicationClient {
  return new ApplicationClientImpl(config);
}
