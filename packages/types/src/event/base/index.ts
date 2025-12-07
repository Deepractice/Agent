/**
 * Base Event Types
 *
 * SystemEvent is the unified base for ALL events in the system.
 * Every event has: type, timestamp, data, source, category, intent, context
 */
export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
  EventContext,
} from "./SystemEvent";

export { isFromSource, hasIntent, isRequest, isResult, isNotification } from "./SystemEvent";
