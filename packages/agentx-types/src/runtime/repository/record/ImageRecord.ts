/**
 * ImageRecord - Storage schema for AgentImage persistence
 *
 * Pure data type representing an image (frozen snapshot) in storage.
 * Contains serialized definition, config, and messages for resume/fork capability.
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 */

/**
 * Image storage record
 *
 * Stores the complete frozen snapshot including:
 * - Definition (business config at build time)
 * - Config (runtime config at build time)
 * - Messages (conversation history)
 */
export interface ImageRecord {
  /**
   * Unique image identifier
   */
  imageId: string;

  /**
   * Serialized agent definition (JSON)
   * Frozen snapshot of business config at build time
   */
  definition: Record<string, unknown>;

  /**
   * Serialized runtime config (JSON)
   * Frozen snapshot of model, apiKey reference, etc. at build time
   */
  config: Record<string, unknown>;

  /**
   * Serialized messages (JSON array)
   * Frozen conversation history for resume/fork
   */
  messages: Record<string, unknown>[];

  /**
   * Creation timestamp
   */
  createdAt: Date;
}
