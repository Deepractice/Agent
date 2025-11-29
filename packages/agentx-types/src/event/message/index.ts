/**
 * Message Layer
 *
 * Message-centric events representing complete messages.
 * Different perspective from State events.
 *
 * State vs Message:
 * - State Layer: State transitions with attached data
 * - Message Layer: Messages as first-class events
 *
 * Example:
 * - State: ConversationStartStateEvent (state: started, data: userMessage)
 * - Message: UserMessageEvent (focus: the message itself)
 *
 * Both layers can coexist - same data, different viewpoints.
 * Use State for state machine logic, Message for message history/rendering.
 */

// User messages
export type { UserMessageEvent } from "./UserMessageEvent";

// Assistant messages
export type { AssistantMessageEvent } from "./AssistantMessageEvent";

// Tool messages
export type { ToolCallMessageEvent } from "./ToolCallMessageEvent";
export type { ToolResultMessageEvent } from "./ToolResultMessageEvent";

// Error messages
export type { ErrorMessageEvent } from "./ErrorMessageEvent";
// Re-export error types for convenience
export type { ErrorMessage } from "~/message";
export type { AgentError, ErrorSeverity } from "~/error";

/**
 * Union of all Message events
 */
export type MessageEventType =
  | import("./UserMessageEvent").UserMessageEvent
  | import("./AssistantMessageEvent").AssistantMessageEvent
  | import("./ToolCallMessageEvent").ToolCallMessageEvent
  | import("./ToolResultMessageEvent").ToolResultMessageEvent
  | import("./ErrorMessageEvent").ErrorMessageEvent;
