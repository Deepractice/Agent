/**
 * Error Occurred State Event (L2: State Layer)
 *
 * State transition: AnyState → ErrorOccurred
 *
 * Emitted when an error occurs and system enters error state.
 * Represents the state transition only, not the error details.
 *
 * Error details should be in ErrorMessageEvent (L3: Message Layer).
 */

import type { StateEvent } from "./StateEvent";

export interface ErrorOccurredStateEvent extends StateEvent {
  type: "error_occurred";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
