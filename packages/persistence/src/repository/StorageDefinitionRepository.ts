/**
 * StorageDefinitionRepository - unstorage-based DefinitionRepository
 *
 * Uses unstorage for backend-agnostic storage (Memory, Redis, SQLite, etc.)
 */

import type { Storage } from "unstorage";
import type { DefinitionRepository, DefinitionRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("persistence/DefinitionRepository");

/** Key prefix for definitions */
const PREFIX = "definitions";

/**
 * StorageDefinitionRepository - unstorage implementation
 */
export class StorageDefinitionRepository implements DefinitionRepository {
  constructor(private readonly storage: Storage) {}

  private key(name: string): string {
    return `${PREFIX}:${name}`;
  }

  async saveDefinition(record: DefinitionRecord): Promise<void> {
    await this.storage.setItem(this.key(record.name), record);
    logger.debug("Definition saved", { name: record.name });
  }

  async findDefinitionByName(name: string): Promise<DefinitionRecord | null> {
    const record = await this.storage.getItem<DefinitionRecord>(this.key(name));
    return record ?? null;
  }

  async findAllDefinitions(): Promise<DefinitionRecord[]> {
    const keys = await this.storage.getKeys(PREFIX);
    const records: DefinitionRecord[] = [];

    for (const key of keys) {
      const record = await this.storage.getItem<DefinitionRecord>(key);
      if (record) {
        records.push(record);
      }
    }

    return records.sort((a, b) => b.createdAt - a.createdAt);
  }

  async deleteDefinition(name: string): Promise<void> {
    await this.storage.removeItem(this.key(name));
    logger.debug("Definition deleted", { name });
  }

  async definitionExists(name: string): Promise<boolean> {
    return await this.storage.hasItem(this.key(name));
  }
}
