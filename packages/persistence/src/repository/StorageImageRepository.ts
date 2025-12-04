/**
 * StorageImageRepository - unstorage-based ImageRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { ImageRepository, ImageRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/ImageRepository");

/** Key prefix for images */
const PREFIX = "images";

/** Index prefix for definition lookup */
const INDEX_BY_DEFINITION = "idx:images:definition";

/**
 * StorageImageRepository - unstorage implementation
 */
export class StorageImageRepository implements ImageRepository {
  constructor(private readonly storage: Storage) {}

  private key(imageId: string): string {
    return `${PREFIX}:${imageId}`;
  }

  private indexKey(definitionName: string, imageId: string): string {
    return `${INDEX_BY_DEFINITION}:${definitionName}:${imageId}`;
  }

  async saveImage(record: ImageRecord): Promise<void> {
    // Save main record
    await this.storage.setItem(this.key(record.imageId), record);

    // Save index for definition lookup
    await this.storage.setItem(
      this.indexKey(record.definitionName, record.imageId),
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

  async findImagesByDefinitionName(definitionName: string): Promise<ImageRecord[]> {
    const indexPrefix = `${INDEX_BY_DEFINITION}:${definitionName}`;
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
    // Get record to find definition name for index cleanup
    const record = await this.findImageById(imageId);

    // Delete main record
    await this.storage.removeItem(this.key(imageId));

    // Delete index
    if (record) {
      await this.storage.removeItem(
        this.indexKey(record.definitionName, imageId)
      );
    }

    logger.debug("Image deleted", { imageId });
  }

  async imageExists(imageId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(imageId));
  }
}
