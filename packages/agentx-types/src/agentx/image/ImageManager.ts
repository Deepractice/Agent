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
 *
 * @example
 * ```typescript
 * // Get MetaImage for a definition
 * const metaImage = agentx.images.getMetaImage("Translator");
 *
 * // Create session from image
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 *
 * // List all images
 * const images = await agentx.images.list();
 * ```
 */

import type { AgentImage, MetaImage } from "~/image";

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
}
