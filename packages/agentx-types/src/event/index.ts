/**
 * AgentX Event Types
 *
 * Complete event system for AgentX.
 * Organized by layers: Stream → State → Message → Turn
 */

// ===== Base Layer =====
export type { AgentEvent, AgentEventType } from "./base";

// ===== Types =====
export type { StopReason } from "~/llm/StopReason";
export { isStopReason } from "~/llm/StopReason";

// ===== Stream Layer =====
export type {
  StreamEventType,
  StreamEvent,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "./stream";

// ===== State Layer =====
export type {
  StateEventType,
  StateEvent,
  AgentInitializingStateEvent,
  AgentReadyStateEvent,
  AgentDestroyedStateEvent,
  ConversationQueuedStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolUseData,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolResultData,
  ToolFailedStateEvent,
  ErrorOccurredStateEvent,
} from "./state";

// ===== Message Layer =====
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
  ErrorMessageEvent,
} from "./message";

// ===== Turn Layer =====
export type { TurnEventType, TurnEvent, TurnRequestEvent, TurnResponseEvent } from "./turn";
