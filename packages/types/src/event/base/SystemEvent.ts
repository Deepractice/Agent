/**
 * SystemEvent - Base interface for all events in the system
 *
 * Unified Event Structure:
 * ```
 * SystemEvent
 * │
 * │  All events have: type, timestamp, data, source, category, intent
 * │
 * ├── source: "environment"   ← External world (Claude API, Network)
 * │   ├── category: "stream"  → message_start, text_delta, message_stop, tool_call...
 * │   └── category: "connection" → connected, disconnected, reconnecting
 * │
 * ├── source: "container"     ← Container operations
 * │   └── category: "lifecycle" → container_created, container_destroyed, agent_registered...
 * │
 * ├── source: "session"       ← Session operations
 * │   ├── category: "lifecycle" → session_created, session_destroyed
 * │   ├── category: "persist"   → session_saved, message_persisted
 * │   └── category: "action"    → session_resumed, session_forked
 * │
 * ├── source: "sandbox"       ← Sandbox resources
 * │   ├── category: "workdir"   → file_read, file_written
 * │   └── category: "mcp"       → tool_execute, mcp_server_connected
 * │
 * └── source: "agent"         ← Agent internal
 *     ├── category: "stream"    → (forwarded from environment)
 *     ├── category: "state"     → state transitions
 *     ├── category: "message"   → complete messages
 *     └── category: "turn"      → conversation turns
 * ```
 *
 * Design Principles:
 * - Unified: All events share the same base structure
 * - Self-describing: source/category/intent tell you everything
 * - Filterable: Easy to subscribe by source, category, or type
 */

// ============================================================================
// Event Classification Types
// ============================================================================

/**
 * Event source - where the event originated
 */
export type EventSource =
  | "environment" // External world (Claude API, Network)
  | "agent" // Agent internal
  | "session" // Session operations
  | "container" // Container operations
  | "sandbox" // Sandbox resources (Workspace, MCP)
  | "command"; // Command request/response (API operations)

/**
 * Event intent - what the event represents
 */
export type EventIntent =
  | "request" // Request to perform action (may be forwarded or executed)
  | "result" // Result of completed action
  | "notification"; // State change notification (no action needed)

/**
 * Event category - fine-grained classification within source
 */
export type EventCategory =
  // Environment categories
  | "stream" // Streaming output from LLM
  | "connection" // Network connection status
  // Agent categories
  | "state" // State transitions
  | "message" // Complete messages
  | "turn" // Conversation turns
  | "error" // Errors
  // Session categories
  | "lifecycle" // Creation/destruction
  | "persist" // Persistence operations
  | "action" // User actions (resume, fork)
  // Sandbox categories
  | "workdir" // File operations
  | "mcp" // MCP tool operations
  // Mirror categories (browser-server communication)
  | "request" // Request from browser to server
  | "response"; // Response from server to browser

// ============================================================================
// Event Context
// ============================================================================

/**
 * EventContext - Scope information attached to events
 */
export interface EventContext {
  /**
   * Container ID (isolation boundary)
   */
  containerId?: string;

  /**
   * Agent ID (if event is agent-scoped)
   */
  agentId?: string;

  /**
   * Session ID (if event is session-scoped)
   */
  sessionId?: string;

  /**
   * Turn ID (for correlating events within a single turn)
   * A turn = one user message + assistant response cycle
   */
  turnId?: string;

  /**
   * Correlation ID (for request-response tracking)
   */
  correlationId?: string;
}

// ============================================================================
// SystemEvent - The One Event Type
// ============================================================================

/**
 * SystemEvent - Base interface for ALL events in the system
 *
 * Every event has:
 * - type: What happened (e.g., "text_delta", "session_saved")
 * - timestamp: When it happened
 * - data: Event payload
 * - source: Where it came from
 * - category: What kind of event
 * - intent: What it means (notification/request/result)
 * - context: Optional scope information
 */
export interface SystemEvent<
  T extends string = string,
  D = unknown,
  S extends EventSource = EventSource,
  C extends EventCategory = EventCategory,
  I extends EventIntent = EventIntent,
> {
  /**
   * Event type identifier (e.g., "text_delta", "session_saved")
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

  /**
   * Event source - where the event originated
   */
  readonly source: S;

  /**
   * Event category - fine-grained classification
   */
  readonly category: C;

  /**
   * Event intent - what the event represents
   */
  readonly intent: I;

  /**
   * Event context - scope information (optional)
   */
  readonly context?: EventContext;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if event is from a specific source
 */
export function isFromSource<S extends EventSource>(
  event: SystemEvent,
  source: S
): event is SystemEvent<string, unknown, S> {
  return event.source === source;
}

/**
 * Check if event has a specific intent
 */
export function hasIntent<I extends EventIntent>(
  event: SystemEvent,
  intent: I
): event is SystemEvent<string, unknown, EventSource, EventCategory, I> {
  return event.intent === intent;
}

/**
 * Check if event is a request
 */
export function isRequest(event: SystemEvent): boolean {
  return event.intent === "request";
}

/**
 * Check if event is a result
 */
export function isResult(event: SystemEvent): boolean {
  return event.intent === "result";
}

/**
 * Check if event is a notification
 */
export function isNotification(event: SystemEvent): boolean {
  return event.intent === "notification";
}
