/**
 * stateEventProcessor
 *
 * Stateless event transformer: Stream Events → State Events
 *
 * Input Events (Stream Layer):
 * - message_start
 * - message_stop
 * - text_content_block_start
 * - text_content_block_stop
 * - tool_use_content_block_start
 * - tool_use_content_block_stop
 * - tool_call
 *
 * Output Events (State Layer):
 * - conversation_start
 * - conversation_responding
 * - conversation_end
 * - tool_planned
 * - tool_executing
 */

import type { Processor, ProcessorDefinition } from "~/mealy";
import type {
  StreamEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ConversationStartStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

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
 * Generate a unique ID
 */
function generateId(): string {
  return `state_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Output event types from StateEventProcessor
 */
export type StateEventProcessorOutput =
  | ConversationStartStateEvent
  | ConversationRespondingStateEvent
  | ConversationEndStateEvent
  | ToolPlannedStateEvent
  | ToolExecutingStateEvent;

/**
 * Input event types for StateEventProcessor
 */
export type StateEventProcessorInput = StreamEventType;

// Removed transitionTo helper - Processor no longer tracks state

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
      return handleMessageDelta(context, input);

    case "message_stop":
      return handleMessageStop(context, input);

    case "text_content_block_start":
      return handleTextContentBlockStart(context, input);

    case "tool_use_content_block_start":
      return handleToolUseContentBlockStart(context, input);

    case "tool_use_content_block_stop":
      return handleToolUseContentBlockStop(context, input);

    case "tool_call":
      return handleToolCall(context, input);

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
  event: MessageStartEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const conversationStartEvent: ConversationStartStateEvent = {
    type: "conversation_start",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: event.timestamp,
    transition: {
      reason: "conversation_started",
      trigger: "message_start",
    },
    data: {
      userMessage: {} as any, // Will be populated by higher-level component
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
  context: Readonly<StateEventProcessorContext>,
  _event: MessageDeltaEvent
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
  event: MessageStopEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const stopReason = event.data.stopReason;

  logger.debug("message_stop received", { stopReason });

  // If stopReason is "tool_use", don't emit conversation_end
  // The conversation continues after tool execution
  if (stopReason === "tool_use") {
    logger.debug("Skipping conversation_end (tool_use in progress)");
    return [context, []];
  }

  // For all other cases (end_turn, max_tokens, etc.), emit conversation_end
  const conversationEndEvent: ConversationEndStateEvent = {
    type: "conversation_end",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: event.timestamp,
    transition: {
      reason: "conversation_completed",
      trigger: "message_stop",
    },
    data: {
      assistantMessage: {} as any, // Will be populated by higher-level component
      durationMs: 0, // Will be calculated by StateMachine or TurnTracker
      durationApiMs: 0,
      numTurns: 0,
      result: "completed",
      totalCostUsd: 0,
      usage: {
        input: 0,
        output: 0,
      },
    },
  };

  return [context, [conversationEndEvent]];
}

/**
 * Handle text_content_block_start event
 *
 * Emits: conversation_responding
 */
function handleTextContentBlockStart(
  context: Readonly<StateEventProcessorContext>,
  event: TextContentBlockStartEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const respondingEvent: ConversationRespondingStateEvent = {
    type: "conversation_responding",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    transition: {
      reason: "assistant_responding",
      trigger: "text_content_block_start",
    },
    data: {},
  };

  return [context, [respondingEvent]];
}

/**
 * Handle tool_use_content_block_start event
 *
 * Emits: tool_planned, tool_executing
 */
function handleToolUseContentBlockStart(
  context: Readonly<StateEventProcessorContext>,
  event: ToolUseContentBlockStartEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  const outputs: StateEventProcessorOutput[] = [];

  // Emit ToolPlannedStateEvent
  const toolPlannedEvent: ToolPlannedStateEvent = {
    type: "tool_planned",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: event.timestamp,
    data: {
      id: event.data.id,
      name: event.data.name,
      input: {},
    },
  };
  outputs.push(toolPlannedEvent);

  // Emit ToolExecutingStateEvent
  const toolExecutingEvent: ToolExecutingStateEvent = {
    type: "tool_executing",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: event.timestamp,
    transition: {
      reason: "tool_planning_started",
      trigger: "tool_use_content_block_start",
    },
    data: {},
  };
  outputs.push(toolExecutingEvent);

  return [context, outputs];
}

/**
 * Handle tool_use_content_block_stop event
 *
 * Pass through - no State Event emitted.
 * StateMachine handles the state transition internally.
 */
function handleToolUseContentBlockStop(
  context: Readonly<StateEventProcessorContext>,
  _event: ToolUseContentBlockStopEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // Pass through - no State Event
  return [context, []];
}

/**
 * Handle tool_call event
 *
 * Pass through - no State Event emitted.
 * StateMachine handles the state transition internally.
 */
function handleToolCall(
  context: Readonly<StateEventProcessorContext>,
  _event: ToolCallEvent
): [StateEventProcessorContext, StateEventProcessorOutput[]] {
  // Pass through - no State Event
  return [context, []];
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
