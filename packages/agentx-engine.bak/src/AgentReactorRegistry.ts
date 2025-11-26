/**
 * AgentReactorRegistry
 *
 * Manages the lifecycle of AgentReactors.
 */

import type { EventBus } from "@deepractice-ai/agentx-event";
import type { AgentReactor, AgentReactorContext } from "./AgentReactor";
import { emitError } from "./emitError";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * AgentReactorRegistry configuration
 */
export interface AgentReactorRegistryConfig {
  agentId: string;
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
  private logger: LoggerProvider;

  constructor(
    private eventBus: EventBus,
    private config: AgentReactorRegistryConfig
  ) {
    this.logger = createLogger(`core/agent/AgentReactorRegistry/${config.agentId}`);
    this.logger.debug("ReactorRegistry created", {
      agentId: config.agentId,
    });
  }

  /**
   * Register a Reactor
   */
  register(reactor: AgentReactor): void {
    if (this.reactors.has(reactor.id)) {
      this.logger.error("Reactor already registered", {
        reactorId: reactor.id,
        reactorName: reactor.name,
      });
      throw new Error(`AgentReactor already registered: ${reactor.id}`);
    }
    this.reactors.set(reactor.id, reactor);
    this.logger.debug("Reactor registered", {
      reactorId: reactor.id,
      reactorName: reactor.name,
    });
  }

  /**
   * Register multiple AgentReactors
   */
  registerAll(reactors: AgentReactor[]): void {
    this.logger.debug("Registering multiple reactors", { count: reactors.length });
    reactors.forEach((r) => this.register(r));
  }

  /**
   * Initialize all AgentReactors
   */
  async initialize(): Promise<void> {
    this.logger.info("Initializing all reactors", {
      totalCount: this.reactors.size,
    });

    for (const [id, reactor] of this.reactors) {
      this.logger.debug("Initializing reactor", {
        reactorId: id,
        reactorName: reactor.name,
      });

      const context: AgentReactorContext = {
        consumer: this.eventBus.createConsumer(),
        producer: this.eventBus.createProducer(),
        agentId: this.config.agentId,
      };

      try {
        await reactor.initialize(context);
        this.initialized.add(id);
        this.initOrder.push(id);

        this.logger.info("Reactor initialized successfully", {
          reactorId: id,
          reactorName: reactor.name,
        });
      } catch (error) {
        this.logger.error("Reactor initialization failed", {
          reactorId: id,
          reactorName: reactor.name,
          error: error instanceof Error ? error.message : String(error),
        });

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

    this.logger.info("All reactors initialized", {
      initializedCount: this.initialized.size,
    });
  }

  /**
   * Destroy all AgentReactors (reverse order)
   */
  async destroy(): Promise<void> {
    this.logger.info("Destroying all reactors", {
      totalCount: this.initialized.size,
    });

    const destroyOrder = [...this.initOrder].reverse();

    for (const id of destroyOrder) {
      const reactor = this.reactors.get(id);
      if (!reactor || !this.initialized.has(id)) continue;

      this.logger.debug("Destroying reactor", {
        reactorId: id,
        reactorName: reactor.name,
      });

      try {
        await reactor.destroy();
        this.initialized.delete(id);

        this.logger.debug("Reactor destroyed successfully", {
          reactorId: id,
          reactorName: reactor.name,
        });
      } catch (error) {
        this.logger.warn("Reactor destroy failed (ignored)", {
          reactorId: id,
          reactorName: reactor.name,
          error: error instanceof Error ? error.message : String(error),
        });
        // Silently ignore destroy errors to ensure all reactors are cleaned up
      }
    }

    this.reactors.clear();
    this.initOrder = [];

    this.logger.info("All reactors destroyed");
  }
}
