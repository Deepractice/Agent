/**
 * Type Guards
 *
 * Runtime type checking functions for Message and ContentPart types.
 */

// Message guards
export {
  isUserMessage,
  isAssistantMessage,
  isSystemMessage,
  isToolCallMessage,
  isToolResultMessage,
  isErrorMessage,
} from "./MessageGuards";

// ContentPart guards
export {
  isTextPart,
  isThinkingPart,
  isImagePart,
  isFilePart,
  isToolCallPart,
  isToolResultPart,
} from "./ContentPartGuards";

// Event guards
export { isStateEvent, isMessageEvent, isTurnEvent, isStreamEvent } from "./EventGuards";
