/**
 * StreamReactor
 *
 * User-facing interface for handling Stream layer events.
 * All methods are optional - users only implement what they need.
 */

import type {
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
} from "@deepractice-ai/agentx-event";
import type { AgentReactorContext } from "./AgentReactor";

/**
 * Stream layer reactor
 *
 * Handles real-time streaming events during LLM response generation.
 * Use this for UI updates like typewriter effects, progress indicators, etc.
 *
 * @example
 * ```typescript
 * class TypewriterEffect implements StreamReactor {
 *   onTextDelta(event) {
 *     process.stdout.write(event.data.text);
 *   }
 * }
 * ```
 */
export interface StreamReactor {
  /**
   * Called when a message starts streaming
   */
  onMessageStart?(event: MessageStartEvent): void;

  /**
   * Called when message metadata changes (usage, stop reason, etc.)
   */
  onMessageDelta?(event: MessageDeltaEvent): void;

  /**
   * Called when message streaming completes
   */
  onMessageStop?(event: MessageStopEvent): void;

  /**
   * Called when a text content block starts
   */
  onTextContentBlockStart?(event: TextContentBlockStartEvent): void;

  /**
   * Called when a text delta arrives (incremental text chunk)
   */
  onTextDelta?(event: TextDeltaEvent): void;

  /**
   * Called when a text content block completes
   */
  onTextContentBlockStop?(event: TextContentBlockStopEvent): void;

  /**
   * Called when a tool use content block starts
   */
  onToolUseContentBlockStart?(event: ToolUseContentBlockStartEvent): void;

  /**
   * Called when tool input JSON delta arrives
   */
  onInputJsonDelta?(event: InputJsonDeltaEvent): void;

  /**
   * Called when a tool use content block completes
   */
  onToolUseContentBlockStop?(event: ToolUseContentBlockStopEvent): void;

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
