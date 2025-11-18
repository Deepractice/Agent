/**
 * StateReactor
 *
 * User-facing interface for handling State layer events.
 * All methods are optional - users only implement what they need.
 */

import type {
  AgentReadyStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
} from "@deepractice-ai/agentx-event";
import type { AgentReactorContext } from "./AgentReactor";

/**
 * State layer reactor
 *
 * Handles state machine transitions and lifecycle events.
 * Use this for UI state management (loading indicators, status display, etc.)
 *
 * @example
 * ```typescript
 * class LoadingIndicator implements StateReactor {
 *   onConversationThinking() {
 *     showSpinner();
 *   }
 *
 *   onConversationResponding() {
 *     hideSpinner();
 *   }
 * }
 * ```
 */
export interface StateReactor {
  /**
   * Called when agent is ready to receive messages
   */
  onAgentReady?(event: AgentReadyStateEvent): void;

  /**
   * Called when a new conversation turn starts
   */
  onConversationStart?(event: ConversationStartStateEvent): void;

  /**
   * Called when agent enters thinking state (processing user input)
   */
  onConversationThinking?(event: ConversationThinkingStateEvent): void;

  /**
   * Called when agent starts responding (generating output)
   */
  onConversationResponding?(event: ConversationRespondingStateEvent): void;

  /**
   * Called when conversation turn completes
   */
  onConversationEnd?(event: ConversationEndStateEvent): void;

  /**
   * Called when a tool use is planned
   */
  onToolPlanned?(event: ToolPlannedStateEvent): void;

  /**
   * Called when a tool starts executing
   */
  onToolExecuting?(event: ToolExecutingStateEvent): void;

  /**
   * Called when a tool execution completes successfully
   */
  onToolCompleted?(event: ToolCompletedStateEvent): void;

  /**
   * Called when a tool execution fails
   */
  onToolFailed?(event: ToolFailedStateEvent): void;

  /**
   * Called when streaming starts
   */
  onStreamStart?(event: StreamStartStateEvent): void;

  /**
   * Called when streaming completes
   */
  onStreamComplete?(event: StreamCompleteStateEvent): void;

  /**
   * Called when an error occurs
   */
  onErrorOccurred?(event: ErrorOccurredStateEvent): void;

  /**
   * Optional lifecycle: Called when reactor is initialized
   * Use this to set up resources (e.g., connect to database)
   */
  onInitialize?(context: AgentReactorContext): void | Promise<void>;

  /**
   * Optional lifecycle: Called when reactor is destroyed
   * Use this to clean up resources (e.g., close connections)
   */
  onDestroy?(): void | Promise<void>;
}
