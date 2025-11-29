/**
 * Interrupted Stream Event (L1: Stream Layer)
 *
 * Emitted when an agent operation is interrupted by user or system.
 * This signals that the current streaming operation should be stopped.
 *
 * Interrupt reasons:
 * - "user_interrupt": User manually stopped the operation
 * - "timeout": Operation exceeded time limit
 * - "error": System error forced interruption
 * - "system": System-initiated interruption
 */

import type { StreamEvent } from "./StreamEvent";

export interface InterruptedStreamEvent extends StreamEvent {
  type: "interrupted";

  /**
   * Event data
   */
  data: {
    /**
     * Reason why the operation was interrupted
     *
     * - "user_interrupt": User manually stopped (e.g., clicked Stop button)
     * - "timeout": Operation exceeded configured time limit
     * - "error": System error forced interruption
     * - "system": System-initiated interruption
     */
    reason: "user_interrupt" | "timeout" | "error" | "system";
  };
}
