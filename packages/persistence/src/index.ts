/**
 * @agentxjs/persistence - Multi-backend persistence for AgentX
 *
 * Provides unified storage layer supporting multiple backends:
 * - Memory (default, for testing)
 * - FileSystem
 * - Redis
 * - SQLite
 *
 * @example
 * ```typescript
 * import { createNodePersistence } from "@agentxjs/persistence";
 *
 * // Memory (default)
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
 * // Use with createAgentX
 * const agentx = createAgentX(runtime, persistence);
 * ```
 *
 * @packageDocumentation
 */

export { NodePersistence, createNodePersistence } from "./NodePersistence";
export type { NodePersistenceConfig, StorageDriver } from "./NodePersistence";

// Re-export repository implementations for advanced usage
export {
  StorageDefinitionRepository,
  StorageImageRepository,
  StorageContainerRepository,
  StorageSessionRepository,
} from "./repository";
