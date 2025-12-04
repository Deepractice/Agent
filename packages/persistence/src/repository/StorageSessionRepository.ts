/**
 * StorageSessionRepository - unstorage-based SessionRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { SessionRepository, SessionRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/SessionRepository");

/** Key prefix for sessions */
const PREFIX = "sessions";

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
    if (record.containerId) {
      await this.storage.setItem(
        this.containerIndexKey(record.containerId, record.sessionId),
        record.sessionId
      );
    }

    logger.debug("Session saved", { sessionId: record.sessionId });
  }

  async findSessionById(sessionId: string): Promise<SessionRecord | null> {
    const record = await this.storage.getItem<SessionRecord>(this.key(sessionId));
    return record ?? null;
  }

  async findSessionsByImageId(imageId: string): Promise<SessionRecord[]> {
    const indexPrefix = `${INDEX_BY_IMAGE}:${imageId}`;
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

    // Delete indexes
    if (record) {
      await this.storage.removeItem(
        this.imageIndexKey(record.imageId, sessionId)
      );
      if (record.containerId) {
        await this.storage.removeItem(
          this.containerIndexKey(record.containerId, sessionId)
        );
      }
    }

    logger.debug("Session deleted", { sessionId });
  }

  async deleteSessionsByImageId(imageId: string): Promise<void> {
    const sessions = await this.findSessionsByImageId(imageId);
    for (const session of sessions) {
      await this.deleteSession(session.sessionId);
    }
    logger.debug("Sessions deleted by imageId", { imageId, count: sessions.length });
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(sessionId));
  }
}
