/**
 * AgentProcessor
 *
 * Combined Mealy processor for the full AgentX engine.
 * Composes MessageAssembler, StateMachine, and TurnTracker processors.
 */

import { combineProcessors, combineInitialStates, type Processor } from "~/mealy";
// Note: StreamEventType and MessageEventType are part of AgentOutput (from Presenter)
// They flow through the system but AgentProcessor doesn't need to import them directly
import {
  messageAssemblerProcessor,
  stateEventProcessor,
  turnTrackerProcessor,
  createInitialMessageAssemblerState,
  createInitialStateEventProcessorContext,
  createInitialTurnTrackerState,
  type MessageAssemblerState,
  type StateEventProcessorContext,
  type TurnTrackerState,
  type MessageAssemblerOutput,
  type StateEventProcessorOutput,
  type TurnTrackerOutput,
} from "./internal";
import type { AgentOutput } from "@deepractice-ai/agentx-types";

/**
 * Combined state type for the full agent engine
 */
export type AgentEngineState = {
  messageAssembler: MessageAssemblerState;
  stateEventProcessor: StateEventProcessorContext;
  turnTracker: TurnTrackerState;
};

/**
 * Input event type for AgentProcessor
 *
 * Accepts:
 * - StreamEventType: Raw stream events from Driver
 * - MessageEventType: Re-injected message events (for TurnTracker)
 *
 * Note: AgentOutput is used because re-injected events can be any output type
 */
export type AgentProcessorInput = AgentOutput;

/**
 * Output event type from AgentProcessor
 *
 * Produces:
 * - MessageAssemblerOutput: Assembled message events
 * - StateEventProcessorOutput: State transition events
 * - TurnTrackerOutput: Turn analytics events
 *
 * Note: StreamEventType is NOT in output - it's passed through by AgentEngine
 */
export type AgentProcessorOutput =
  | MessageAssemblerOutput
  | StateEventProcessorOutput
  | TurnTrackerOutput;

/**
 * Combined processor for the full agent engine
 *
 * This combines:
 * - MessageAssembler: Stream → Message events
 * - StateEventProcessor: Stream → State events
 * - TurnTracker: Message → Turn events
 *
 * Pattern: (state, input) => [newState, outputs]
 * Key insight: State is means, outputs are the goal (Mealy Machine)
 *
 * Note: Raw StreamEvents are NOT output by this processor.
 * The AgentEngine handles pass-through of original events.
 */
export const agentProcessor = combineProcessors<
  AgentEngineState,
  AgentProcessorInput,
  AgentProcessorOutput
>({
  messageAssembler: messageAssemblerProcessor as Processor<
    AgentEngineState["messageAssembler"],
    AgentProcessorInput,
    AgentProcessorOutput
  >,
  stateEventProcessor: stateEventProcessor as Processor<
    AgentEngineState["stateEventProcessor"],
    AgentProcessorInput,
    AgentProcessorOutput
  >,
  turnTracker: turnTrackerProcessor as Processor<
    AgentEngineState["turnTracker"],
    AgentProcessorInput,
    AgentProcessorOutput
  >,
});

/**
 * Initial state factory for the full agent engine
 */
export const createInitialAgentEngineState = combineInitialStates<AgentEngineState>({
  messageAssembler: createInitialMessageAssemblerState,
  stateEventProcessor: createInitialStateEventProcessorContext,
  turnTracker: createInitialTurnTrackerState,
});
