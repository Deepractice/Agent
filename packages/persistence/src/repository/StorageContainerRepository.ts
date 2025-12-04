/**
 * StorageContainerRepository - unstorage-based ContainerRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { ContainerRepository, ContainerRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/ContainerRepository");

/** Key prefix for containers */
const PREFIX = "containers";

/**
 * StorageContainerRepository - unstorage implementation
 */
export class StorageContainerRepository implements ContainerRepository {
  constructor(private readonly storage: Storage) {}

  private key(containerId: string): string {
    return `${PREFIX}:${containerId}`;
  }

  async saveContainer(record: ContainerRecord): Promise<void> {
    await this.storage.setItem(this.key(record.containerId), record);
    logger.debug("Container saved", { containerId: record.containerId });
  }

  async findContainerById(containerId: string): Promise<ContainerRecord | null> {
    const record = await this.storage.getItem<ContainerRecord>(this.key(containerId));
    return record ?? null;
  }

  async findAllContainers(): Promise<ContainerRecord[]> {
    const keys = await this.storage.getKeys(PREFIX);
    const records: ContainerRecord[] = [];

    for (const key of keys) {
      const record = await this.storage.getItem<ContainerRecord>(key);
      if (record) {
        records.push(record);
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteContainer(containerId: string): Promise<void> {
    await this.storage.removeItem(this.key(containerId));
    logger.debug("Container deleted", { containerId });
  }

  async containerExists(containerId: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(containerId));
  }
}
