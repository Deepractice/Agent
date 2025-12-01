/**
 * Storage Records - Pure data types for persistence
 *
 * These types define the storage schema used by both:
 * - SQLite schema (agentx-node)
 * - HTTP API contracts (agentx remote)
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *                        ↓
 *                    Session (external wrapper)
 */

export type { ImageRecord, ImageType } from "./ImageRecord";
export type { SessionRecord } from "./SessionRecord";
export type { MessageRecord } from "./MessageRecord";

// Deprecated: Use ImageRecord instead
// export type { AgentRecord } from "./AgentRecord";
