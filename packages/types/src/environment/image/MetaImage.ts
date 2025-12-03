/**
 * MetaImage - Genesis image (auto-created from Definition)
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → [commit] → DerivedImage
 *
 * MetaImage is the default image created when a Definition is registered.
 * It represents the "genesis state" with no user conversation history.
 *
 * Characteristics:
 * - One-to-one relationship with Definition
 * - messages is always empty (no pre-trained content)
 * - Cannot be deleted while Definition exists
 * - imageId follows pattern: `meta_${definitionName}`
 *
 * @example
 * ```typescript
 * // MetaImage is auto-created when Definition is registered
 * agentx.definitions.register(TranslatorDef);
 *
 * // Get the MetaImage
 * const metaImage = await agentx.images.getMetaImage("Translator");
 *
 * // Create session from MetaImage
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 * ```
 */

import type { AgentDefinition } from "~/environment/definition";

/**
 * MetaImage - Genesis image with empty message history
 */
export interface MetaImage {
  /**
   * Discriminator for type narrowing
   */
  readonly type: "meta";

  /**
   * Unique image identifier
   * Pattern: `meta_${definitionName}`
   */
  readonly imageId: string;

  /**
   * Source definition name
   */
  readonly definitionName: string;

  /**
   * Frozen definition snapshot
   * Contains the business config at registration time
   */
  readonly definition: AgentDefinition;

  /**
   * Frozen runtime config
   * Contains model, apiKey reference, etc. at build time
   */
  readonly config: Record<string, unknown>;

  /**
   * Message history - always empty for MetaImage
   * MetaImage represents genesis state with no conversation
   */
  readonly messages: readonly [];

  /**
   * When this image was created (same as Definition registration time)
   */
  readonly createdAt: Date;
}
