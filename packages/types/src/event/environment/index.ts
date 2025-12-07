/**
 * Environment Events - External world perception
 *
 * All events from external world (LLM API, Network)
 * - source: "environment"
 * - category: "stream" | "connection"
 */

// Driveable Events (can drive Agent)
export type {
  DriveableEvent,
  DriveableEventType,
  // Message lifecycle
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  // Text content block
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  // Tool use content block
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  // Tool execution
  ToolCallEvent,
  ToolResultEvent,
  // Interrupt
  InterruptedEvent,
  // Error
  ErrorReceivedEvent,
} from "./DriveableEvent";
export { isDriveableEvent } from "./DriveableEvent";

// Connection Events (network status)
export type {
  ConnectionEvent,
  ConnectionEventType,
  ConnectedEvent,
  DisconnectedEvent,
  ReconnectingEvent,
} from "./ConnectionEvent";
export { isConnectionEvent } from "./ConnectionEvent";

// EnvironmentEvent - Union of all environment events
export type EnvironmentEvent =
  | import("./DriveableEvent").DriveableEvent
  | import("./ConnectionEvent").ConnectionEvent;
