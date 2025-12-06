/**
 * MealyMachine - Pure Mealy Machine Event Processor
 *
 * MealyMachine is a stateless event processor that transforms StreamEvents
 * into higher-level events (state, message, turn events).
 *
 * Key Design:
 * - Engine is a pure Mealy Machine: process(agentId, event) → outputs
 * - Engine does NOT hold driver or presenters (those belong to AgentEngine layer)
 * - Engine manages intermediate processing state per agentId
 * - Multiple agents can share the same MealyMachine instance
 *
 * Type Relationship:
 * ```
 * StreamEvent (from Driver)
 * │
 * └── message_start, text_delta, tool_use_start, message_stop...
 *         ↓ MealyMachine processes
 * AgentOutput (to AgentEngine/Presenter)
 * │
 * ├── StateEvent (conversation_start, conversation_end...)
 * ├── MessageEvent (assistant_message, tool_call_message...)
 * └── TurnEvent (turn_request, turn_response)
 * ```
 *
 * State Management:
 * - Processing state (pendingContents, etc.) is managed internally per agentId
 * - Business data persistence is NOT handled here - that's AgentEngine layer's job
 *
 * Usage:
 * ```typescript
 * const machine = new MealyMachine();
 *
 * // AgentEngine layer coordinates:
 * // 1. Driver produces StreamEvents
 * // 2. MealyMachine processes events
 * // 3. Presenters handle outputs
 *
 * for await (const streamEvent of driver.receive(message)) {
 *   const outputs = machine.process(agentId, streamEvent);
 *   for (const output of outputs) {
 *     presenters.forEach(p => p.present(agentId, output));
 *   }
 * }
 * ```
 */

import {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
} from "./AgentProcessor";
import { MemoryStore } from "~/engine/mealy";
import type { AgentOutput, StreamEvent } from "@agentxjs/types/agent";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("engine/MealyMachine");

/**
 * MealyMachine - Pure Mealy Machine for event processing
 *
 * - Input: StreamEvent (from Driver)
 * - Output: AgentOutput[] (state, message, turn events)
 * - State: Managed internally per agentId
 */
export class MealyMachine {
  private readonly store: MemoryStore<AgentEngineState>;

  constructor() {
    this.store = new MemoryStore<AgentEngineState>();
    logger.debug("MealyMachine initialized");
  }

  /**
   * Process a single driveable event and return output events
   *
   * This is the core Mealy Machine operation:
   * process(agentId, event) → outputs[]
   *
   * @param agentId - The agent identifier (for state isolation)
   * @param event - StreamEvent to process
   * @returns Array of output events (state, message, turn events)
   */
  process(agentId: string, event: StreamEvent): AgentOutput[] {
    const eventType = (event as any).type || "unknown";
    logger.debug("Processing event", { agentId, eventType });

    // Get current state or create initial state
    const isNewState = !this.store.has(agentId);
    let state = this.store.get(agentId) ?? createInitialAgentEngineState();

    if (isNewState) {
      logger.debug("Created initial state for agent", { agentId });
    }

    // Collect all outputs
    const allOutputs: AgentOutput[] = [];

    // Pass-through: original stream event is also an output
    allOutputs.push(event);

    // Process through Mealy Machine
    const [newState, outputs] = agentProcessor(state, event);
    state = newState;

    // Collect processor outputs
    for (const output of outputs) {
      allOutputs.push(output);

      // Re-inject for event chaining (e.g., TurnTracker needs MessageEvents)
      const [chainedState, chainedOutputs] = this.processChained(state, output);
      state = chainedState;
      allOutputs.push(...chainedOutputs);
    }

    // Store updated state
    this.store.set(agentId, state);

    if (outputs.length > 0) {
      logger.debug("Produced outputs", {
        agentId,
        inputEvent: eventType,
        outputCount: allOutputs.length,
        processorOutputs: outputs.length,
      });
    }

    return allOutputs;
  }

  /**
   * Process chained events recursively
   *
   * Some processors produce events that trigger other processors:
   * - MessageAssembler produces MessageEvents
   * - TurnTracker consumes MessageEvents to produce TurnEvents
   */
  private processChained(
    state: AgentEngineState,
    event: AgentOutput
  ): [AgentEngineState, AgentOutput[]] {
    const [newState, outputs] = agentProcessor(state, event);

    if (outputs.length === 0) {
      return [newState, []];
    }

    // Process outputs recursively
    const allOutputs: AgentOutput[] = [...outputs];
    let currentState = newState;

    for (const output of outputs) {
      const [chainedState, chainedOutputs] = this.processChained(currentState, output);
      currentState = chainedState;
      allOutputs.push(...chainedOutputs);
    }

    return [currentState, allOutputs];
  }

  /**
   * Clear state for an agent
   *
   * Call this when an agent is destroyed to free memory.
   */
  clearState(agentId: string): void {
    logger.debug("Clearing state", { agentId });
    this.store.delete(agentId);
  }

  /**
   * Check if state exists for an agent
   */
  hasState(agentId: string): boolean {
    return this.store.has(agentId);
  }
}

/**
 * Factory function to create MealyMachine
 */
export function createMealyMachine(): MealyMachine {
  return new MealyMachine();
}
