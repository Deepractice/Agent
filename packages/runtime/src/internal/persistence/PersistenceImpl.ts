/**
 * PersistenceImpl - Multi-backend Persistence implementation
 *
 * Uses unstorage for backend-agnostic storage.
 * Supports: Memory, FileSystem, Redis, MongoDB, SQLite, MySQL, PostgreSQL
 *
 * @example
 * ```typescript
 * // Memory (default)
 * const persistence = await createPersistence();
 *
 * // SQLite
 * const persistence = await createPersistence({
 *   driver: "sqlite",
 *   path: "./data.db",
 * });
 *
 * // PostgreSQL
 * const persistence = await createPersistence({
 *   driver: "postgresql",
 *   url: "postgres://user:pass@localhost:5432/agentx",
 * });
 *
 * // Redis
 * const persistence = await createPersistence({
 *   driver: "redis",
 *   url: "redis://localhost:6379",
 * });
 * ```
 */

import { createStorage, type Storage } from "unstorage";
import type {
  Persistence,
  ImageRepository,
  ContainerRepository,
  SessionRepository,
} from "@agentxjs/types/runtime/internal";
import { createLogger } from "@agentxjs/common";
import {
  StorageImageRepository,
  StorageContainerRepository,
  StorageSessionRepository,
} from "./repository";

const logger = createLogger("persistence/Persistence");

/**
 * Storage driver type
 */
export type StorageDriver =
  | "memory"
  | "fs"
  | "redis"
  | "mongodb"
  | "sqlite"
  | "mysql"
  | "postgresql";

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /**
   * Storage driver (default: "memory")
   */
  driver?: StorageDriver;

  /**
   * File path (for sqlite, fs drivers)
   * @example "./data.db" for sqlite
   * @example "./data" for fs
   */
  path?: string;

  /**
   * Connection URL (for redis, mongodb, mysql, postgresql)
   * @example "redis://localhost:6379"
   * @example "mongodb://localhost:27017/agentx"
   * @example "mysql://user:pass@localhost:3306/agentx"
   * @example "postgres://user:pass@localhost:5432/agentx"
   */
  url?: string;

  /**
   * Custom unstorage instance (advanced)
   */
  storage?: Storage;
}

/**
 * PersistenceImpl - Multi-backend Persistence implementation
 */
export class PersistenceImpl implements Persistence {
  readonly images: ImageRepository;
  readonly containers: ContainerRepository;
  readonly sessions: SessionRepository;

  private readonly storage: Storage;

  /**
   * Private constructor - use createPersistence() factory function
   */
  private constructor(storage: Storage, driverName: string) {
    this.storage = storage;

    // Create repositories
    this.images = new StorageImageRepository(this.storage);
    this.containers = new StorageContainerRepository(this.storage);
    this.sessions = new StorageSessionRepository(this.storage);

    logger.info("Persistence created", { driver: driverName });
  }

  /**
   * Create a PersistenceImpl instance (async factory)
   */
  static async create(config: PersistenceConfig = {}): Promise<PersistenceImpl> {
    const driverName = config.driver ?? "memory";
    const storage = config.storage ?? (await createStorageFromConfig(config));
    return new PersistenceImpl(storage, driverName);
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
    logger.info("Persistence disposed");
  }
}

/**
 * Create storage instance from config (async for ESM dynamic imports)
 */
async function createStorageFromConfig(config: PersistenceConfig): Promise<Storage> {
  const driver = config.driver ?? "memory";

  switch (driver) {
    case "memory":
      return createStorage();

    case "fs": {
      const { default: fsDriver } = await import("unstorage/drivers/fs");
      return createStorage({
        driver: fsDriver({ base: config.path ?? "./data" }),
      });
    }

    case "redis": {
      const { default: redisDriver } = await import("unstorage/drivers/redis");
      return createStorage({
        driver: redisDriver({ url: config.url ?? "redis://localhost:6379" }),
      });
    }

    case "mongodb": {
      const { default: mongoDriver } = await import("unstorage/drivers/mongodb");
      return createStorage({
        driver: mongoDriver({
          connectionString: config.url ?? "mongodb://localhost:27017",
          databaseName: "agentx",
          collectionName: "storage",
        }),
      });
    }

    case "sqlite": {
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      // @ts-expect-error - db0 connectors use .mts exports, not compatible with moduleResolution: node
      const { default: sqliteConnector } = await import("db0/connectors/better-sqlite3");
      const database = createDatabase(sqliteConnector({ path: config.path ?? "./data.db" }));
      return createStorage({
        driver: db0Driver({ database }),
      });
    }

    case "mysql": {
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      // @ts-expect-error - db0 connectors use .mts exports, not compatible with moduleResolution: node
      const { default: mysqlConnector } = await import("db0/connectors/mysql2");
      const database = createDatabase(
        mysqlConnector({ uri: config.url ?? "mysql://localhost:3306/agentx" })
      );
      return createStorage({
        driver: db0Driver({ database }),
      });
    }

    case "postgresql": {
      const { default: db0Driver } = await import("unstorage/drivers/db0");
      const { createDatabase } = await import("db0");
      // @ts-expect-error - db0 connectors use .mts exports, not compatible with moduleResolution: node
      const { default: pgConnector } = await import("db0/connectors/postgresql");
      const database = createDatabase(
        pgConnector({ connectionString: config.url ?? "postgres://localhost:5432/agentx" })
      );
      return createStorage({
        driver: db0Driver({ database }),
      });
    }

    default:
      throw new Error(`Unknown storage driver: ${driver}`);
  }
}

/**
 * Create Persistence instance (async)
 *
 * @param config - Configuration options
 * @returns Promise<Persistence> instance
 */
export async function createPersistence(config?: PersistenceConfig): Promise<PersistenceImpl> {
  return PersistenceImpl.create(config);
}
