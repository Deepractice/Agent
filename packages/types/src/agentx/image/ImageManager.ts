/**
 * ImageManager - Agent image management
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → [commit] → DerivedImage
 *
 * ImageManager provides:
 * - Access to MetaImages (auto-created from Definitions)
 * - Access to DerivedImages (created from session.commit())
 * - Image lifecycle management
 * - Running agents from images (like `docker run`)
 *
 * @example
 * ```typescript
 * // Get MetaImage for a definition
 * const metaImage = agentx.images.getMetaImage("Translator");
 *
 * // Run agent directly from image (like docker run)
 * const agent = await agentx.images.run(metaImage.imageId);
 *
 * // Or create session first (for user context)
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 * const agent = await session.resume();
 *
 * // List all images
 * const images = await agentx.images.list();
 * ```
 */

import type { Agent } from "~/agent/Agent";
import type { AgentImage, MetaImage } from "~/environment/image";

/**
 * ImageManager - Registry for agent images
 */
export interface ImageManager {
  /**
   * Get an image by ID
   *
   * @param imageId - Image identifier
   * @returns Image or undefined if not found
   */
  get(imageId: string): Promise<AgentImage | undefined>;

  /**
   * Get the MetaImage for a definition
   *
   * MetaImage is auto-created when a definition is registered.
   *
   * @param definitionName - Definition name
   * @returns MetaImage or undefined if definition not found
   *
   * @example
   * ```typescript
   * const metaImage = await agentx.images.getMetaImage("Translator");
   * if (metaImage) {
   *   const session = await agentx.sessions.create(metaImage.imageId, userId);
   * }
   * ```
   */
  getMetaImage(definitionName: string): Promise<MetaImage | undefined>;

  /**
   * List all images
   *
   * @returns Array of all images (MetaImages and DerivedImages)
   */
  list(): Promise<AgentImage[]>;

  /**
   * List images by definition name
   *
   * @param definitionName - Definition name
   * @returns Array of images for the definition
   */
  listByDefinition(definitionName: string): Promise<AgentImage[]>;

  /**
   * Check if an image exists
   *
   * @param imageId - Image identifier
   * @returns true if exists
   */
  exists(imageId: string): Promise<boolean>;

  /**
   * Delete a derived image
   *
   * Note: MetaImages cannot be deleted directly.
   * They are removed when the definition is unregistered.
   *
   * @param imageId - Image identifier
   * @returns true if deleted, false if not found or is MetaImage
   */
  delete(imageId: string): Promise<boolean>;

  /**
   * Run an agent from an image
   *
   * Like `docker run <image>`, creates and starts an agent from the image.
   * The agent will have the definition, config, and messages from the image.
   *
   * For user-specific sessions, use session.resume() instead.
   *
   * @param imageId - Image identifier
   * @param options - Optional configuration
   * @param options.containerId - Container to run in (defaults to auto-created container)
   * @returns Running agent instance
   * @throws Error if image not found
   *
   * @example
   * ```typescript
   * // Simple usage (auto-created default container)
   * const metaImage = await agentx.images.getMetaImage("Translator");
   * const agent = await agentx.images.run(metaImage.imageId);
   *
   * // Multi-tenant usage (explicit container)
   * const container = await agentx.containers.create();
   * const agent = await agentx.images.run(metaImage.imageId, { containerId: container.containerId });
   * ```
   */
  run(imageId: string, options?: { containerId?: string }): Promise<Agent>;
}
