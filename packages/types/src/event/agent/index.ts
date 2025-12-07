/**
 * Agent Events - SystemEvent for Agent domain
 *
 * Complete event definitions for Agent, extending SystemEvent with:
 * - source: "agent"
 * - category: "stream" | "state" | "message" | "turn"
 * - intent: "notification"
 *
 * ## Event Categories
 *
 * ```
 * AgentEvent (source: "agent")
 * │
 * ├── category: "stream"   ← Real-time streaming from LLM
 * │   └── TextDeltaEvent, MessageStartEvent, ToolUseStartEvent...
 * │
 * ├── category: "state"    ← State transitions
 * │   └── ConversationStartEvent, ConversationEndEvent, ToolExecutingEvent...
 * │
 * ├── category: "message"  ← Assembled complete messages
 * │   └── UserMessageEvent, AssistantMessageEvent, ToolCallMessageEvent...
 * │
 * └── category: "turn"     ← Turn analytics
 *     └── TurnStartEvent, TurnEndEvent
 * ```
 *
 * ## Relationship with Engine Events
 *
 * Engine uses lightweight events (type, timestamp, data only).
 * Use `ToEngineEvent<T>` to convert AgentEvent to EngineEvent.
 *
 * @packageDocumentation
 */

// Base types
export type { AgentEventCategory, BaseAgentEvent } from "./BaseAgentEvent";

// Stream events
export * from "./stream";

// State events
export * from "./state";

// Message events
export * from "./message";

// Turn events
export * from "./turn";

// Union type
import type { AgentStreamEvent } from "./stream";
import type { AgentStateEvent } from "./state";
import type { AgentMessageEvent } from "./message";
import type { AgentTurnEvent } from "./turn";

/**
 * AgentEvent - All events from Agent domain
 */
export type AgentEvent = AgentStreamEvent | AgentStateEvent | AgentMessageEvent | AgentTurnEvent;

/**
 * Type guard: is this an agent event?
 */
export function isAgentEvent(event: { source?: string }): event is AgentEvent {
  return event.source === "agent";
}
