/**
 * EngineEvent - Lightweight event base for AgentEngine domain
 *
 * EngineEvent is the simplified event structure used inside AgentEngine.
 * It only contains: type, timestamp, data
 *
 * This is distinct from the full AgentEvent (in @agentxjs/types/event/agent)
 * which extends SystemEvent with source, category, intent, context.
 *
 * ## Relationship
 *
 * ```
 * AgentEvent (Runtime domain)          EngineEvent (Engine domain)
 * ─────────────────────────────────────────────────────────────────
 * {                                    {
 *   type: "text_delta",                  type: "text_delta",
 *   timestamp: 123,                      timestamp: 123,
 *   data: { text: "Hi" },                data: { text: "Hi" },
 *   source: "agent",          ←── not in Engine
 *   category: "stream",       ←── not in Engine
 *   intent: "notification",   ←── not in Engine
 *   context: { ... },         ←── not in Engine
 * }                                    }
 * ```
 *
 * Use `ToEngineEvent<T>` to convert AgentEvent to EngineEvent.
 */

/**
 * EngineEvent - Lightweight event for Engine internal use
 *
 * Only contains the essential fields:
 * - type: What happened
 * - timestamp: When it happened
 * - data: Event payload
 */
export interface EngineEvent<T extends string = string, D = unknown> {
  /**
   * Event type identifier (e.g., "text_delta", "assistant_message")
   */
  readonly type: T;

  /**
   * Event timestamp (Unix milliseconds)
   */
  readonly timestamp: number;

  /**
   * Event payload data
   */
  readonly data: D;
}

/**
 * ToEngineEvent - Extract lightweight event from full AgentEvent
 *
 * Picks only { type, timestamp, data } from the full SystemEvent structure.
 *
 * @example
 * ```typescript
 * import type { TextDeltaEvent as FullTextDeltaEvent } from "@agentxjs/types/event/agent";
 * import type { ToEngineEvent } from "./EngineEvent";
 *
 * // FullTextDeltaEvent has: type, timestamp, data, source, category, intent, context
 * // TextDeltaEvent only has: type, timestamp, data
 * type TextDeltaEvent = ToEngineEvent<FullTextDeltaEvent>;
 * ```
 */
export type ToEngineEvent<E> = E extends {
  type: infer T;
  timestamp: number;
  data: infer D;
}
  ? EngineEvent<T extends string ? T : string, D>
  : never;

/**
 * ToEngineEventUnion - Convert a union of AgentEvents to EngineEvents
 *
 * @example
 * ```typescript
 * type AgentStreamEvent = TextDeltaEvent | MessageStartEvent | ...;
 * type StreamEvent = ToEngineEventUnion<AgentStreamEvent>;
 * // StreamEvent is now the lightweight version of each event in the union
 * ```
 */
export type ToEngineEventUnion<E> = E extends unknown ? ToEngineEvent<E> : never;
