/**
 * AgentImage - Built artifact (persisted snapshot)
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *
 * AgentImage is a discriminated union of:
 * - MetaImage: Genesis image (auto-created from Definition, empty messages)
 * - DerivedImage: Committed image (from session.commit(), has messages)
 *
 * Use type narrowing to distinguish:
 * ```typescript
 * if (image.type === 'meta') {
 *   // MetaImage - no parent, empty messages
 * } else {
 *   // DerivedImage - has parentImageId
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Get MetaImage (genesis)
 * const metaImage = await agentx.images.getMetaImage("Translator");
 *
 * // Create session and commit to get DerivedImage
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 * // ... conversation ...
 * const derivedImage = await session.commit();
 *
 * // Fork: create new session from any image
 * const forkedSession = await agentx.sessions.create(derivedImage.imageId, userId);
 * ```
 */

import type { UserMessage } from "~/agent/message/UserMessage";
import type { AssistantMessage } from "~/agent/message/AssistantMessage";
import type { ToolCallMessage } from "~/agent/message/ToolCallMessage";
import type { ToolResultMessage } from "~/agent/message/ToolResultMessage";
import type { MetaImage } from "./MetaImage";
import type { DerivedImage } from "./DerivedImage";

/**
 * Union type of all message types that can be stored in an Image
 */
export type ImageMessage = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage;

/**
 * AgentImage - Discriminated union of MetaImage and DerivedImage
 *
 * Use `image.type` for type narrowing:
 * - 'meta': MetaImage (genesis, no messages)
 * - 'derived': DerivedImage (committed, has messages)
 */
export type AgentImage = MetaImage | DerivedImage;
