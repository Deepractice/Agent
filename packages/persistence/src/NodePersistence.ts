/**
 * NodePersistence - Multi-backend Persistence implementation
 *
 * Uses unstorage for backend-agnostic storage.
 * Supports: Memory, Redis, SQLite, FileSystem, and more.
 *
 * @example
 * ```typescript
 * // Memory (default, for testing)
 * const persistence = createNodePersistence();
 *
 * // SQLite
 * const persistence = createNodePersistence({
 *   driver: "sqlite",
 *   path: "./data.db",
 * });
 *
 * // Redis
 * const persistence = createNodePersistence({
 *   driver: "redis",
 *   url: "redis://localhost:6379",
 * });
 *
 * // FileSystem
 * const persistence = createNodePersistence({
 *   driver: "fs",
 *   base: "./data",
 * });
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type {
  Persistence,
  DefinitionRepository,
  ImageRepository,
  ContainerRepository,
  SessionRepository,
} from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import {
  StorageDefinitionRepository,
  StorageImageRepository,
  StorageContainerRepository,
  StorageSessionRepository,
} from "./repository";

const logger = createLogger("persistence/NodePersistence");

/**
 * Storage driver type
 */
export type StorageDriver = "memory" | "fs" | "redis" | "sqlite";

/**
 * NodePersistence configuration
 */
export interface NodePersistenceConfig {
  /**
   * Storage driver (default: "memory")
   */
  driver?: StorageDriver;

  /**
   * File path for sqlite driver
   */
  path?: string;

  /**
   * Base directory for fs driver
   */
  base?: string;

  /**
   * Redis URL for redis driver
   */
  url?: string;

  /**
   * Custom unstorage instance (advanced)
   */
  storage?: Storage;
}

/**
 * NodePersistence - Multi-backend Persistence implementation
 */
export class NodePersistence implements Persistence {
  readonly definitions: DefinitionRepository;
  readonly images: ImageRepository;
  readonly containers: ContainerRepository;
  readonly sessions: SessionRepository;

  private readonly storage: Storage;

  constructor(config: NodePersistenceConfig = {}) {
    // Use custom storage or create one based on driver
    this.storage = config.storage ?? createStorageFromConfig(config);

    // Create repositories
    this.definitions = new StorageDefinitionRepository(this.storage);
    this.images = new StorageImageRepository(this.storage);
    this.containers = new StorageContainerRepository(this.storage);
    this.sessions = new StorageSessionRepository(this.storage);

    logger.info("NodePersistence created", { driver: config.driver ?? "memory" });
  }

  /**
   * Get the underlying storage instance
   */
  getStorage(): Storage {
    return this.storage;
  }

  /**
   * Dispose and cleanup resources
   */
  async dispose(): Promise<void> {
    await this.storage.dispose();
    logger.info("NodePersistence disposed");
  }
}

/**
 * Create storage instance from config
 */
function createStorageFromConfig(config: NodePersistenceConfig): Storage {
  const driver = config.driver ?? "memory";

  switch (driver) {
    case "memory":
      return createStorage();

    case "fs":
      // Lazy import to avoid bundling fs driver in browser
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fsDriver = require("unstorage/drivers/fs").default;
      return createStorage({
        driver: fsDriver({ base: config.base ?? "./data" }),
      });

    case "redis":
      // Lazy import
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const redisDriver = require("unstorage/drivers/redis").default;
      return createStorage({
        driver: redisDriver({ url: config.url ?? "redis://localhost:6379" }),
      });

    case "sqlite":
      // unstorage uses db0 for SQLite
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const db0Driver = require("unstorage/drivers/db0").default;
      return createStorage({
        driver: db0Driver({
          connector: "better-sqlite3",
          options: { path: config.path ?? "./data.db" },
        }),
      });

    default:
      throw new Error(`Unknown storage driver: ${driver}`);
  }
}

/**
 * Create NodePersistence instance
 *
 * @param config - Configuration options
 * @returns NodePersistence instance
 */
export function createNodePersistence(config?: NodePersistenceConfig): NodePersistence {
  return new NodePersistence(config);
}
