/**
 * MessageHandler - Chain of Responsibility Pattern
 *
 * Each handler is responsible for rendering one type of message.
 * If it cannot handle the message, it passes to the next handler in the chain.
 *
 * Benefits:
 * - Open/Closed Principle: Add new types without modifying existing code
 * - Single Responsibility: Each handler handles one message type
 * - Flexible Extension: Support custom handlers and custom chains
 * - Decoupled: Handlers are independent of each other
 *
 * @example
 * ```tsx
 * class CustomHandler extends BaseMessageHandler {
 *   canHandle(message: Message): boolean {
 *     return message.subtype === "custom";
 *   }
 *
 *   protected renderMessage(message: Message): React.ReactNode {
 *     return <CustomMessage message={message} />;
 *   }
 * }
 * ```
 */

import * as React from "react";
import type { Message } from "agentxjs";

/**
 * MessageHandler Interface
 *
 * Each handler in the chain implements this interface.
 */
export interface MessageHandler {
  /**
   * Check if this handler can process the message
   */
  canHandle(message: Message): boolean;

  /**
   * Render the message
   * If this handler cannot process, it passes to the next handler
   */
  render(message: Message): React.ReactNode;

  /**
   * Set the next handler in the chain
   * Returns the next handler for method chaining
   */
  setNext(handler: MessageHandler): MessageHandler;
}

/**
 * BaseMessageHandler Abstract Class
 *
 * Implements the chain logic. Subclasses only need to implement:
 * - canHandle(): Check if message can be handled
 * - renderMessage(): Render the message
 *
 * @example
 * ```tsx
 * export class UserMessageHandler extends BaseMessageHandler {
 *   canHandle(message: Message): boolean {
 *     return message.subtype === "user";
 *   }
 *
 *   protected renderMessage(message: Message): React.ReactNode {
 *     return <UserMessage message={message as UserMessage} />;
 *   }
 * }
 * ```
 */
export abstract class BaseMessageHandler implements MessageHandler {
  private nextHandler?: MessageHandler;

  /**
   * Abstract method: Check if this handler can process the message
   */
  abstract canHandle(message: Message): boolean;

  /**
   * Abstract method: Render the message
   * Called only when canHandle() returns true
   */
  protected abstract renderMessage(message: Message): React.ReactNode;

  /**
   * Set the next handler in the chain
   */
  setNext(handler: MessageHandler): MessageHandler {
    this.nextHandler = handler;
    return handler;
  }

  /**
   * Render the message using chain of responsibility
   */
  render(message: Message): React.ReactNode {
    // If this handler can process, render it
    if (this.canHandle(message)) {
      return this.renderMessage(message);
    }

    // Otherwise, pass to the next handler
    if (this.nextHandler) {
      return this.nextHandler.render(message);
    }

    // No handler can process, return null
    // The UnknownMessage fallback is handled by MessageRenderer
    return null;
  }
}
