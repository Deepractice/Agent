/**
 * Engine Stream Events (Lightweight)
 *
 * Lightweight stream events for AgentEngine internal use.
 * Derived from full AgentStreamEvent in @agentxjs/types/event/agent.
 */

import type {
  AgentStreamEvent as FullAgentStreamEvent,
  AgentMessageStartEvent as FullMessageStartEvent,
  AgentMessageDeltaEvent as FullMessageDeltaEvent,
  AgentMessageStopEvent as FullMessageStopEvent,
  AgentTextDeltaEvent as FullTextDeltaEvent,
  AgentToolUseStartEvent as FullToolUseStartEvent,
  AgentInputJsonDeltaEvent as FullInputJsonDeltaEvent,
  AgentToolUseStopEvent as FullToolUseStopEvent,
  AgentToolResultEvent as FullToolResultEvent,
  StopReason,
} from "~/event/agent/stream";
import type { ToEngineEvent, ToEngineEventUnion } from "../EngineEvent";

// Re-export StopReason (it's not an event, just a type)
export type { StopReason };

// ============================================================================
// Lightweight Event Types
// ============================================================================

export type MessageStartEvent = ToEngineEvent<FullMessageStartEvent>;
export type MessageDeltaEvent = ToEngineEvent<FullMessageDeltaEvent>;
export type MessageStopEvent = ToEngineEvent<FullMessageStopEvent>;
export type TextDeltaEvent = ToEngineEvent<FullTextDeltaEvent>;
export type ToolUseStartEvent = ToEngineEvent<FullToolUseStartEvent>;
export type InputJsonDeltaEvent = ToEngineEvent<FullInputJsonDeltaEvent>;
export type ToolUseStopEvent = ToEngineEvent<FullToolUseStopEvent>;
export type ToolResultEvent = ToEngineEvent<FullToolResultEvent>;

/**
 * StreamEvent - All lightweight stream events
 */
export type StreamEvent = ToEngineEventUnion<FullAgentStreamEvent>;

/**
 * StreamEventType - String literal union
 */
export type StreamEventType = StreamEvent["type"];
