/**
 * ImageRecord - Persistent representation of a conversation
 *
 * Image is the primary entity users interact with (displayed as "conversation").
 * Agent is a transient runtime instance created from Image.
 *
 * Lifecycle:
 * - image_create → ImageRecord (persistent)
 * - image_run → Agent (runtime, in-memory)
 * - image_stop / server restart → Agent destroyed, Image remains
 *
 * Messages are stored separately in Session (via sessionId).
 *
 * ImageRecord is the SINGLE SOURCE OF TRUTH for agent configuration.
 * All static configuration (systemPrompt, mcpServers) is stored here,
 * not in AgentConfig (which is for runtime-specific config only).
 */

import type { McpServerConfig } from "~/runtime/internal/container/sandbox/mcp";

/**
 * Image metadata for storing provider-specific data
 */
export interface ImageMetadata {
  /** Claude SDK session ID for conversation resume */
  claudeSdkSessionId?: string;
}

/**
 * Image storage record
 *
 * Represents a conversation that persists across server restarts.
 */
export interface ImageRecord {
  /**
   * Unique image identifier
   * Pattern: `img_${nanoid()}`
   */
  imageId: string;

  /**
   * Container ID (user isolation boundary)
   */
  containerId: string;

  /**
   * Session ID for message storage
   * Messages are stored in Session, not duplicated here
   */
  sessionId: string;

  /**
   * Conversation name (displayed to user)
   */
  name: string;

  /**
   * Conversation description (optional)
   */
  description?: string;

  /**
   * System prompt - controls agent behavior
   */
  systemPrompt?: string;

  /**
   * Parent image ID (for fork/branch feature)
   */
  parentImageId?: string;

  /**
   * MCP servers configuration
   */
  mcpServers?: Record<string, McpServerConfig>;

  /**
   * Provider-specific metadata (e.g., Claude SDK session ID)
   */
  metadata?: ImageMetadata;

  /**
   * Creation timestamp (Unix milliseconds)
   */
  createdAt: number;

  /**
   * Last update timestamp (Unix milliseconds)
   */
  updatedAt: number;
}
