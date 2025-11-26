/**
 * AgentEngine - Stateless Runtime for AgentX Engine Layer
 *
 * AgentEngine combines Driver, Processor, and Presenters into a complete
 * event processing pipeline. It is completely STATELESS - all intermediate
 * processing state is kept in local variables during a single send() call.
 *
 * Components:
 * - Driver: Input adapter (UserMessage → StreamEvents)
 * - Processor: Event transformer (built-in agentProcessor)
 * - Presenters: Output adapters (events → external systems)
 *
 * State Management:
 * - Engine has NO persistent state
 * - Processor intermediate state (pendingContents, etc.) is local variables
 * - Business data (messages, statistics) is persisted via Presenters
 *
 * Architecture:
 * ```
 * engine.receive(agentId, message)  // Agent receives user message
 *    │
 *    ▼
 * Driver(message) yields StreamEvents
 *    │
 *    ▼
 * For each StreamEvent:
 *    │
 *    ├──→ 1. Present to Presenters (pass-through)
 *    │
 *    ├──→ 2. Processor(state, event) → outputs[]
 *    │       (state is LOCAL variable, not stored!)
 *    │
 *    └──→ 3. For each output:
 *             - Present to Presenters
 *             - Re-inject for event chaining
 *    │
 *    ▼
 * Presenters persist business data:
 *    - MessagePresenter → SessionStore (message history)
 *    - StatePresenter → StateStore (agent state)
 *    - TurnPresenter → StatisticsStore (cost, tokens)
 * ```
 *
 * @example
 * ```typescript
 * import {
 *   AgentEngine,
 *   createStreamPresenter,
 *   createMessagePresenter,
 *   createTurnPresenter,
 * } from '@deepractice-ai/agentx-engine';
 *
 * // Presenters persist to external stores
 * const engine = new AgentEngine({
 *   driver: claudeDriver,
 *   presenters: [
 *     // Forward stream events to SSE
 *     createStreamPresenter((id, event) => sseConnection.send(id, event)),
 *     // Persist messages to session store
 *     createMessagePresenter((id, event) => sessionStore.addMessage(id, event.data)),
 *     // Persist statistics
 *     createTurnPresenter((id, event) => statsStore.addTurn(id, event.data)),
 *   ],
 * });
 *
 * await engine.receive('agent_123', { role: 'user', content: 'Hello!' });
 * ```
 */

import type { AgentOutput, Presenter, PresenterDefinition } from "./Presenter";
import type { Driver } from "./Driver";
import {
  agentProcessor,
  createInitialAgentEngineState,
  type AgentEngineState,
} from "./AgentProcessor";
import type { UserMessage } from "@deepractice-ai/agentx-types";

/**
 * Configuration for AgentEngine
 */
export interface AgentEngineConfig {
  /**
   * Driver - Input adapter that transforms UserMessage into StreamEvents
   */
  driver: Driver;

  /**
   * Presenters to receive outputs
   * Can be Presenter functions or PresenterDefinitions
   *
   * Presenters are responsible for persisting business data:
   * - MessagePresenter → persist to SessionStore
   * - StatePresenter → persist to StateStore
   * - TurnPresenter → persist to StatisticsStore
   */
  presenters?: (Presenter | PresenterDefinition)[];
}

/**
 * AgentEngine - Stateless event processing pipeline
 *
 * Key Design:
 * - Engine is STATELESS - can be shared across requests
 * - Processor intermediate state is LOCAL variables in send()
 * - Business data persistence is handled by Presenters
 * - Multiple Engine instances can share the same database
 */
export class AgentEngine {
  private readonly driver: Driver;
  private readonly presenters: Presenter[];

  constructor(config: AgentEngineConfig) {
    this.driver = config.driver;

    // Normalize presenters to functions
    this.presenters = (config.presenters ?? []).map((p) =>
      typeof p === "function" ? p : p.presenter
    );
  }

  /**
   * Receive a message and process the response
   *
   * This is the main entry point for using AgentEngine.
   * From the agent's perspective, it "receives" a message from the user.
   *
   * All intermediate state is kept in LOCAL variables - nothing is stored
   * in the Engine itself.
   *
   * @param agentId - The agent identifier
   * @param message - The user message received
   */
  async receive(agentId: string, message: UserMessage): Promise<void> {
    // Processor state - LOCAL variable, not persisted!
    // This is the intermediate state for assembling messages, tracking turns, etc.
    // It only lives for the duration of this receive() call.
    let state = createInitialAgentEngineState();

    for await (const event of this.driver(message)) {
      // Process event and update local state
      state = this.processEvent(agentId, state, event);
    }

    // state is discarded here - intermediate state is not persisted
    // Business data (messages, stats) was already persisted by Presenters
  }

  /**
   * Process a single event with given state
   *
   * @param agentId - The agent identifier
   * @param state - Current processor state (local variable from send())
   * @param event - The event to process
   * @returns Updated state
   */
  private processEvent(
    agentId: string,
    state: AgentEngineState,
    event: AgentOutput
  ): AgentEngineState {
    // 1. Pass-through: Present original event to all presenters
    this.present(agentId, event);

    // 2. Process the event
    const [newState, outputs] = agentProcessor(state, event);

    // 3. Handle each output: present and re-inject
    let currentState = newState;
    for (const output of outputs) {
      // Present to all presenters (they handle persistence)
      this.present(agentId, output);

      // Re-inject for event chaining
      // This allows TurnTracker to receive MessageEvents from MessageAssembler
      currentState = this.processReinjected(agentId, currentState, output);
    }

    return currentState;
  }

  /**
   * Process a re-injected event
   *
   * Re-injected events go through the processor to enable event chaining
   * (e.g., TurnTracker needs MessageEvents from MessageAssembler)
   */
  private processReinjected(
    agentId: string,
    state: AgentEngineState,
    event: AgentOutput
  ): AgentEngineState {
    // Process the event
    const [newState, outputs] = agentProcessor(state, event);

    // Handle outputs recursively
    let currentState = newState;
    for (const output of outputs) {
      this.present(agentId, output);
      currentState = this.processReinjected(agentId, currentState, output);
    }

    return currentState;
  }

  /**
   * Present an event to all presenters
   *
   * Presenters are responsible for:
   * - Forwarding events (SSE, WebSocket)
   * - Persisting business data (messages, stats)
   * - Updating UI state
   */
  private present(agentId: string, event: AgentOutput): void {
    for (const presenter of this.presenters) {
      try {
        presenter(agentId, event);
      } catch (error) {
        // Log but don't throw - one presenter failing shouldn't stop others
        console.error(`[AgentEngine] Presenter error:`, error);
      }
    }
  }

  /**
   * Add a presenter dynamically
   */
  addPresenter(presenter: Presenter | PresenterDefinition): void {
    const fn = typeof presenter === "function" ? presenter : presenter.presenter;
    this.presenters.push(fn);
  }

  /**
   * Remove all presenters
   */
  clearPresenters(): void {
    this.presenters.length = 0;
  }
}

/**
 * Factory function to create AgentEngine
 */
export function createAgentEngine(config: AgentEngineConfig): AgentEngine {
  return new AgentEngine(config);
}
