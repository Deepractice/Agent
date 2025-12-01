/**
 * Image Module - Docker-style built artifacts
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *
 * ## Image Types
 *
 * | Type         | Description                          | messages     |
 * |--------------|--------------------------------------|--------------|
 * | MetaImage    | Genesis (auto from Definition)       | always []    |
 * | DerivedImage | Committed (from session.commit())    | has history  |
 *
 * ## Type Narrowing
 *
 * ```typescript
 * function processImage(image: AgentImage) {
 *   if (image.type === 'meta') {
 *     // MetaImage: definitionName, no parentImageId
 *   } else {
 *     // DerivedImage: has parentImageId
 *   }
 * }
 * ```
 *
 * ## Typical Flow
 *
 * ```typescript
 * // 1. Register definition (auto-creates MetaImage)
 * agentx.definitions.register(TranslatorDef);
 *
 * // 2. Get MetaImage
 * const metaImage = await agentx.images.getMetaImage("Translator");
 *
 * // 3. Create session from MetaImage
 * const session = await agentx.sessions.create(metaImage.imageId, userId);
 *
 * // 4. Conversation happens...
 * await session.agent.receive("Hello");
 *
 * // 5. Commit to create DerivedImage
 * const snapshot = await session.commit();
 *
 * // 6. Fork: create session from DerivedImage
 * const forked = await agentx.sessions.create(snapshot.imageId, userId);
 * ```
 */

export type { MetaImage } from "./MetaImage";
export type { DerivedImage } from "./DerivedImage";
export type { AgentImage, ImageMessage } from "./AgentImage";
