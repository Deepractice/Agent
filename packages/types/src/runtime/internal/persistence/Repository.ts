/**
 * Repository - Unified persistence interface for AgentX
 *
 * Combines all domain-specific repositories into a single interface.
 * Implementations can be local (SQLite) or remote (HTTP API).
 *
 * @example
 * ```typescript
 * // Local implementation (node-runtime)
 * const repository = new SQLiteRepository(dbPath);
 *
 * // Remote implementation (browser)
 * const repository = new RemoteRepository({ serverUrl: "http://..." });
 *
 * // Use with runtime
 * const runtime = createRuntime({ repository });
 * ```
 */

import type { ContainerRepository } from "./ContainerRepository";
import type { ImageRepository } from "./ImageRepository";
import type { SessionRepository } from "./SessionRepository";

/**
 * Repository - Unified persistence interface
 *
 * Combines all domain repositories for convenient single-point configuration.
 */
export interface Repository extends ContainerRepository, ImageRepository, SessionRepository {}
