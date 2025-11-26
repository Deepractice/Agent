/**
 * stateMachineProcessor
 *
 * Pure Mealy transition function that tracks agent state transitions
 * from Stream Layer events.
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

import type { Processor, ProcessorDefinition } from "@deepractice-ai/agentx-mealy";
import type {
  StreamEventType,
  MessageStartEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  ToolUseContentBlockStartEvent,
  ToolCallEvent,
  ConversationStartStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
} from "@deepractice-ai/agentx-event";
import type { AgentState } from "@deepractice-ai/agentx-types";

// ===== State Types =====

/**
 * StateMachineState
 *
 * Tracks the current state of the agent state machine.
 */
export interface StateMachineState {
  /**
   * Current agent state
   */
  currentState: AgentState;

  /**
   * Previous state (for transition tracking)
   */
  previousState: AgentState | null;

  /**
   * Timestamp when the current conversation started
   */
  conversationStartTime: number | null;
}

/**
 * Initial state factory for StateMachine
 */
export function createInitialStateMachineState(): StateMachineState {
  return {
    currentState: "initializing",
    previousState: null,
    conversationStartTime: null,
  };
}

// ===== Processor Implementation =====

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `state_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Output event types from StateMachine
 */
export type StateMachineOutput =
  | ConversationStartStateEvent
  | ConversationRespondingStateEvent
  | ConversationEndStateEvent
  | ToolPlannedStateEvent
  | ToolExecutingStateEvent;

/**
 * Input event types for StateMachine
 */
export type StateMachineInput = StreamEventType;

/**
 * Helper to create new state with transition
 */
function transitionTo(
  state: Readonly<StateMachineState>,
  newState: AgentState
): StateMachineState {
  if (state.currentState === newState) {
    return state as StateMachineState;
  }
  return {
    ...state,
    previousState: state.currentState,
    currentState: newState,
  };
}

/**
 * stateMachineProcessor
 *
 * Pure Mealy transition function for state machine transitions.
 * Pattern: (state, input) => [newState, outputs]
 */
export const stateMachineProcessor: Processor<
  StateMachineState,
  StateMachineInput,
  StateMachineOutput
> = (state, input): [StateMachineState, StateMachineOutput[]] => {
  switch (input.type) {
    case "message_start":
      return handleMessageStart(state, input);

    case "message_stop":
      return handleMessageStop(state, input);

    case "text_content_block_start":
      return handleTextContentBlockStart(state, input);

    case "tool_use_content_block_start":
      return handleToolUseContentBlockStart(state, input);

    case "tool_call":
      return handleToolCall(state, input);

    default:
      // Pass through unhandled events
      return [state, []];
  }
};

/**
 * Handle message_start event
 */
function handleMessageStart(
  state: Readonly<StateMachineState>,
  event: MessageStartEvent
): [StateMachineState, StateMachineOutput[]] {
  const newState = transitionTo(
    { ...state, conversationStartTime: event.timestamp },
    "conversation_active"
  );

  const conversationStartEvent: ConversationStartStateEvent = {
    type: "conversation_start",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    previousState: state.currentState,
    transition: {
      reason: "conversation_started",
      trigger: "message_start",
    },
    data: {
      userMessage: {} as any, // Will be populated by higher-level component
    },
  };

  return [newState, [conversationStartEvent]];
}

/**
 * Handle message_stop event
 */
function handleMessageStop(
  state: Readonly<StateMachineState>,
  event: MessageStopEvent
): [StateMachineState, StateMachineOutput[]] {
  const duration = state.conversationStartTime
    ? event.timestamp - state.conversationStartTime
    : 0;

  const newState: StateMachineState = {
    ...transitionTo(state, "idle"),
    conversationStartTime: null,
  };

  const conversationEndEvent: ConversationEndStateEvent = {
    type: "conversation_end",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    previousState: state.currentState,
    transition: {
      reason: "conversation_completed",
      durationMs: duration,
      trigger: "message_stop",
    },
    data: {
      assistantMessage: {} as any, // Will be populated by higher-level component
      durationMs: duration,
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

  return [newState, [conversationEndEvent]];
}

/**
 * Handle text_content_block_start event
 */
function handleTextContentBlockStart(
  state: Readonly<StateMachineState>,
  event: TextContentBlockStartEvent
): [StateMachineState, StateMachineOutput[]] {
  const newState = transitionTo(state, "responding");

  const respondingEvent: ConversationRespondingStateEvent = {
    type: "conversation_responding",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    previousState: state.currentState,
    transition: {
      reason: "assistant_responding",
      trigger: "text_content_block_start",
    },
    data: {},
  };

  return [newState, [respondingEvent]];
}

/**
 * Handle tool_use_content_block_start event
 */
function handleToolUseContentBlockStart(
  state: Readonly<StateMachineState>,
  event: ToolUseContentBlockStartEvent
): [StateMachineState, StateMachineOutput[]] {
  const newState = transitionTo(state, "planning_tool");

  const outputs: StateMachineOutput[] = [];

  // Emit ToolPlannedStateEvent
  const toolPlannedEvent: ToolPlannedStateEvent = {
    type: "tool_planned",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
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
    timestamp: Date.now(),
    previousState: state.currentState,
    transition: {
      reason: "tool_planning_started",
      trigger: "tool_use_content_block_start",
    },
    data: {},
  };
  outputs.push(toolExecutingEvent);

  return [newState, outputs];
}

/**
 * Handle tool_call event
 */
function handleToolCall(
  state: Readonly<StateMachineState>,
  _event: ToolCallEvent
): [StateMachineState, StateMachineOutput[]] {
  // Transition to awaiting_tool_result
  const newState = transitionTo(state, "awaiting_tool_result");

  // No output events for this transition
  return [newState, []];
}

/**
 * StateMachine Processor Definition
 */
export const stateMachineProcessorDef: ProcessorDefinition<
  StateMachineState,
  StateMachineInput,
  StateMachineOutput
> = {
  name: "StateMachine",
  description: "Tracks agent state transitions",
  initialState: createInitialStateMachineState,
  processor: stateMachineProcessor,
};
