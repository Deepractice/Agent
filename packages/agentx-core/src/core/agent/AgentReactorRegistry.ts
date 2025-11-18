/**
 * AgentReactorRegistry
 *
 * Manages the lifecycle of AgentReactors.
 */

import type { EventBus } from "@deepractice-ai/agentx-event";
import type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";
import { emitError } from "~/utils/emitError";

/**
 * AgentReactorRegistry configuration
 */
export interface AgentReactorRegistryConfig {
  agentId: string;
  sessionId: string;
}

/**
 * AgentReactorRegistry
 *
 * Internal component for managing AgentReactor lifecycle.
 */
export class AgentReactorRegistry {
  private reactors = new Map<string, AgentReactor>();
  private initialized = new Set<string>();
  private initOrder: string[] = [];

  constructor(
    private eventBus: EventBus,
    private config: AgentReactorRegistryConfig
  ) {}

  /**
   * Register a Reactor
   */
  register(reactor: AgentReactor): void {
    if (this.reactors.has(reactor.id)) {
      throw new Error(`AgentReactor already registered: ${reactor.id}`);
    }
    this.reactors.set(reactor.id, reactor);
  }

  /**
   * Register multiple AgentReactors
   */
  registerAll(reactors: AgentReactor[]): void {
    reactors.forEach((r) => this.register(r));
  }

  /**
   * Initialize all AgentReactors
   */
  async initialize(): Promise<void> {
    for (const [id, reactor] of this.reactors) {
      const context: AgentReactorContext = {
        consumer: this.eventBus.createConsumer(),
        producer: this.eventBus.createProducer(),
        agentId: this.config.agentId,
        sessionId: this.config.sessionId,
      };

      try {
        await reactor.initialize(context);
        this.initialized.add(id);
        this.initOrder.push(id);
      } catch (error) {

        // Emit error_message event
        emitError(
          context.producer,
          error instanceof Error ? error : new Error(String(error)),
          "agent",
          {
            agentId: this.config.agentId,
            componentName: `AgentReactorRegistry/${reactor.name}`,
          },
          {
            code: "REACTOR_INIT_ERROR",
            details: { reactorId: id, reactorName: reactor.name },
          }
        );

        throw error;
      }
    }
  }

  /**
   * Destroy all AgentReactors (reverse order)
   */
  async destroy(): Promise<void> {
    const destroyOrder = [...this.initOrder].reverse();

    for (const id of destroyOrder) {
      const reactor = this.reactors.get(id);
      if (!reactor || !this.initialized.has(id)) continue;

      try {
        await reactor.destroy();
        this.initialized.delete(id);
      } catch (error) {
        // Silently ignore destroy errors to ensure all reactors are cleaned up
      }
    }

    this.reactors.clear();
    this.initOrder = [];
  }
}
