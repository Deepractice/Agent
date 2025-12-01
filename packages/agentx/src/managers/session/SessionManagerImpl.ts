/**
 * SessionManagerImpl - Session management implementation
 *
 * Manages session lifecycle using Repository for persistence.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 */

import type {
  Session,
  SessionManager,
  Repository,
  SessionRecord,
  ImageRecord,
  Agent,
  AgentDefinition,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/SessionManager");

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${timestamp}_${random}`;
}

/**
 * Generate unique image ID
 */
function generateImageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `image_${timestamp}_${random}`;
}

/**
 * Session implementation with resume and fork capability
 */
class SessionImpl implements Session {
  readonly sessionId: string;
  readonly userId: string;
  readonly imageId: string;
  readonly createdAt: number;

  private _title: string | null;
  private _updatedAt: number;
  private readonly repository: Repository;
  private readonly agentFactory: (
    definition: AgentDefinition,
    config: Record<string, unknown>
  ) => Agent;

  constructor(
    record: SessionRecord,
    repository: Repository,
    agentFactory: (definition: AgentDefinition, config: Record<string, unknown>) => Agent
  ) {
    this.sessionId = record.sessionId;
    this.userId = record.userId;
    this.imageId = record.imageId;
    this._title = record.title;
    this.createdAt = record.createdAt.getTime();
    this._updatedAt = record.updatedAt.getTime();
    this.repository = repository;
    this.agentFactory = agentFactory;
  }

  get title(): string | null {
    return this._title;
  }

  get updatedAt(): number {
    return this._updatedAt;
  }

  async resume(): Promise<Agent> {
    logger.info("Resuming agent from session", {
      sessionId: this.sessionId,
      imageId: this.imageId,
    });

    // Get image record from repository
    const imageRecord = await this.repository.findImageById(this.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${this.imageId}`);
    }

    // Create agent with stored definition and config
    const definition = imageRecord.definition as unknown as AgentDefinition;
    const config = imageRecord.config;

    const agent = this.agentFactory(definition, config);

    // TODO: Load messages from imageRecord.messages into agent context
    logger.debug("Agent resumed", {
      sessionId: this.sessionId,
      imageId: this.imageId,
      messageCount: imageRecord.messages.length,
    });

    return agent;
  }

  async fork(): Promise<Session> {
    logger.info("Forking session", { sessionId: this.sessionId });

    // Get current image
    const imageRecord = await this.repository.findImageById(this.imageId);
    if (!imageRecord) {
      throw new Error(`Image not found: ${this.imageId}`);
    }

    // Create new image with copied data
    const newImageId = generateImageId();
    const newImageRecord: ImageRecord = {
      imageId: newImageId,
      definition: imageRecord.definition,
      config: imageRecord.config,
      messages: [...imageRecord.messages], // Copy messages
      createdAt: new Date(),
    };
    await this.repository.saveImage(newImageRecord);

    // Create new session pointing to new image
    const newSessionId = generateSessionId();
    const now = new Date();
    const newSessionRecord: SessionRecord = {
      sessionId: newSessionId,
      userId: this.userId,
      imageId: newImageId,
      title: this._title ? `Fork of ${this._title}` : null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveSession(newSessionRecord);

    logger.info("Session forked", {
      originalSessionId: this.sessionId,
      newSessionId,
      newImageId,
    });

    return new SessionImpl(newSessionRecord, this.repository, this.agentFactory);
  }

  async setTitle(title: string): Promise<void> {
    logger.debug("Setting session title", { sessionId: this.sessionId, title });

    const now = new Date();
    await this.repository.saveSession({
      sessionId: this.sessionId,
      userId: this.userId,
      imageId: this.imageId,
      title,
      createdAt: new Date(this.createdAt),
      updatedAt: now,
    });

    this._title = title;
    this._updatedAt = now.getTime();

    logger.info("Session title updated", { sessionId: this.sessionId, title });
  }
}

/**
 * SessionManager implementation
 */
export class SessionManagerImpl implements SessionManager {
  private readonly repository: Repository;
  private readonly agentFactory: (
    definition: AgentDefinition,
    config: Record<string, unknown>
  ) => Agent;

  constructor(
    repository: Repository,
    agentFactory: (definition: AgentDefinition, config: Record<string, unknown>) => Agent
  ) {
    this.repository = repository;
    this.agentFactory = agentFactory;
  }

  async create(imageId: string, userId: string): Promise<Session> {
    const sessionId = generateSessionId();
    const now = new Date();

    const record: SessionRecord = {
      sessionId,
      userId,
      imageId,
      title: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.saveSession(record);

    logger.info("Session created", { sessionId, imageId, userId });

    return new SessionImpl(record, this.repository, this.agentFactory);
  }

  async get(sessionId: string): Promise<Session | undefined> {
    const record = await this.repository.findSessionById(sessionId);
    if (!record) return undefined;

    return new SessionImpl(record, this.repository, this.agentFactory);
  }

  async has(sessionId: string): Promise<boolean> {
    return this.repository.sessionExists(sessionId);
  }

  async list(): Promise<Session[]> {
    const records = await this.repository.findAllSessions();
    return records.map((r) => new SessionImpl(r, this.repository, this.agentFactory));
  }

  async listByImage(imageId: string): Promise<Session[]> {
    const records = await this.repository.findSessionsByImageId(imageId);
    return records.map((r) => new SessionImpl(r, this.repository, this.agentFactory));
  }

  async listByUser(userId: string): Promise<Session[]> {
    const records = await this.repository.findSessionsByUserId(userId);
    return records.map((r) => new SessionImpl(r, this.repository, this.agentFactory));
  }

  async destroy(sessionId: string): Promise<void> {
    await this.repository.deleteSession(sessionId);
    logger.info("Session destroyed", { sessionId });
  }

  async destroyByImage(imageId: string): Promise<void> {
    await this.repository.deleteSessionsByImageId(imageId);
    logger.info("Sessions destroyed by image", { imageId });
  }

  async destroyAll(): Promise<void> {
    const sessions = await this.repository.findAllSessions();
    for (const session of sessions) {
      await this.repository.deleteSession(session.sessionId);
    }
    logger.info("All sessions destroyed");
  }
}
