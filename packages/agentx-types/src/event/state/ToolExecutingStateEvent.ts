/**
 * Tool Executing State Event (L2: State Layer)
 *
 * State transition: ToolPlanned → ToolExecuting
 *
 * Emitted when tool execution begins.
 * Represents the active execution phase.
 *
 * Important for long-running tools to provide user feedback.
 */

import type { StateEvent } from "./StateEvent";

export interface ToolExecutingStateEvent extends StateEvent {
  type: "tool_executing";

  /**
   * Event data (empty - state transition only)
   */
  data: Record<string, never>;
}
