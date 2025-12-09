/**
 * createMessageChain - Factory function for creating message handler chains
 *
 * Provides two methods:
 * 1. createMessageChain() - Create default chain with built-in handlers
 * 2. createCustomMessageChain() - Create custom chain with user-provided handlers
 *
 * @example
 * ```ts
 * // Use default chain
 * const chain = createMessageChain();
 *
 * // Use custom chain
 * const customChain = createCustomMessageChain([
 *   new MyCustomHandler(),
 *   new UserMessageHandler(),
 *   new AssistantMessageHandler(),
 * ]);
 * ```
 */

import type { MessageHandler } from "./MessageHandler";
import { UserMessageHandler } from "./UserMessage";
import { AssistantMessageHandler } from "./AssistantMessage";
import { ToolMessageHandler } from "./ToolMessage";
import { ErrorMessageHandler } from "./ErrorMessage";

/**
 * Create default message handler chain
 *
 * Chain order (priority):
 * 1. UserMessageHandler - Most common in user interactions
 * 2. AssistantMessageHandler - Most common in responses
 * 3. ToolMessageHandler - Less frequent but important
 * 4. ErrorMessageHandler - Least frequent
 *
 * @returns Head of the handler chain
 */
export function createMessageChain(): MessageHandler {
  const userHandler = new UserMessageHandler();

  userHandler
    .setNext(new AssistantMessageHandler())
    .setNext(new ToolMessageHandler())
    .setNext(new ErrorMessageHandler());

  return userHandler;
}

/**
 * Create custom message handler chain
 *
 * Allows users to register custom handlers and control the order.
 *
 * @param handlers - Array of handlers (order matters!)
 * @returns Head of the handler chain
 * @throws Error if handlers array is empty
 *
 * @example
 * ```ts
 * const chain = createCustomMessageChain([
 *   new CustomMessageHandler(),  // Check custom types first
 *   new UserMessageHandler(),
 *   new AssistantMessageHandler(),
 * ]);
 * ```
 */
export function createCustomMessageChain(handlers: MessageHandler[]): MessageHandler {
  if (handlers.length === 0) {
    throw new Error("At least one handler is required");
  }

  // Chain all handlers together
  for (let i = 0; i < handlers.length - 1; i++) {
    handlers[i].setNext(handlers[i + 1]);
  }

  return handlers[0];
}
