/**
 * Error Event
 *
 * Independent error event type for transmitting errors across SSE.
 * Not part of the 4-layer event hierarchy (Stream/State/Message/Turn).
 *
 * Design:
 * - Error is NOT a Message (messages are conversation content)
 * - Error is a system notification that can be transmitted
 * - SSE forwards: StreamEvent + ErrorEvent
 *
 * Flow:
 * 1. Error occurs (Driver/Core/Platform layer)
 * 2. AgentInstance creates ErrorEvent
 * 3. SSE forwards ErrorEvent to browser
 * 4. Browser UI displays error
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { AgentError } from "~/error/AgentError";

/**
 * ErrorEvent - Transportable error event
 *
 * Contains the full AgentError with category, code, severity, etc.
 */
export interface ErrorEvent extends AgentEvent {
  type: "error";

  /**
   * Error data
   */
  data: {
    /**
     * The structured error that occurred
     */
    error: AgentError;
  };
}
