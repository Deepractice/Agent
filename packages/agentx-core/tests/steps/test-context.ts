/**
 * Shared test context for BDD tests
 *
 * Stores state across Given/When/Then steps
 */

import type { AgentService } from "~/AgentService";
import type { AgentLogger } from "~/AgentLogger";
import type { Reactor } from "~/reactor";
import type { AgentEvent } from "@deepractice-ai/agentx-event";
import type { Message } from "@deepractice-ai/agentx-types";

/**
 * Test context shared across all steps
 */
export class TestContext {
  // Agent instance
  agent?: AgentService;

  // Mock driver (imported dynamically)
  driver?: any;

  // Logger
  logger?: AgentLogger;

  // Custom reactors
  customReactors: Reactor[] = [];

  // Event collectors
  events: {
    [eventType: string]: AgentEvent[];
  } = {};

  // Subscription cleanup functions
  unsubscribes: Array<() => void> = [];

  // Messages
  messages: Message[] = [];

  // Error tracking
  errors: Error[] = [];

  // Flags
  initialized = false;
  destroyed = false;

  // Test data
  testData: Record<string, any> = {};

  /**
   * Subscribe to an event type and collect events
   */
  subscribeToEvent(eventType: string): void {
    console.log(`[CONTEXT] Subscribing to event: "${eventType}"`);

    if (!this.agent) {
      console.log(`[CONTEXT] ERROR: Agent not created`);
      throw new Error("Agent not created");
    }

    if (!this.events[eventType]) {
      this.events[eventType] = [];
    }

    const handlerName = `on${this.capitalize(eventType)}`;
    console.log(`[CONTEXT] Handler name: "${handlerName}"`);

    const unsubscribe = this.agent.react({
      [handlerName]: (event: AgentEvent) => {
        console.log(`[CONTEXT] Event received: ${eventType}`, {
          eventType: event.type,
          dataKeys: Object.keys(event.data || {})
        });
        this.events[eventType].push(event);
      },
    });

    this.unsubscribes.push(unsubscribe);
    console.log(`[CONTEXT] Subscribed successfully. Total subscriptions: ${this.unsubscribes.length}`);
  }

  /**
   * Subscribe to all event types
   */
  subscribeToAllEvents(eventTypes: string[]): void {
    eventTypes.forEach((type) => this.subscribeToEvent(type));
  }

  /**
   * Get events of a specific type
   */
  getEvents(eventType: string): AgentEvent[] {
    return this.events[eventType] || [];
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.events = {};
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    // Unsubscribe all handlers first
    try {
      this.unsubscribes.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          // Ignore errors during cleanup
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    this.unsubscribes = [];
  }

  /**
   * Reset context
   */
  reset(): void {
    this.cleanup();
    this.agent = undefined;
    this.driver = undefined;
    this.logger = undefined;
    this.customReactors = [];
    this.events = {};
    this.messages = [];
    this.errors = [];
    this.initialized = false;
    this.destroyed = false;
    this.testData = {};
  }

  /**
   * Capitalize first letter for event handler names
   */
  private capitalize(str: string): string {
    return str
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }
}
