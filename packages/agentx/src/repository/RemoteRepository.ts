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
  DefinitionRecord,
  ImageRecord,
  SessionRecord,
  MessageRecord,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-common";
import { createHttpClient, type KyInstance } from "../managers/remote/HttpClient";

const logger = createLogger("agentx/RemoteRepository");

export interface RemoteRepositoryOptions {
  serverUrl: string;
  headers?: Record<string, string>;
}

export class RemoteRepository implements Repository {
  private readonly client: KyInstance;

  constructor(options: RemoteRepositoryOptions) {
    this.client = createHttpClient({
      baseUrl: options.serverUrl,
      headers: options.headers,
    });
    logger.debug("RemoteRepository created", { serverUrl: options.serverUrl });
  }

  // ==================== Definition ====================

  async saveDefinition(record: DefinitionRecord): Promise<void> {
    await this.client.put(`definitions/${record.name}`, { json: record });
  }

  async findDefinitionByName(name: string): Promise<DefinitionRecord | null> {
    try {
      const result = await this.client.get(`definitions/${name}`).json<DefinitionRecord>();
      return this.parseDefinitionRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findAllDefinitions(): Promise<DefinitionRecord[]> {
    const result = await this.client.get("definitions").json<DefinitionRecord[]>();
    return result.map((r) => this.parseDefinitionRecord(r));
  }

  async deleteDefinition(name: string): Promise<void> {
    await this.client.delete(`definitions/${name}`);
  }

  async definitionExists(name: string): Promise<boolean> {
    try {
      await this.client.head(`definitions/${name}`);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Image ====================

  async saveImage(record: ImageRecord): Promise<void> {
    await this.client.put(`images/${record.imageId}`, { json: record });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    try {
      const result = await this.client.get(`images/${imageId}`).json<ImageRecord>();
      return this.parseImageRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findAllImages(): Promise<ImageRecord[]> {
    const result = await this.client.get("images").json<ImageRecord[]>();
    return result.map((r) => this.parseImageRecord(r));
  }

  async deleteImage(imageId: string): Promise<void> {
    await this.client.delete(`images/${imageId}`);
  }

  async imageExists(imageId: string): Promise<boolean> {
    try {
      await this.client.head(`images/${imageId}`);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Session ====================

  async saveSession(record: SessionRecord): Promise<void> {
    await this.client.put(`sessions/${record.sessionId}`, { json: record });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    try {
      const result = await this.client.get(`sessions/${sessionId}`).json<SessionRecord>();
      return this.parseSessionRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    const result = await this.client.get(`images/${imageId}/sessions`).json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async findSessionsByUserId(userId: string): Promise<SessionRecord[]> {
    const result = await this.client.get(`users/${userId}/sessions`).json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    const result = await this.client.get("sessions").json<SessionRecord[]>();
    return result.map((r) => this.parseSessionRecord(r));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`sessions/${sessionId}`);
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    await this.client.delete(`images/${imageId}/sessions`);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      await this.client.head(`sessions/${sessionId}`);
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Message ====================

  /**
   * Save message - noop in browser
   *
   * Messages are persisted by server-side SessionCollector.
   * Browser-side calls this but it does nothing to avoid duplicate saves.
   */
  async saveMessage(_record: MessageRecord): Promise<void> {
    // Noop - server handles persistence via SessionCollector
    logger.debug("saveMessage called (noop in browser)");
  }

  async findMessageById(messageId: string): Promise<MessageRecord | null> {
    try {
      const result = await this.client.get(`messages/${messageId}`).json<MessageRecord>();
      return this.parseMessageRecord(result);
    } catch (error: unknown) {
      if (this.isNotFound(error)) return null;
      throw error;
    }
  }

  async findMessagesBySessionId(sessionId: string): Promise<MessageRecord[]> {
    const result = await this.client.get(`sessions/${sessionId}/messages`).json<MessageRecord[]>();
    return result.map((r) => this.parseMessageRecord(r));
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`messages/${messageId}`);
  }

  async deleteMessagesBySessionId(sessionId: string): Promise<void> {
    await this.client.delete(`sessions/${sessionId}/messages`);
  }

  async countMessagesBySessionId(sessionId: string): Promise<number> {
    const result = await this.client
      .get(`sessions/${sessionId}/messages/count`)
      .json<{ count: number }>();
    return result.count;
  }

  // ==================== Helpers ====================

  private isNotFound(error: unknown): boolean {
    return (error as { response?: { status: number } })?.response?.status === 404;
  }

  private parseDefinitionRecord(raw: DefinitionRecord): DefinitionRecord {
    return {
      ...raw,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
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
