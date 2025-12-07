/**
 * stateEventProcessor
 *
 * Stateless event transformer: Stream Events → State Events
 *
 * Input Events (Stream Layer):
 * - message_start
 * - message_stop
 * - text_delta (triggers responding state)
 * - tool_use_start
 * - tool_use_stop
 *
 * Output Events (State Layer):
 * - conversation_start
 * - conversation_responding
 * - conversation_end
 * - tool_planned
 * - tool_executing
 */

import type { Processor, ProcessorDefinition } from "~/engine/mealy";
import type {
  // Input: StreamEvent (from agent layer)
  StreamEvent,
  MessageStartEvent,
  MessageStopEvent,
  ToolUseStartEvent,
  // Output: State events
  ConversationStartEvent,
  ConversationRespondingEvent,
  ConversationEndEvent,
  ConversationInterruptedEvent,
  ToolPlannedEvent,
  ToolExecutingEvent,
  ErrorOccurredEvent,
} from "@agentxjs/types/agent";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/stateEventProcessor");

// ===== State Types =====

/**
 * StateEventProcessorContext
 *
 * Minimal context needed for event transformation logic.
 * Does NOT track agent state - only auxiliary info for decision-making.
 *
 * Currently empty - no context needed as all information comes from events.
 */
export interface StateEventProcessorContext {
  // Empty - all information comes from events
}

/**
 * Initial context factory for StateEventProcessor
 */
export function createInitialStateEventProcessorContext(): StateEventProcessorContext {
  return {};
}

// ===== Processor Implementation =====

/**
 * Output event types from StateEventProcessor
 */
export type StateEventProcessorOutput =
  | ConversationStartEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  | ToolPlannedEvent
  | ToolExecutingEvent
  | ErrorOccurredEvent;

/**
 * Input event types for StateEventProcessor
 */
export type StateEventProcessorInput = StreamEvent;

/**
 * stateEventProcessor
 *
 * Stateless event transformer: Stream Events → State Events
 *
 * Design:
 * - Does NOT track agent state (that's StateMachine's job)
 * - Only maintains auxiliary context (timestamps, etc.)
 * - Emits State Events that StateMachine consumes
 *
 * Pattern: (context, input) => [newContext, outputs]
 */
export const stateEventProcessor: Processor<
  StateEventProcessorContext,
  StateEventProcessorInput,
  StateEventProcessorOutput
> = (context, input): [StateEventProcessorContext, StateEventProcessorOutput[]] => {
  // Log all incoming Stream Events
  logger.debug(`[Stream Event] ${input.type}`, {
    context,
    eventData: "data" in input ? input.data : undefined,
  });

  switch (input.type) {
    case "message_start":
      return handleMessageStart(context, input);

    case "message_delta":
      return handleMessageDelta(context);

    case "message_stop":
      return handleMessageStop(context, input);

    case "text_delta":
      return handleTextDelta(context);

    case "tool_use_start":
      return handleToolUseStart(context, input);

    case "tool_use_stop":
      return handleToolUseStop(context);

    case "error_received":
      return handleErrorReceived(context, input);

    default:
      // Pass through unhandled events
      logger.debug(`[Stream Event] ${input.type} (unhandled)`);
      return [context, []];
  }
};

/**
 * Handle message_start event
 *
 * Emits: conversation_start
 */
function handleMessageStart(
  context: Readonly<StateEventProcessorContext>,
  event: StreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as MessageStartEvent["data"];

  const conversationStartEvent: ConversationStartEvent = {
    type: "conversation_start",
    timestamp: Date.now(),
    data: {
      messageId: data.messageId,
    },
  };

  return [context, [conversationStartEvent]];
}

/**
 * Handle message_delta event
 *
 * No longer needed as stopReason is now in message_stop event.
 * Kept for compatibility with event routing.
 */
function handleMessageDelta(
  context: Readonly<StateEventProcessorContext>
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // No-op: stopReason now comes from message_stop
  return [context, []];
}

/**
 * Handle message_stop event
 *
 * Emits: conversation_end (only if stopReason is NOT "tool_use")
 *
 * This event signals that Claude has finished streaming a message.
 * However, if stopReason is "tool_use", the conversation continues
 * because Claude will execute tools and send more messages.
 */
function handleMessageStop(
  context: Readonly<StateEventProcessorContext>,
  event: StreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as MessageStopEvent["data"];
  const stopReason = data.stopReason;

  logger.debug("message_stop received", { stopReason });

  // If stopReason is "tool_use", don't emit conversation_end
  // The conversation continues after tool execution
  if (stopReason === "tool_use") {
    logger.debug("Skipping conversation_end (tool_use in progress)");
    return [context, []];
  }

  // For all other cases (end_turn, max_tokens, etc.), emit conversation_end
  const conversationEndEvent: ConversationEndEvent = {
    type: "conversation_end",
    timestamp: Date.now(),
    data: {
      reason: "completed",
    },
  };

  return [context, [conversationEndEvent]];
}

/**
 * Handle text_delta event
 *
 * Emits: conversation_responding
 */
function handleTextDelta(
  context: Readonly<StateEventProcessorContext>
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const respondingEvent: ConversationRespondingEvent = {
    type: "conversation_responding",
    timestamp: Date.now(),
    data: {},
  };

  return [context, [respondingEvent]];
}

/**
 * Handle tool_use_start event
 *
 * Emits: tool_planned, tool_executing
 */
function handleToolUseStart(
  context: Readonly<StateEventProcessorContext>,
  event: StreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as ToolUseStartEvent["data"];
  const outputs: StateEventProcessorOutput[] = [];

  // Emit ToolPlannedEvent
  const toolPlannedEvent: ToolPlannedEvent = {
    type: "tool_planned",
    timestamp: Date.now(),
    data: {
      toolId: data.toolCallId,
      toolName: data.toolName,
    },
  };
  outputs.push(toolPlannedEvent);

  // Emit ToolExecutingEvent
  const toolExecutingEvent: ToolExecutingEvent = {
    type: "tool_executing",
    timestamp: Date.now(),
    data: {
      toolId: data.toolCallId,
      toolName: data.toolName,
      input: {},
    },
  };
  outputs.push(toolExecutingEvent);

  return [context, outputs];
}

/**
 * Handle tool_use_stop event
 *
 * Pass through - no State Event emitted.
 * StateMachine handles the state transition internally.
 */
function handleToolUseStop(
  context: Readonly<StateEventProcessorContext>
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // Pass through - no State Event
  return [context, []];
}

/**
 * Handle error_received event
 *
 * Emits: error_occurred
 */
function handleErrorReceived(
  context: Readonly<StateEventProcessorContext>,
  event: StreamEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const data = event.data as { message: string; errorCode?: string };

  const errorOccurredEvent: ErrorOccurredEvent = {
    type: "error_occurred",
    timestamp: Date.now(),
    data: {
      code: data.errorCode || "unknown_error",
      message: data.message,
      recoverable: true,
    },
  };

  return [context, [errorOccurredEvent]];
}

/**
 * StateEvent Processor Definition
 *
 * Stateless event transformer: Stream Events → State Events
 */
export const stateEventProcessorDef: ProcessorDefinition<
  StateEventProcessorContext,
  StateEventProcessorInput,
  StateEventProcessorOutput
> = {
  name: "StateEventProcessor",
  description: "Transform Stream Events into State Events",
  initialState: createInitialStateEventProcessorContext,
  processor: stateEventProcessor,
};
