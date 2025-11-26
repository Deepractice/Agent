/**
 * Driver - Input adapter for AgentX Engine
 *
 * A Driver transforms user messages into stream events.
 * This is the business-specific version of Mealy's Source type.
 *
 * Pattern: (userMessage) => AsyncIterable<StreamEvent>
 *
 * Layering:
 * - Mealy Layer: Source<TInput, TRequest> (generic)
 * - Engine Layer: Driver (Source<StreamEventType, UserMessage>)
 * - Framework Layer: defineDriver() (adds lifecycle, config)
 *
 * @example
 * ```typescript
 * import type { Driver } from "@deepractice-ai/agentx-engine";
 *
 * // Simple driver implementation
 * const echoDriver: Driver = async function* (message) {
 *   yield builder.messageStart("msg_1", "echo");
 *   yield builder.textDelta(message.content, 0);
 *   yield builder.messageStop();
 * };
 *
 * // Driver wrapping an AI SDK
 * const claudeDriver: Driver = async function* (message) {
 *   for await (const chunk of claudeSDK.stream(message)) {
 *     yield transformToStreamEvent(chunk);
 *   }
 * };
 * ```
 */

import type { Source } from "@deepractice-ai/agentx-mealy";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import type { UserMessage } from "@deepractice-ai/agentx-types";

/**
 * Driver - Transforms UserMessage into StreamEvents
 *
 * This is the core type for AI SDK integration.
 * Drivers are responsible for:
 * - Receiving user messages
 * - Calling external AI services
 * - Converting responses to StreamEvents
 */
export type Driver = Source<StreamEventType, UserMessage>;

/**
 * DriverDefinition - Named Driver with metadata
 *
 * Use this when you need to identify drivers by name.
 */
export interface DriverDefinition {
  /**
   * Unique name for this driver
   */
  name: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * The driver function
   */
  driver: Driver;
}
