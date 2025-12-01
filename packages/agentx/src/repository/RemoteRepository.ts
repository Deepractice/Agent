/**
 * RemoteRepository - HTTP-based repository implementation
 *
 * Communicates with remote AgentX server for persistence.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 */

import type {
  Repository,
  ImageRecord,
  SessionRecord,
  MessageRecord,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { createHttpClient, type KyInstance } from "../managers/remote/HttpClient";

const logger = createLogger("agentx/RemoteRepository");

export interface RemoteRepositoryOptions {
  serverUrl: string;
}

export class RemoteRepository implements Repository {
  private readonly client: KyInstance;

  constructor(options: RemoteRepositoryOptions) {
    this.client = createHttpClient({ baseUrl: options.serverUrl });
    logger.debug("RemoteRepository created", { serverUrl: options.serverUrl });
  }

  // ==================== Image ====================

  async saveImage(record: ImageRecord): Promise<void> {
    await this.client.put(`repository/images/${record.imageId}`, { json: record });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    try {
      const result = await this.client.get(`repository/images/${imageId}`).json<ImageRecord>();
      return this.parseImageRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findAllImages(): Promise<ImageRecord[]> {
    const result = await this.client.get("repository/images").json<ImageRecord[]>();
    return result.map((r) => this.parseImageRecord(r));
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.client.delete(`repository/images/${imageId}`);
  }

  async imageExists(imageId: string): Promise<boolean> {
    try {
      await this.client.head(`repository/images/${imageId}`);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Session ====================

  async saveSession(record: SessionRecord): Promise<void> {
    await this.client.put(`repository/sessions/${record.sessionId}`, { json: record });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    try {
      const result = await this.client
        .get(`repository/sessions/${sessionId}`)
        .json<SessionRecord>();
      return this.parseSessionRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    const result = await this.client
      .get(`repository/images/${imageId}/sessions`)
      .json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async findSessionsByUserId(userId: string): Promise<SessionRecord[]> {
    const result = await this.client
      .get(`repository/users/${userId}/sessions`)
      .json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    const result = await this.client.get("repository/sessions").json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`repository/sessions/${sessionId}`);
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    await this.client.delete(`repository/images/${imageId}/sessions`);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      await this.client.head(`repository/sessions/${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Message (deprecated) ====================

  async saveMessage(record: MessageRecord): Promise<void> {
    await this.client.put(`repository/messages/${record.messageId}`, { json: record });
  }

  async findMessageById(messageId: string): Promise<MessageRecord | null> {
    try {
      const result = await this.client
        .get(`repository/messages/${messageId}`)
        .json<MessageRecord>();
      return this.parseMessageRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]> {
    const result = await this.client
      .get(`repository/sessions/${sessionId}/messages`)
      .json<MessageRecord[]>();
    return result.map((r) => this.parseMessageRecord(r));
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`repository/messages/${messageId}`);
  }

  async deleteMessagesBySessionId(sessionId: string): Promise<void> {
    await this.client.delete(`repository/sessions/${sessionId}/messages`);
  }

  async countMessagesBySessionId(sessionId: string): Promise<number> {
    const result = await this.client
      .get(`repository/sessions/${sessionId}/messages/count`)
      .json<{ count: number }>();
    return result.count;
  }

  // ==================== Helpers ====================

  private isNotFound(error: unknown): boolean {
    return (error as { response?: { status: number } })?.response?.status === 404;
  }

  private parseImageRecord(raw: ImageRecord): ImageRecord {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
    };
  }

  private parseSessionRecord(raw: SessionRecord): SessionRecord {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private parseMessageRecord(raw: MessageRecord): MessageRecord {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
    };
  }
}
