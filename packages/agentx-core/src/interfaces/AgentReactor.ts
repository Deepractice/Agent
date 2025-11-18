/**
 * AgentReactor Pattern
 *
 * An AgentReactor is an independent event processing unit that:
 * 1. Subscribes to events from EventBus
 * 2. Processes events and performs business logic
 * 3. Optionally emits new events
 *
 * This is an internal design pattern used by AgentX core.
 * Most users don't need to implement custom AgentReactors.
 */

/**
 * AgentReactorContext
 *
 * Context provided to AgentReactors during initialization.
 * Gives access to EventBus for subscribing to events and emitting new ones.
 */
export interface AgentReactorContext {
  /**
   * Agent unique identifier
   */
  readonly agentId: string;

  /**
   * Session identifier
   */
  readonly sessionId: string;

  /**
   * Event consumer for subscribing to events
   */
  readonly consumer: any;

  /**
   * Event producer for emitting events
   */
  readonly producer: any;
}

/**
 * AgentReactor interface
 */
export interface AgentReactor {
  /**
   * Unique identifier
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Initialize the AgentReactor
   *
   * Subscribe to events and set up internal state here.
   */
  initialize(context: AgentReactorContext): void | Promise<void>;

  /**
   * Destroy the AgentReactor
   *
   * Unsubscribe from events and clean up resources here.
   */
  destroy(): void | Promise<void>;
}
