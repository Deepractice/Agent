/**
 * Shared world/context for agent BDD tests
 *
 * This module provides a shared context that all step definition files can access.
 * Using a shared context instead of separate Before hooks in each file.
 */

import { setWorldConstructor, World, Before, After } from "@cucumber/cucumber";
import { createAgent } from "@agentxjs/agent";
import type { AgentEngine, AgentOutput, Unsubscribe, UserMessage, StateChange } from "@agentxjs/types/agent";
import { MockDriver, MockPresenter } from "../../mocks/index.js";

/**
 * Custom World class for agent tests
 */
export class AgentWorld extends World {
  // Core components
  driver!: MockDriver;
  presenter!: MockPresenter;
  agent!: AgentEngine;
  agents: AgentEngine[] = [];

  // Event tracking
  receivedEvents: AgentOutput[] = [];
  stateChanges: StateChange[] = [];
  stateTransitions: string[] = [];

  // Subscriber tracking
  subscriberAEvents: AgentOutput[] = [];
  subscriberBEvents: AgentOutput[] = [];
  reactHandlersCalled: Set<string> = new Set();

  // Middleware/Interceptor logs
  middlewareLogs: string[] = [];
  interceptorLogs: string[] = [];

  // Promises and timing
  receivePromises: Array<{ message: string; promise: Promise<void>; rejected?: boolean; error?: Error }> = [];
  messageStartTime: number = 0;
  messageEndTime: number = 0;

  // Unsubscribe functions
  unsubscribe: Unsubscribe | null = null;
  interceptorUnsubscribe: Unsubscribe | null = null;

  // Error tracking
  error: Error | null = null;

  // Lifecycle tracking
  readyHandlerCalled: boolean = false;
  destroyHandlerCalled: boolean = false;

  // Interrupt tracking
  interruptCallCountBefore: number = 0;

  // UserMessage for specific tests
  userMessage: UserMessage | null = null;

  constructor(options: any) {
    super(options);
  }

  /**
   * Reset all state for a new scenario
   */
  reset(): void {
    this.driver = new MockDriver();
    this.presenter = new MockPresenter();
    this.agents = [];
    this.receivedEvents = [];
    this.stateChanges = [];
    this.stateTransitions = [];
    this.subscriberAEvents = [];
    this.subscriberBEvents = [];
    this.reactHandlersCalled = new Set();
    this.middlewareLogs = [];
    this.interceptorLogs = [];
    this.receivePromises = [];
    this.messageStartTime = 0;
    this.messageEndTime = 0;
    this.unsubscribe = null;
    this.interceptorUnsubscribe = null;
    this.error = null;
    this.readyHandlerCalled = false;
    this.destroyHandlerCalled = false;
    this.interruptCallCountBefore = 0;
    this.userMessage = null;
  }

  /**
   * Create an agent with current driver and presenter
   */
  createAgent(): AgentEngine {
    this.agent = createAgent({ driver: this.driver, presenter: this.presenter });
    return this.agent;
  }
}

// Set the custom world constructor
setWorldConstructor(AgentWorld);

// Global Before hook - runs once before each scenario
Before(function (this: AgentWorld) {
  this.reset();
});

// Optional: After hook for cleanup
After(async function (this: AgentWorld) {
  // Clean up any running agents
  if (this.agent) {
    try {
      await this.agent.destroy();
    } catch {
      // Ignore errors during cleanup
    }
  }
  for (const a of this.agents) {
    try {
      await a.destroy();
    } catch {
      // Ignore errors during cleanup
    }
  }
});
