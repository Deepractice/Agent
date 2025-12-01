/**
 * DerivedImage - Image created from session.commit()
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → [commit] → DerivedImage
 *
 * DerivedImage is created when a Session commits its state.
 * It captures the conversation history for resume/fork capability.
 *
 * Characteristics:
 * - Always has a parentImageId (MetaImage or another DerivedImage)
 * - messages contains the committed conversation history
 * - Can be used as base for new Sessions (fork capability)
 *
 * @example
 * ```typescript
 * // Create session from MetaImage
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 *
 * // ... conversation happens ...
 *
 * // Commit session to create DerivedImage
 * const derivedImage = await session.commit();
 *
 * // Fork: create new session from DerivedImage
 * const forkedSession = await agentx.sessions.create(derivedImage.imageId, userId);
 * ```
 */

import type { AgentDefinition } from "~/definition";
import type { ImageMessage } from "./AgentImage";

/**
 * DerivedImage - Image with committed conversation history
 */
export interface DerivedImage {
  /**
   * Discriminator for type narrowing
   */
  readonly type: "derived";

  /**
   * Unique image identifier
   * Pattern: `img_${nanoid()}`
   */
  readonly imageId: string;

  /**
   * Parent image this was derived from
   * Can be MetaImage or another DerivedImage
   */
  readonly parentImageId: string;

  /**
   * Source definition name (inherited from parent)
   */
  readonly definitionName: string;

  /**
   * Frozen definition snapshot
   * Contains the business config at commit time
   */
  readonly definition: AgentDefinition;

  /**
   * Frozen runtime config
   * Contains model, apiKey reference, etc. at commit time
   */
  readonly config: Record<string, unknown>;

  /**
   * Committed conversation history
   * Contains: parent.messages + session.messages
   */
  readonly messages: ImageMessage[];

  /**
   * When this image was created (commit time)
   */
  readonly createdAt: Date;
}
