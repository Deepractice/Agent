/**
 * ApplicationClient - HTTP client for Application layer
 *
 * Provides typed HTTP client interface for accessing Application layer APIs.
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
 * // Get image
 * const image = await client.images.get(imageId);
 *
 * // Run agent from image
 * const agent = await client.images.run(imageId);
 * ```
 */

import type {
  DefinitionRecord,
  ImageRecord,
  SessionRecord,
  MessageRecord,
  ContainerRecord,
} from "~/persistence";
import type {
  PlatformInfoResponse,
  HealthResponse,
  AgentListResponse,
  AgentInfoResponse,
  CreateAgentResponse,
} from "../server/ResponseTypes";

/**
 * ApplicationClient configuration
 */
export interface ApplicationClientConfig {
  /**
   * Base URL for API requests (e.g., "http://localhost:5200/api")
   */
  baseUrl: string;

  /**
   * Default headers for all requests
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Fetch implementation (default: global fetch)
   */
  fetch?: typeof fetch;
}

/**
 * ApplicationClient - Typed HTTP client for Application layer
 */
export interface ApplicationClient {
  /**
   * Platform endpoints
   */
  readonly platform: {
    /**
     * Get platform info
     */
    info(): Promise<PlatformInfoResponse>;

    /**
     * Health check
     */
    health(): Promise<HealthResponse>;
  };

  /**
   * Definition endpoints
   */
  readonly definitions: {
    /**
     * List all definitions
     */
    list(): Promise<DefinitionRecord[]>;

    /**
     * Get definition by name
     */
    get(name: string): Promise<DefinitionRecord>;

    /**
     * Save definition
     */
    save(definition: DefinitionRecord): Promise<void>;

    /**
     * Delete definition
     */
    delete(name: string): Promise<void>;

    /**
     * Check if definition exists
     */
    exists(name: string): Promise<boolean>;
  };

  /**
   * Image endpoints
   */
  readonly images: {
    /**
     * List all images
     */
    list(): Promise<ImageRecord[]>;

    /**
     * Get image by ID
     */
    get(imageId: string): Promise<ImageRecord>;

    /**
     * Save image
     */
    save(image: ImageRecord): Promise<void>;

    /**
     * Delete image
     */
    delete(imageId: string): Promise<void>;

    /**
     * Check if image exists
     */
    exists(imageId: string): Promise<boolean>;

    /**
     * Run agent from image
     */
    run(imageId: string, options?: { containerId?: string }): Promise<CreateAgentResponse>;

    /**
     * List sessions for image
     */
    listSessions(imageId: string): Promise<SessionRecord[]>;

    /**
     * Delete all sessions for image
     */
    deleteSessions(imageId: string): Promise<void>;

    /**
     * List images by definition name
     */
    listByDefinition(definitionName: string): Promise<ImageRecord[]>;
  };

  /**
   * Session endpoints
   */
  readonly sessions: {
    /**
     * List all sessions
     */
    list(): Promise<SessionRecord[]>;

    /**
     * Get session by ID
     */
    get(sessionId: string): Promise<SessionRecord>;

    /**
     * Save session
     */
    save(session: SessionRecord): Promise<void>;

    /**
     * Delete session
     */
    delete(sessionId: string): Promise<void>;

    /**
     * Check if session exists
     */
    exists(sessionId: string): Promise<boolean>;

    /**
     * Resume session
     */
    resume(sessionId: string, options?: { containerId?: string }): Promise<CreateAgentResponse>;

    /**
     * List messages for session
     */
    listMessages(sessionId: string): Promise<MessageRecord[]>;

    /**
     * Delete all messages for session
     */
    deleteMessages(sessionId: string): Promise<void>;

    /**
     * Count messages for session
     */
    countMessages(sessionId: string): Promise<number>;

    /**
     * List sessions by container ID
     */
    listByContainer(containerId: string): Promise<SessionRecord[]>;
  };

  /**
   * Agent endpoints (runtime, but accessed via HTTP)
   */
  readonly agents: {
    /**
     * List all agents
     */
    list(): Promise<AgentListResponse>;

    /**
     * Get agent by ID
     */
    get(agentId: string): Promise<AgentInfoResponse>;

    /**
     * Delete agent
     */
    delete(agentId: string): Promise<void>;

    /**
     * Send message to agent
     */
    sendMessage(agentId: string, content: string): Promise<void>;

    /**
     * Interrupt agent
     */
    interrupt(agentId: string): Promise<void>;
  };

  /**
   * Container endpoints
   */
  readonly containers: {
    /**
     * List all containers
     */
    list(): Promise<ContainerRecord[]>;

    /**
     * Get container by ID
     */
    get(containerId: string): Promise<ContainerRecord>;

    /**
     * Create container
     */
    create(config?: Record<string, unknown>): Promise<ContainerRecord>;

    /**
     * Save container
     */
    save(container: ContainerRecord): Promise<void>;

    /**
     * Delete container
     */
    delete(containerId: string): Promise<void>;

    /**
     * Check if container exists
     */
    exists(containerId: string): Promise<boolean>;
  };

  /**
   * Message endpoints
   */
  readonly messages: {
    /**
     * Get message by ID
     */
    get(messageId: string): Promise<MessageRecord>;

    /**
     * Save message
     */
    save(message: MessageRecord): Promise<void>;

    /**
     * Delete message
     */
    delete(messageId: string): Promise<void>;
  };
}
