/**
 * MessageReactor
 *
 * User-facing interface for handling Message layer events.
 * All methods are optional - users only implement what they need.
 */

import type {
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";
import type { AgentReactorContext } from "./AgentReactor";

/**
 * Message layer reactor
 *
 * Handles complete messages after they're fully assembled.
 * Use this for chat history, persistence, message processing, etc.
 *
 * @example
 * ```typescript
 * class ChatLogger implements MessageReactor {
 *   onUserMessage(event) {
 *     console.log('[User]', event.data.content);
 *   }
 *
 *   onAssistantMessage(event) {
 *     console.log('[Assistant]', event.data.content);
 *   }
 * }
 * ```
 */
export interface MessageReactor {
  /**
   * Called when a user message is sent
   */
  onUserMessage?(event: UserMessageEvent): void;

  /**
   * Called when an assistant message is completed
   */
  onAssistantMessage?(event: AssistantMessageEvent): void;

  /**
   * Called when a tool use + result is completed
   * This event combines both the tool call and its result
   */
  onToolUseMessage?(event: ToolUseMessageEvent): void;

  /**
   * Called when an error message is emitted
   */
  onErrorMessage?(event: ErrorMessageEvent): void;

  /**
   * Optional lifecycle: Called when reactor is initialized
   * Use this to set up resources (e.g., connect to database)
   */
  onInitialize?(context: AgentReactorContext): void | Promise<void>;

  /**
   * Optional lifecycle: Called when reactor is destroyed
   * Use this to clean up resources (e.g., close connections)
   */
  onDestroy?(): void | Promise<void>;
}
