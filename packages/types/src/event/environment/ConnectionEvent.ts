/**
 * ConnectionEvent - Network connection status events
 *
 * These events notify about network connection status.
 * They do NOT drive the Agent (not processed by AgentEngine).
 *
 * All ConnectionEvents have:
 * - source: "environment"
 * - category: "connection"
 * - intent: "notification"
 */

import type { SystemEvent } from "../base";

// ============================================================================
// Base Type for Connection Events
// ============================================================================

/**
 * Base interface for all connection events
 */
interface BaseConnectionEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "environment", "connection", "notification"> {}

// ============================================================================
// Connection Events
// ============================================================================

/**
 * ConnectedEvent - Connection established
 */
export interface ConnectedEvent
  extends BaseConnectionEvent<
    "connected",
    {
      url?: string;
      reconnectAttempt?: number;
    }
  > {}

/**
 * DisconnectedEvent - Connection lost
 */
export interface DisconnectedEvent
  extends BaseConnectionEvent<
    "disconnected",
    {
      reason?: string;
      code?: number;
      willReconnect?: boolean;
    }
  > {}

/**
 * ReconnectingEvent - Attempting to reconnect
 */
export interface ReconnectingEvent
  extends BaseConnectionEvent<
    "reconnecting",
    {
      attempt: number;
      maxAttempts?: number;
      delayMs: number;
    }
  > {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * ConnectionEvent - All network status events
 */
export type ConnectionEvent = ConnectedEvent | DisconnectedEvent | ReconnectingEvent;

/**
 * ConnectionEventType - String literal union
 */
export type ConnectionEventType = ConnectionEvent["type"];

/**
 * Type guard: is this a ConnectionEvent?
 */
export function isConnectionEvent(event: SystemEvent): event is ConnectionEvent {
  return event.source === "environment" && event.category === "connection";
}
