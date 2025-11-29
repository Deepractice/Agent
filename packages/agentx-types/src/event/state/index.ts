/**
 * State Layer
 *
 * State transition events representing system state changes.
 * Each event captures a discrete state transition in the agent lifecycle.
 *
 * All events extend StateEvent which provides:
 * - previousState: tracks state transitions forming a state machine chain
 * - transition: metadata about the state transition
 *
 * Most state events have empty data (Record<string, never>) because:
 * - State events focus on state transitions, not data
 * - Data belongs in Message events
 * - Keeps state machine lightweight and focused
 */

// Base state event
export type { StateEvent } from "./StateEvent";

// ===== Agent Lifecycle States =====
export type { AgentInitializingStateEvent } from "./AgentInitializingStateEvent";
export type { AgentReadyStateEvent } from "./AgentReadyStateEvent";
export type { AgentDestroyedStateEvent } from "./AgentDestroyedStateEvent";

// ===== Conversation Lifecycle States =====
export type { ConversationQueuedStateEvent } from "./ConversationQueuedStateEvent";
export type { ConversationStartStateEvent } from "./ConversationStartStateEvent";
export type { ConversationThinkingStateEvent } from "./ConversationThinkingStateEvent";
export type { ConversationRespondingStateEvent } from "./ConversationRespondingStateEvent";
export type { ConversationEndStateEvent } from "./ConversationEndStateEvent";
export type { ConversationInterruptedStateEvent } from "./ConversationInterruptedStateEvent";

// ===== Tool Lifecycle States =====
export type { ToolPlannedStateEvent, ToolUseData } from "./ToolPlannedStateEvent";

export type { ToolExecutingStateEvent } from "./ToolExecutingStateEvent";

export type { ToolCompletedStateEvent, ToolResultData } from "./ToolCompletedStateEvent";

export type { ToolFailedStateEvent } from "./ToolFailedStateEvent";

// ===== Error State =====
export type { ErrorOccurredStateEvent } from "./ErrorOccurredStateEvent";

/**
 * Union of all State events
 */
export type StateEventType =
  | import("./AgentInitializingStateEvent").AgentInitializingStateEvent
  | import("./AgentReadyStateEvent").AgentReadyStateEvent
  | import("./AgentDestroyedStateEvent").AgentDestroyedStateEvent
  | import("./ConversationQueuedStateEvent").ConversationQueuedStateEvent
  | import("./ConversationStartStateEvent").ConversationStartStateEvent
  | import("./ConversationThinkingStateEvent").ConversationThinkingStateEvent
  | import("./ConversationRespondingStateEvent").ConversationRespondingStateEvent
  | import("./ConversationEndStateEvent").ConversationEndStateEvent
  | import("./ConversationInterruptedStateEvent").ConversationInterruptedStateEvent
  | import("./ToolPlannedStateEvent").ToolPlannedStateEvent
  | import("./ToolExecutingStateEvent").ToolExecutingStateEvent
  | import("./ToolCompletedStateEvent").ToolCompletedStateEvent
  | import("./ToolFailedStateEvent").ToolFailedStateEvent
  | import("./ErrorOccurredStateEvent").ErrorOccurredStateEvent;
