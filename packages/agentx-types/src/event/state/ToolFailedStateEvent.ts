/**
 * Tool Failed State Event (L2: State Layer)
 *
 * State transition: ToolExecuting → ToolFailed
 *
 * Emitted when a tool execution fails.
 * Represents failure with error information.
 *
 * Aligned with: Claude SDK's tool_result content block (error case)
 */

import type { StateEvent } from "./StateEvent";

export interface ToolFailedStateEvent extends StateEvent {
  type: "tool_failed";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
