/**
 * MirrorPersistence - Network-based Persistence implementation
 *
 * Implements Persistence interface using ApplicationClient from @agentxjs/network.
 * Used by browser clients to persist data via the AgentX server.
 *
 * @example
 * ```typescript
 * const persistence = new MirrorPersistence({
 *   baseUrl: "http://localhost:5200/api",
 * });
 *
 * await persistence.definitions.saveDefinition(record);
 * const image = await persistence.images.findImageById(imageId);
 * ```
 */

import type {
  Persistence,
  DefinitionRepository,
  ImageRepository,
  ContainerRepository,
  SessionRepository,
  DefinitionRecord,
  ImageRecord,
  ContainerRecord,
  SessionRecord,
  ApplicationClient,
} from "@agentxjs/types";
import { createApplicationClient } from "@agentxjs/network";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/MirrorPersistence");

/**
 * MirrorPersistence configuration
 */
export interface MirrorPersistenceConfig {
  /**
   * Base URL for API requests (e.g., "http://localhost:5200/api")
   */
  baseUrl: string;

  /**
   * Authentication token (optional)
   */
  token?: string;

  /**
   * Additional headers (optional)
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Adapter: ApplicationClient.definitions -> DefinitionRepository
 */
class ClientDefinitionRepository implements DefinitionRepository {
  constructor(private readonly client: ApplicationClient) {}

  async saveDefinition(record: DefinitionRecord): Promise<void> {
    await this.client.definitions.save(record);
    logger.debug("Definition saved", { name: record.name });
  }

  async findDefinitionByName(name: string): Promise<DefinitionRecord | null> {
    try {
      return await this.client.definitions.get(name);
    } catch {
      return null;
    }
  }

  async findAllDefinitions(): Promise<DefinitionRecord[]> {
    return await this.client.definitions.list();
  }

  async deleteDefinition(name: string): Promise<void> {
    await this.client.definitions.delete(name);
    logger.debug("Definition deleted", { name });
  }

  async definitionExists(name: string): Promise<boolean> {
    return await this.client.definitions.exists(name);
  }
}

/**
 * Adapter: ApplicationClient.images -> ImageRepository
 */
class ClientImageRepository implements ImageRepository {
  constructor(private readonly client: ApplicationClient) {}

  async saveImage(record: ImageRecord): Promise<void> {
    await this.client.images.save(record);
    logger.debug("Image saved", { imageId: record.imageId });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    try {
      return await this.client.images.get(imageId);
    } catch {
      return null;
    }
  }

  async findAllImages(): Promise<ImageRecord[]> {
    return await this.client.images.list();
  }

  async findImagesByDefinitionName(definitionName: string): Promise<ImageRecord[]> {
    return await this.client.images.listByDefinition(definitionName);
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.client.images.delete(imageId);
    logger.debug("Image deleted", { imageId });
  }

  async imageExists(imageId: string): Promise<boolean> {
    return await this.client.images.exists(imageId);
  }
}

/**
 * Adapter: ApplicationClient.containers -> ContainerRepository
 */
class ClientContainerRepository implements ContainerRepository {
  constructor(private readonly client: ApplicationClient) {}

  async saveContainer(record: ContainerRecord): Promise<void> {
    await this.client.containers.save(record);
    logger.debug("Container saved", { containerId: record.containerId });
  }

  async findContainerById(containerId: string): Promise<ContainerRecord | null> {
    try {
      return await this.client.containers.get(containerId);
    } catch {
      return null;
    }
  }

  async findAllContainers(): Promise<ContainerRecord[]> {
    return await this.client.containers.list();
  }

  async deleteContainer(containerId: string): Promise<void> {
    await this.client.containers.delete(containerId);
    logger.debug("Container deleted", { containerId });
  }

  async containerExists(containerId: string): Promise<boolean> {
    return await this.client.containers.exists(containerId);
  }
}

/**
 * Adapter: ApplicationClient.sessions -> SessionRepository
 */
class ClientSessionRepository implements SessionRepository {
  constructor(private readonly client: ApplicationClient) {}

  async saveSession(record: SessionRecord): Promise<void> {
    await this.client.sessions.save(record);
    logger.debug("Session saved", { sessionId: record.sessionId });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    try {
      return await this.client.sessions.get(sessionId);
    } catch {
      return null;
    }
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    return await this.client.images.listSessions(imageId);
  }

  async findSessionsByContainerId(containerId: string): Promise<SessionRecord[]> {
    return await this.client.sessions.listByContainer(containerId);
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    return await this.client.sessions.list();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.sessions.delete(sessionId);
    logger.debug("Session deleted", { sessionId });
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    await this.client.images.deleteSessions(imageId);
    logger.debug("Sessions deleted by imageId", { imageId });
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return await this.client.sessions.exists(sessionId);
  }
}

/**
 * MirrorPersistence - Network-based Persistence implementation
 *
 * Uses ApplicationClient from @agentxjs/network for all HTTP communication.
 */
export class MirrorPersistence implements Persistence {
  readonly definitions: DefinitionRepository;
  readonly images: ImageRepository;
  readonly containers: ContainerRepository;
  readonly sessions: SessionRepository;

  constructor(config: MirrorPersistenceConfig) {
    // Build headers with auth token
    const headers: Record<string, string> = { ...config.headers };
    if (config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    // Create ApplicationClient from network package
    const client = createApplicationClient({
      baseUrl: config.baseUrl,
      headers,
      timeout: config.timeout,
    });

    // Create repository adapters
    this.definitions = new ClientDefinitionRepository(client);
    this.images = new ClientImageRepository(client);
    this.containers = new ClientContainerRepository(client);
    this.sessions = new ClientSessionRepository(client);

    logger.debug("MirrorPersistence created", { baseUrl: config.baseUrl });
  }
}
