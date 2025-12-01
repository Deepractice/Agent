/**
 * Storage Module - Persistence abstraction for AgentX
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 *
 * ## Architecture
 *
 * ```
 * Repository (unified interface)
 * ├── Image methods (save, find, delete)
 * ├── Session methods (save, find, delete)
 * └── Message methods (deprecated, stored in Image)
 *
 * Implementations:
 * ├── SQLiteRepository (agentx-node) - SQLite
 * └── RemoteRepository (agentx) - HTTP API
 * ```
 *
 * ## Record Types (Storage Schema)
 *
 * Pure data types used by both SQLite schema and HTTP API:
 * - ImageRecord: Image persistence data (frozen snapshot)
 * - SessionRecord: Session persistence data (external wrapper)
 * - MessageRecord: Message persistence data (deprecated)
 *
 * @packageDocumentation
 */

// Repository interface
export type { Repository } from "./Repository";

// Record types (storage schema)
export * from "./record";
