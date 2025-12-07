/**
 * DriveableEvent - Events from LLM that can drive Agent
 *
 * These are environment events with:
 * - source: "environment"
 * - category: "stream"
 * - intent: "notification"
 *
 * Flow:
 * 1. Receptor receives from Claude SDK
 * 2. Receptor emits DriveableEvent to SystemBus
 * 3. BusDriver listens and forwards to Agent
 * 4. Agent Engine processes the event
 */

import type { SystemEvent } from "../base";
import type { StopReason } from "~/runtime/internal/container/llm/StopReason";

// ============================================================================
// Base Type for Stream Events
// ============================================================================

/**
 * Base interface for all LLM stream events
 *
 * All DriveableEvents have:
 * - source: "environment" (from external LLM)
 * - category: "stream" (streaming output)
 * - intent: "notification" (informational, no action needed)
 * - requestId: correlation with the original request
 * - context: agent/image/session scope (inherited from SystemEvent)
 */
interface BaseStreamEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "environment", "stream", "notification"> {
  /**
   * Content block index (for multi-block responses)
   */
  index?: number;

  /**
   * Request ID for correlating events with the original message_send_request
   */
  requestId?: string;
}

// ============================================================================
// Message Lifecycle Events
// ============================================================================

/**
 * MessageStartEvent - Emitted when streaming message begins
 */
export interface MessageStartEvent
  extends BaseStreamEvent<
    "message_start",
    {
      message: {
        id: string;
        model: string;
      };
    }
  > {}

/**
 * MessageDeltaEvent - Emitted with message-level updates
 */
export interface MessageDeltaEvent
  extends BaseStreamEvent<
    "message_delta",
    {
      usage?: {
        inputTokens: number;
        outputTokens: number;
      };
    }
  > {}

/**
 * MessageStopEvent - Emitted when streaming message completes
 */
export interface MessageStopEvent
  extends BaseStreamEvent<
    "message_stop",
    {
      stopReason?: StopReason;
      stopSequence?: string;
    }
  > {}

// ============================================================================
// Text Content Block Events
// ============================================================================

/**
 * TextContentBlockStartEvent - Text block started
 */
export interface TextContentBlockStartEvent
  extends BaseStreamEvent<"text_content_block_start", Record<string, never>> {
  index: number;
}

/**
 * TextDeltaEvent - Incremental text output
 */
export interface TextDeltaEvent
  extends BaseStreamEvent<
    "text_delta",
    {
      text: string;
    }
  > {}

/**
 * TextContentBlockStopEvent - Text block completed
 */
export interface TextContentBlockStopEvent
  extends BaseStreamEvent<"text_content_block_stop", Record<string, never>> {
  index: number;
}

// ============================================================================
// Tool Use Content Block Events
// ============================================================================

/**
 * ToolUseContentBlockStartEvent - Tool use block started
 */
export interface ToolUseContentBlockStartEvent
  extends BaseStreamEvent<
    "tool_use_content_block_start",
    {
      id: string;
      name: string;
    }
  > {
  index: number;
}

/**
 * InputJsonDeltaEvent - Incremental tool input JSON
 */
export interface InputJsonDeltaEvent
  extends BaseStreamEvent<
    "input_json_delta",
    {
      partialJson: string;
    }
  > {
  index: number;
}

/**
 * ToolUseContentBlockStopEvent - Tool use block completed
 */
export interface ToolUseContentBlockStopEvent
  extends BaseStreamEvent<"tool_use_content_block_stop", Record<string, never>> {
  index: number;
}

// ============================================================================
// Tool Execution Events
// ============================================================================

/**
 * ToolCallEvent - Tool call ready for execution
 */
export interface ToolCallEvent
  extends BaseStreamEvent<
    "tool_call",
    {
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  > {}

/**
 * ToolResultEvent - Tool execution result
 */
export interface ToolResultEvent
  extends BaseStreamEvent<
    "tool_result",
    {
      toolUseId: string;
      result: unknown;
      isError?: boolean;
    }
  > {}

// ============================================================================
// Interrupt Event
// ============================================================================

/**
 * InterruptedEvent - Stream interrupted
 */
export interface InterruptedEvent
  extends BaseStreamEvent<
    "interrupted",
    {
      reason: "user_interrupt" | "timeout" | "error" | "system";
    }
  > {}

// ============================================================================
// Error Event
// ============================================================================

/**
 * ErrorReceivedEvent - Error received from environment (e.g., Claude API error)
 *
 * This event drives the MealyMachine to produce:
 * - error_occurred (StateEvent) → state transitions to "error"
 * - error_message (MessageEvent) → displayed in chat
 */
export interface ErrorReceivedEvent
  extends BaseStreamEvent<
    "error_received",
    {
      /** Error message (human-readable) */
      message: string;
      /** Error code (e.g., "rate_limit_error", "api_error", "overloaded_error") */
      errorCode?: string;
    }
  > {}

// ============================================================================
// Union Type
// ============================================================================

/**
 * DriveableEvent - All events that can drive Agent
 */
export type DriveableEvent =
  // Message lifecycle
  | MessageStartEvent
  | MessageDeltaEvent
  | MessageStopEvent
  // Text content block
  | TextContentBlockStartEvent
  | TextDeltaEvent
  | TextContentBlockStopEvent
  // Tool use content block
  | ToolUseContentBlockStartEvent
  | InputJsonDeltaEvent
  | ToolUseContentBlockStopEvent
  // Tool execution
  | ToolCallEvent
  | ToolResultEvent
  // Interrupt
  | InterruptedEvent
  // Error
  | ErrorReceivedEvent;

/**
 * DriveableEventType - String literal union of all driveable event types
 */
export type DriveableEventType = DriveableEvent["type"];

/**
 * Type guard: is this a DriveableEvent?
 */
export function isDriveableEvent(event: SystemEvent): event is DriveableEvent {
  return event.source === "environment" && event.category === "stream";
}
