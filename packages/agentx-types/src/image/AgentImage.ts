/**
 * AgentImage - Built artifact (persisted snapshot)
 *
 * Part of Docker-style layered architecture:
 * Definition → build → Image → run → Agent
 *
 * AgentImage is the frozen snapshot created by build().
 * Contains everything needed to run an Agent:
 * - Definition snapshot (business config)
 * - Config (runtime config at build time)
 * - Messages (conversation history for resume/fork)
 *
 * @example
 * ```typescript
 * // Build image from definition
 * const image = await agentx.images.build("Translator", { model: "claude-3" });
 *
 * // Run agent from image
 * const agent = agentx.agents.run(image.imageId);
 *
 * // Fork image (with messages)
 * const forkedImage = await session.fork();
 * ```
 */

import type { AgentDefinition } from "~/definition";
import type { UserMessage } from "~/message/UserMessage";
import type { AssistantMessage } from "~/message/AssistantMessage";
import type { ToolCallMessage } from "~/message/ToolCallMessage";
import type { ToolResultMessage } from "~/message/ToolResultMessage";

/**
 * Union type of all message types that can be stored in an Image
 */
export type ImageMessage = UserMessage | AssistantMessage | ToolCallMessage | ToolResultMessage;

/**
 * AgentImage - Immutable snapshot of agent state
 */
export interface AgentImage {
  /**
   * Unique image identifier
   */
  readonly imageId: string;

  /**
   * Frozen definition snapshot
   * Contains the business config at build time
   */
  readonly definition: AgentDefinition;

  /**
   * Frozen runtime config
   * Contains model, apiKey reference, etc. at build time
   */
  readonly config: Record<string, unknown>;

  /**
   * Frozen conversation history
   * Contains all messages for resume/fork capability
   */
  readonly messages: ImageMessage[];

  /**
   * When this image was created
   */
  readonly createdAt: Date;
}
