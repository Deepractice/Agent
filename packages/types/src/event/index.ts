/**
 * Event System - Unified event definitions for AgentX
 *
 * All events extend SystemEvent with:
 * - type: Event type identifier
 * - timestamp: When it happened
 * - data: Event payload
 * - source: Where it came from
 * - category: What kind of event
 * - intent: What it means (notification/request/result)
 * - context: Optional scope information
 *
 * Event Sources:
 * ```
 * SystemEvent
 * │
 * ├── source: "command"       ← API operations (request/response)
 * │   ├── category: "request"    → container_create_request, agent_run_request...
 * │   └── category: "response"   → container_create_response, agent_run_response...
 * │
 * ├── source: "environment"   ← External world (Claude API, Network)
 * │   ├── category: "stream"     → message_start, text_delta, message_stop...
 * │   └── category: "connection" → connected, disconnected, reconnecting
 * │
 * ├── source: "container"     ← Container operations
 * │   └── category: "lifecycle"  → container_created, agent_registered...
 * │
 * ├── source: "session"       ← Session operations
 * │   ├── category: "lifecycle"  → session_created, session_destroyed
 * │   ├── category: "persist"    → session_saved, message_persisted
 * │   └── category: "action"     → session_resumed, session_forked
 * │
 * ├── source: "sandbox"       ← Sandbox resources
 * │   ├── category: "workdir"    → file_read, file_written
 * │   └── category: "mcp"        → tool_execute, mcp_server_connected
 * │
 * └── source: "agent"         ← Agent internal
 *     ├── category: "stream"     → (forwarded from environment)
 *     ├── category: "state"      → state transitions
 *     ├── category: "message"    → complete messages
 *     └── category: "turn"       → conversation turns
 * ```
 */

// ============================================================================
// Base Types
// ============================================================================

export type { SystemEvent, EventSource, EventIntent, EventCategory, EventContext } from "./base";
export { isFromSource, hasIntent, isRequest, isResult, isNotification } from "./base";

// ============================================================================
// Environment Events (External World)
// ============================================================================

export * from "./environment";

// ============================================================================
// Container Events
// ============================================================================

export * from "./container";

// ============================================================================
// Session Events
// ============================================================================

export * from "./session";

// ============================================================================
// Command Events (API Operations - Request/Response)
// ============================================================================

export * from "./command";

// ============================================================================
// Agent Events (Agent Internal - stream/state/message/turn)
// ============================================================================

export * from "./agent";

// ============================================================================
// Error Events (System-wide error notifications)
// ============================================================================

export * from "./error";
