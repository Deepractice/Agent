/**
 * EnvironmentEvent - Raw external information that the system cares about
 *
 * Design principles:
 * - Only raw streaming materials from external world
 * - Even if SDK assembles tool_call/tool_result, we don't use them
 * - We have our own internal world (Mealy Machine) to assemble
 *
 * On SystemBus, EnvironmentEvent can be enriched with context:
 * - agentId
 * - sessionId
 * - containerId
 *
 * But we don't define a separate RuntimeEvent type for this.
 *
 * @see issues/029-simplified-event-architecture.md
 */

// ============================================================================
// Base EnvironmentEvent Interface
// ============================================================================

/**
 * Base interface for all EnvironmentEvents.
 */
export interface EnvironmentEvent<T extends string = string, D = unknown> {
  readonly type: T;
  readonly timestamp: number;
  readonly data: D;
}

// ============================================================================
// Stream Events - Raw LLM output streaming
// ============================================================================

/**
 * Text chunk data - raw text fragment from LLM
 */
export interface TextChunkData {
  readonly text: string;
}

/**
 * Text chunk from LLM response
 */
export interface TextChunkEvent extends EnvironmentEvent<"text_chunk", TextChunkData> {}

// ============================================================================
// Flow Control Events - Stream lifecycle
// ============================================================================

/**
 * Stream start data
 */
export interface StreamStartData {
  readonly messageId: string;
  readonly model?: string;
}

/**
 * Stream started
 */
export interface StreamStartEvent extends EnvironmentEvent<"stream_start", StreamStartData> {}

/**
 * Stream end data
 */
export interface StreamEndData {
  readonly stopReason: string;
}

/**
 * Stream ended normally
 */
export interface StreamEndEvent extends EnvironmentEvent<"stream_end", StreamEndData> {}

/**
 * Interrupted data
 */
export interface InterruptedData {
  readonly reason: string;
}

/**
 * Stream interrupted by user
 */
export interface InterruptedEvent extends EnvironmentEvent<"interrupted", InterruptedData> {}

// ============================================================================
// Connection Events - Remote environment only
// ============================================================================

/**
 * Connected data (empty)
 */
export interface ConnectedData {}

/**
 * Connection established
 */
export interface ConnectedEvent extends EnvironmentEvent<"connected", ConnectedData> {}

/**
 * Disconnected data
 */
export interface DisconnectedData {
  readonly reason?: string;
}

/**
 * Connection lost
 */
export interface DisconnectedEvent extends EnvironmentEvent<"disconnected", DisconnectedData> {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * All EnvironmentEvent types as string union
 */
export type EnvironmentEventType =
  | "text_chunk"
  | "stream_start"
  | "stream_end"
  | "interrupted"
  | "connected"
  | "disconnected";

/**
 * Union of all concrete EnvironmentEvent types
 */
export type AnyEnvironmentEvent =
  // Stream (raw materials)
  | TextChunkEvent
  // Flow control
  | StreamStartEvent
  | StreamEndEvent
  | InterruptedEvent
  // Connection
  | ConnectedEvent
  | DisconnectedEvent;
