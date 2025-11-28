/**
 * turnTrackerProcessor
 *
 * Pure Mealy transition function that tracks request-response turn pairs.
 *
 * Input Events:
 * - user_message (Message Layer)
 * - message_stop (Stream Layer - contains stop reason)
 * - assistant_message (Message Layer)
 *
 * Output Events (Turn Layer):
 * - turn_request
 * - turn_response
 */

import type { Processor, ProcessorDefinition } from "~/mealy";
import type {
  StreamEventType,
  MessageStopEvent,
  UserMessageEvent,
  TurnRequestEvent,
  TurnResponseEvent,
  MessageEventType,
  TokenUsage,
  UserMessage,
} from "@deepractice-ai/agentx-types";

// ===== State Types =====

/**
 * Pending turn tracking
 */
export interface PendingTurn {
  turnId: string;
  userMessage: UserMessage;
  requestedAt: number;
}

/**
 * TurnTrackerState
 *
 * Tracks the current turn state.
 */
export interface TurnTrackerState {
  /**
   * Currently pending turn (waiting for response)
   */
  pendingTurn: PendingTurn | null;

  /**
   * Cost per input token (USD)
   */
  costPerInputToken: number;

  /**
   * Cost per output token (USD)
   */
  costPerOutputToken: number;
}

/**
 * Initial state factory for TurnTracker
 */
export function createInitialTurnTrackerState(): TurnTrackerState {
  return {
    pendingTurn: null,
    costPerInputToken: 0.000003, // $3 per 1M tokens
    costPerOutputToken: 0.000015, // $15 per 1M tokens
  };
}

// ===== Processor Implementation =====

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Output event types from TurnTracker
 */
export type TurnTrackerOutput = TurnRequestEvent | TurnResponseEvent;

/**
 * Input event types for TurnTracker
 * Accepts both Stream and Message layer events
 */
export type TurnTrackerInput = StreamEventType | MessageEventType;

/**
 * Calculate cost from token usage
 */
function calculateCost(
  usage: TokenUsage,
  costPerInputToken: number,
  costPerOutputToken: number
): number {
  const inputCost = usage.input * costPerInputToken;
  const outputCost = usage.output * costPerOutputToken;
  return inputCost + outputCost;
}

/**
 * turnTrackerProcessor
 *
 * Pure Mealy transition function for turn tracking.
 * Pattern: (state, input) => [newState, outputs]
 */
export const turnTrackerProcessor: Processor<
  TurnTrackerState,
  TurnTrackerInput,
  TurnTrackerOutput
> = (state, input): [TurnTrackerState, TurnTrackerOutput[]] => {
  switch (input.type) {
    case "user_message":
      return handleUserMessage(state, input);

    case "message_stop":
      return handleMessageStop(state, input);

    case "assistant_message":
      // Turn completion is handled in message_stop
      // This handler is kept for potential future use
      return [state, []];

    default:
      return [state, []];
  }
};

/**
 * Handle user_message event
 */
function handleUserMessage(
  state: Readonly<TurnTrackerState>,
  event: UserMessageEvent
): [TurnTrackerState, TurnTrackerOutput[]] {
  const turnId = generateId();

  const pendingTurn: PendingTurn = {
    turnId,
    userMessage: event.data,
    requestedAt: event.timestamp,
  };

  const turnRequestEvent: TurnRequestEvent = {
    type: "turn_request",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    turnId,
    data: {
      userMessage: event.data,
      requestedAt: event.timestamp,
    },
  };

  return [
    {
      ...state,
      pendingTurn,
    },
    [turnRequestEvent],
  ];
}

/**
 * Handle message_stop event
 */
function handleMessageStop(
  state: Readonly<TurnTrackerState>,
  event: MessageStopEvent
): [TurnTrackerState, TurnTrackerOutput[]] {
  if (!state.pendingTurn) {
    return [state, []];
  }

  const stopReason = event.data.stopReason;

  // Complete turn based on stop reason
  // - "end_turn": Normal completion (no tool use)
  // - "tool_use": Tool calling in progress, DON'T complete yet
  // - "max_tokens": Hit token limit, complete turn
  // - "stop_sequence": Hit stop sequence, complete turn
  if (stopReason === "end_turn" || stopReason === "max_tokens" || stopReason === "stop_sequence") {
    return completeTurn(state, event.agentId, event.timestamp);
  }

  // For tool_use, don't complete turn yet
  return [state, []];
}

/**
 * Complete the turn and emit TurnResponseEvent
 */
function completeTurn(
  state: Readonly<TurnTrackerState>,
  agentId: string,
  completedAt: number
): [TurnTrackerState, TurnTrackerOutput[]] {
  if (!state.pendingTurn) {
    return [state, []];
  }

  const { turnId, requestedAt } = state.pendingTurn;
  const duration = completedAt - requestedAt;

  const usage = { input: 0, output: 0 };
  const cost = calculateCost(usage, state.costPerInputToken, state.costPerOutputToken);

  const turnResponseEvent: TurnResponseEvent = {
    type: "turn_response",
    uuid: generateId(),
    agentId,
    timestamp: Date.now(),
    turnId,
    data: {
      assistantMessage: {
        id: generateId(),
        role: "assistant",
        subtype: "assistant",
        content: "",
        timestamp: completedAt,
      },
      respondedAt: completedAt,
      durationMs: duration,
      usage,
      costUsd: cost,
    },
  };

  return [
    {
      ...state,
      pendingTurn: null,
    },
    [turnResponseEvent],
  ];
}

/**
 * TurnTracker Processor Definition
 */
export const turnTrackerProcessorDef: ProcessorDefinition<
  TurnTrackerState,
  TurnTrackerInput,
  TurnTrackerOutput
> = {
  name: "TurnTracker",
  description: "Tracks request-response turn pairs",
  initialState: createInitialTurnTrackerState,
  processor: turnTrackerProcessor,
};
