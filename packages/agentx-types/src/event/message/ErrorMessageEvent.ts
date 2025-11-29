/**
 * Error Message Event (Message Layer)
 *
 * Message view: Represents an error that occurred.
 * Different from ErrorOccurredStateEvent which only marks state transition.
 *
 * State vs Message:
 * - State: ErrorOccurredStateEvent - "entered error state" (state transition)
 * - Message: ErrorMessageEvent - "this error happened" (error details)
 */

import type { AgentEvent } from "../base/AgentEvent";
import type { ErrorMessage } from "~/message";

export interface ErrorMessageEvent extends AgentEvent {
  type: "error_message";

  /**
   * Error message data from agentx-types
   */
  data: ErrorMessage;
}
