/**
 * StorageSessionRepository - unstorage-based SessionRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { SessionRepository, SessionRecord } from "@agentxjs/types/runtime/internal";
import type { Message } from "@agentxjs/types/agent";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/SessionRepository");

/** Key prefix for sessions */
const PREFIX = "sessions";

/** Key prefix for messages */
const MESSAGES_PREFIX = "messages";

/** Index prefix for image lookup */
const INDEX_BY_IMAGE = "idx:sessions:image";

/** Index prefix for container lookup */
const INDEX_BY_CONTAINER = "idx:sessions:container";

/**
 * StorageSessionRepository - unstorage implementation
 */
export class StorageSessionRepository implements SessionRepository {
  constructor(private readonly storage: Storage) {}

  private key(sessionId: string): string {
    return `${PREFIX}:${sessionId}`;
  }

  private messagesKey(sessionId: string): string {
    return `${MESSAGES_PREFIX}:${sessionId}`;
  }

  private imageIndexKey(imageId: string, sessionId: string): string {
    return `${INDEX_BY_IMAGE}:${imageId}:${sessionId}`;
  }

  private containerIndexKey(containerId: string, sessionId: string): string {
    return `${INDEX_BY_CONTAINER}:${containerId}:${sessionId}`;
  }

  async saveSession(record: SessionRecord): Promise<void> {
    // Save main record
    await this.storage.setItem(this.key(record.sessionId), record);

    // Save index for image lookup
    await this.storage.setItem(
      this.imageIndexKey(record.imageId, record.sessionId),
      record.sessionId
    );

    // Save index for container lookup
    await this.storage.setItem(
      this.containerIndexKey(record.containerId, record.sessionId),
      record.sessionId
    );

    logger.debug("Session saved", { sessionId: record.sessionId });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    const record = await this.storage.getItem<SessionRecord>(this.key(sessionId));
    return record ?? null;
  }

  async findSessionByImageId(imageId: string): Promise<SessionRecord | null> {
    const indexPrefix = `${INDEX_BY_IMAGE}:${imageId}`;
    const keys = await this.storage.getKeys(indexPrefix);

    if (keys.length === 0) return null;

    // Return the first (most recent) session for this image
    const sessionId = await this.storage.getItem<string>(keys[0]);
    if (!sessionId) return null;

    return this.findSessionById(sessionId);
  }

  async findSessionsByContainerId(containerId: string): Promise<SessionRecord[]> {
    const indexPrefix = `${INDEX_BY_CONTAINER}:${containerId}`;
    const keys = await this.storage.getKeys(indexPrefix);
    const records: SessionRecord[] = [];

    for (const key of keys) {
      const sessionId = await this.storage.getItem<string>(key);
      if (sessionId) {
        const record = await this.findSessionById(sessionId);
        if (record) {
          records.push(record);
        }
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findAllSessions(): Promise<SessionRecord[]> {
    const keys = await this.storage.getKeys(PREFIX);
    const records: SessionRecord[] = [];

    for (const key of keys) {
      // Skip index keys
      if (key.startsWith("idx:")) continue;

      const record = await this.storage.getItem<SessionRecord>(key);
      if (record) {
        records.push(record);
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Get record for index cleanup
    const record = await this.findSessionById(sessionId);

    // Delete main record
    await this.storage.removeItem(this.key(sessionId));

    // Delete messages
    await this.storage.removeItem(this.messagesKey(sessionId));

    // Delete indexes
    if (record) {
      await this.storage.removeItem(this.imageIndexKey(record.imageId, sessionId));
      await this.storage.removeItem(this.containerIndexKey(record.containerId, sessionId));
    }

    logger.debug("Session deleted", { sessionId });
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(sessionId));
  }

  // ==================== Message Operations ====================

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const messages = await this.getMessages(sessionId);
    messages.push(message);
    await this.storage.setItem(this.messagesKey(sessionId), messages);
    logger.debug("Message added to session", { sessionId, subtype: message.subtype });
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    const messages = await this.storage.getItem<Message[]>(this.messagesKey(sessionId));
    // Ensure we always return an array (handle corrupted data)
    if (!messages || !Array.isArray(messages)) {
      if (messages) {
        logger.warn("Messages data is not an array, resetting", {
          sessionId,
          type: typeof messages,
        });
      }
      return [];
    }
    return messages;
  }

  async clearMessages(sessionId: string): Promise<void> {
    await this.storage.removeItem(this.messagesKey(sessionId));
    logger.debug("Messages cleared for session", { sessionId });
  }
}
