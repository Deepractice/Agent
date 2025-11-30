/**
 * AgentX Event Types
 *
 * Complete event system for AgentX.
 * Organized by layers: Stream → State → Message → Turn
 *
 * ## Design Decision: 4-Layer Architecture
 *
 * Each layer serves different consumers:
 *
 * | Layer   | Consumer                    | Purpose                          |
 * |---------|-----------------------------|---------------------------------|
 * | Stream  | UI (typewriter effect)      | Real-time incremental updates    |
 * | State   | State machine, loading UI   | Track agent lifecycle            |
 * | Message | Chat history, persistence   | Complete conversation records    |
 * | Turn    | Analytics, billing          | Usage metrics and cost tracking  |
 *
 * ## Why Not Flatten?
 *
 * Flattening would force all consumers to handle all event types.
 * The layered approach allows:
 * - UI to only subscribe to Stream events for real-time display
 * - Persistence layer to only handle Message events
 * - Analytics to only process Turn events
 *
 * ## Event Flow
 *
 * ```text
 * Driver.receive()
 *      │ yields
 *      ▼
 * Stream Events (text_delta, tool_call...)
 *      │ Mealy Machine assembles
 *      ▼
 * State Events (conversation_start, tool_executing...)
 *      │
 *      ▼
 * Message Events (assistant_message, tool_call_message...)
 *      │
 *      ▼
 * Turn Events (turn_request, turn_response)
 * ```
 *
 * ## Design Decision: ErrorEvent is Independent
 *
 * Error is NOT part of Message or the 4-layer hierarchy because:
 * 1. Not conversation content - Errors are system notifications
 * 2. SSE transport - Errors need special handling for transmission
 * 3. UI-specific rendering - Error display differs from messages
 *
 * ErrorEvent travels via SSE alongside StreamEvents, bypassing the
 * Mealy Machine processing. Browser receives and displays error UI directly.
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
  InterruptedStreamEvent,
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
  ConversationInterruptedStateEvent,
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
} from "./message";

// ===== Turn Layer =====
export type { TurnEventType, TurnEvent, TurnRequestEvent, TurnResponseEvent } from "./turn";

// ===== Error Layer (Independent, transportable via SSE) =====
export type { ErrorEvent } from "./error";
