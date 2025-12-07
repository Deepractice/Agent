/**
 * StorageImageRepository - unstorage-based ImageRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { ImageRepository, ImageRecord, ImageMetadata } from "@agentxjs/types/runtime/internal";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/ImageRepository");

/** Key prefix for images */
const PREFIX = "images";

/** Index prefix for name lookup */
const INDEX_BY_NAME = "idx:images:name";

/** Index prefix for container lookup */
const INDEX_BY_CONTAINER = "idx:images:container";

/**
 * StorageImageRepository - unstorage implementation
 */
export class StorageImageRepository implements ImageRepository {
  constructor(private readonly storage: Storage) {}

  private key(imageId: string): string {
    return `${PREFIX}:${imageId}`;
  }

  private nameIndexKey(name: string, imageId: string): string {
    return `${INDEX_BY_NAME}:${name}:${imageId}`;
  }

  private containerIndexKey(containerId: string, imageId: string): string {
    return `${INDEX_BY_CONTAINER}:${containerId}:${imageId}`;
  }

  async saveImage(record: ImageRecord): Promise<void> {
    // Save main record
    await this.storage.setItem(this.key(record.imageId), record);

    // Save index for name lookup
    await this.storage.setItem(this.nameIndexKey(record.name, record.imageId), record.imageId);

    // Save index for container lookup
    await this.storage.setItem(
      this.containerIndexKey(record.containerId, record.imageId),
      record.imageId
    );

    logger.debug("Image saved", { imageId: record.imageId });
  }

  async findImageById(imageId: string): Promise<ImageRecord | null> {
    const record = await this.storage.getItem<ImageRecord>(this.key(imageId));
    return record ?? null;
  }

  async findAllImages(): Promise<ImageRecord[]> {
    const keys = await this.storage.getKeys(PREFIX);
    const records: ImageRecord[] = [];

    for (const key of keys) {
      // Skip index keys
      if (key.startsWith("idx:")) continue;

      const record = await this.storage.getItem<ImageRecord>(key);
      if (record) {
        records.push(record);
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findImagesByName(name: string): Promise<ImageRecord[]> {
    const indexPrefix = `${INDEX_BY_NAME}:${name}`;
    const keys = await this.storage.getKeys(indexPrefix);
    const records: ImageRecord[] = [];

    for (const key of keys) {
      const imageId = await this.storage.getItem<string>(key);
      if (imageId) {
        const record = await this.findImageById(imageId);
        if (record) {
          records.push(record);
        }
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async findImagesByContainerId(containerId: string): Promise<ImageRecord[]> {
    const indexPrefix = `${INDEX_BY_CONTAINER}:${containerId}`;
    const keys = await this.storage.getKeys(indexPrefix);
    const records: ImageRecord[] = [];

    for (const key of keys) {
      const imageId = await this.storage.getItem<string>(key);
      if (imageId) {
        const record = await this.findImageById(imageId);
        if (record) {
          records.push(record);
        }
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteImage(imageId: string): Promise<void> {
    // Get record to find name and containerId for index cleanup
    const record = await this.findImageById(imageId);

    // Delete main record
    await this.storage.removeItem(this.key(imageId));

    // Delete indexes
    if (record) {
      await this.storage.removeItem(this.nameIndexKey(record.name, imageId));
      await this.storage.removeItem(this.containerIndexKey(record.containerId, imageId));
    }

    logger.debug("Image deleted", { imageId });
  }

  async imageExists(imageId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(imageId));
  }

  async updateMetadata(imageId: string, metadata: Partial<ImageMetadata>): Promise<void> {
    const record = await this.findImageById(imageId);
    if (!record) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Merge metadata
    const updatedRecord: ImageRecord = {
      ...record,
      metadata: {
        ...record.metadata,
        ...metadata,
      },
      updatedAt: Date.now(),
    };

    await this.storage.setItem(this.key(imageId), updatedRecord);
    logger.debug("Image metadata updated", { imageId, metadata });
  }
}
