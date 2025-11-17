/**
 * @deepractice-ai/agentx-event
 *
 * Complete event system for AgentX.
 * Organized by layers: Stream → State → Message → Exchange
 */

// ===== Base Layer =====
export type { AgentEvent, AgentEventType } from "./base";

// ===== Bus Layer =====
export type { EventBus, EventProducer, EventConsumer, Unsubscribe } from "./bus";

// ===== Types =====
export type { StopReason } from "./types/StopReason";
export { isStopReason } from "./types/StopReason";

// ===== Stream Layer =====
export type {
  StreamEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
} from "./stream";

// ===== State Layer =====
export type {
  StateEventType,
  AgentInitializingStateEvent,
  AgentReadyStateEvent,
  AgentDestroyedStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  TokenUsage,
  ToolPlannedStateEvent,
  ToolUseData,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolResultData,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
} from "./state";

// ===== Message Layer =====
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "./message";

// ===== Exchange Layer =====
export type {
  ExchangeEventType,
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "./exchange";

