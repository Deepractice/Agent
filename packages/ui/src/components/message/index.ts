/**
 * Message Components - Chain of Responsibility Pattern
 *
 * Provides message rendering using extensible handler chains.
 *
 * ## Architecture
 *
 * ```
 * MessageRenderer (entry point)
 *   → MessageHandler chain
 *     → UserMessageHandler → UserMessage
 *     → AssistantMessageHandler → AssistantMessage
 *     → ToolMessageHandler → ToolMessage
 *     → ErrorMessageHandler → ErrorMessage
 *     → (fallback) → UnknownMessage
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * import { MessageRenderer } from "~/components/message";
 *
 * // Render a message
 * <MessageRenderer message={message} />
 * ```
 *
 * ## Extension
 *
 * ```tsx
 * import { createCustomMessageChain, BaseMessageHandler } from "~/components/message";
 *
 * class MyCustomHandler extends BaseMessageHandler {
 *   canHandle(message: Message): boolean {
 *     return message.subtype === "custom";
 *   }
 *
 *   protected renderMessage(message: Message): React.ReactNode {
 *     return <MyCustomMessage message={message} />;
 *   }
 * }
 *
 * const customChain = createCustomMessageChain([
 *   new MyCustomHandler(),
 *   // ... other handlers
 * ]);
 *
 * <MessageRenderer message={message} customChain={customChain} />
 * ```
 */

// Main component
export { MessageRenderer, type MessageRendererProps } from "./MessageRenderer";

// Handler interface and base class
export { BaseMessageHandler, type MessageHandler } from "./MessageHandler";

// Message components with handlers
export { UserMessage, UserMessageHandler, type UserMessageProps } from "./UserMessage";
export {
  AssistantMessage,
  AssistantMessageHandler,
  type AssistantMessageProps,
  type AssistantMessageStatus,
} from "./AssistantMessage";
export { ToolMessage, ToolMessageHandler, type ToolMessageProps } from "./ToolMessage";
export { ErrorMessage, ErrorMessageHandler, type ErrorMessageProps } from "./ErrorMessage";

// Special components (no handlers)
export { UnknownMessage, type UnknownMessageProps } from "./UnknownMessage";

// Utility components
export { MessageAvatar, type MessageAvatarProps } from "./MessageAvatar";
export { MessageContent, type MessageContentProps } from "./MessageContent";

// Factory functions
export { createMessageChain, createCustomMessageChain } from "./createMessageChain";
