/**
 * Step definitions for Agent Manager feature
 *
 * Tests: agentx.agents API (define, create, get, has, list, destroy, destroyAll)
 *
 * Note: Common steps like "a local AgentX instance" are defined in common.steps.ts
 */

import { Given, When, Then, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { AgentXLocal, AgentDefinition } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";
import { createMockDriver } from "../support/MockDriver";

// ===== Define Agent =====

When("I define an agent with:", function (this: TestWorld, table: DataTable) {
  const local = this.agentx as AgentXLocal;
  const data = table.rowsHash();
  const driver = createMockDriver();
  this.agentDefinition = local.agents.define({
    name: data.name,
    driver,
  });
});

When("I define an agent without name", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  try {
    const driver = createMockDriver();
    this.agentDefinition = local.agents.define({
      name: "",
      driver,
    });
  } catch (error) {
    this.thrownError = error as Error;
  }
});

When("I define an agent without driver", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  try {
    this.agentDefinition = local.agents.define({
      name: "NoDriver",
      driver: undefined as any,
    });
  } catch (error) {
    this.thrownError = error as Error;
  }
});

Then("I should get an AgentDefinition", function (this: TestWorld) {
  expect(this.agentDefinition).toBeDefined();
  expect(this.agentDefinition?.name).toBeDefined();
  expect(this.agentDefinition?.driver).toBeDefined();
});

Then("the definition name should be {string}", function (this: TestWorld, expectedName: string) {
  expect(this.agentDefinition?.name).toBe(expectedName);
});

Then(
  "it should throw error containing {string}",
  function (this: TestWorld, expectedMessage: string) {
    expect(this.thrownError).toBeDefined();
    expect(this.thrownError?.message).toContain(expectedMessage);
  }
);

// ===== Create Agent =====

Given("a defined agent {string}", function (this: TestWorld, agentName: string) {
  const local = this.agentx as AgentXLocal;
  this.agentDefinition = local.agents.define({
    name: agentName,
    driver: createMockDriver(),
  });
});

When("I create an agent with config:", function (this: TestWorld, table: DataTable) {
  const local = this.agentx as AgentXLocal;
  const config = table.rowsHash();
  this.agent = local.agents.create(this.agentDefinition!, config);
  this.agents.push(this.agent);
});

When("I create {int} agents from the same definition", function (this: TestWorld, count: number) {
  const local = this.agentx as AgentXLocal;
  for (let i = 0; i < count; i++) {
    const agent = local.agents.create(this.agentDefinition!, {});
    this.agents.push(agent);
  }
});

Then("an Agent instance should be created", function (this: TestWorld) {
  expect(this.agent).toBeDefined();
  expect(this.agent?.agentId).toBeDefined();
});

Then("the agent should have a unique agentId", function (this: TestWorld) {
  expect(this.agent?.agentId).toBeDefined();
  expect(typeof this.agent?.agentId).toBe("string");
  expect(this.agent?.agentId.length).toBeGreaterThan(0);
});

Then(
  "the agent lifecycle should be {string}",
  function (this: TestWorld, expectedLifecycle: string) {
    expect(this.agent?.lifecycle).toBe(expectedLifecycle);
  }
);

Then("all agents should have different agentIds", function (this: TestWorld) {
  const agentIds = this.agents.map((a) => a.agentId);
  const uniqueIds = new Set(agentIds);
  expect(uniqueIds.size).toBe(this.agents.length);
});

Then("all agents should be running", function (this: TestWorld) {
  for (const agent of this.agents) {
    expect(agent.lifecycle).toBe("running");
  }
});

// ===== Get Agent =====

When("I call agentx.agents.get with the agentId", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  this.result = local.agents.get(this.agent!.agentId);
});

When("I call agentx.agents.get with {string}", function (this: TestWorld, agentId: string) {
  const local = this.agentx as AgentXLocal;
  this.result = local.agents.get(agentId);
});

Then("I should get the same agent instance", function (this: TestWorld) {
  expect(this.result).toBe(this.agent);
});

// ===== Has Agent =====

Then("agentx.agents.has should return true for the agentId", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  const exists = local.agents.has(this.agent!.agentId);
  expect(exists).toBe(true);
});

Then(
  "agentx.agents.has should return false for {string}",
  function (this: TestWorld, agentId: string) {
    const local = this.agentx as AgentXLocal;
    const exists = local.agents.has(agentId);
    expect(exists).toBe(false);
  }
);

// ===== List Agents =====

When("I call agentx.agents.list", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  this.result = local.agents.list();
});

Then("I should get an array of {int} agents", function (this: TestWorld, expectedCount: number) {
  expect(Array.isArray(this.result)).toBe(true);
  expect(this.result.length).toBe(expectedCount);
});

// ===== Destroy Agent =====

When("I call agentx.agents.destroy with the agentId", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  await local.agents.destroy(this.agent!.agentId);
});

When(
  "I call agentx.agents.destroy with {string}",
  async function (this: TestWorld, agentId: string) {
    const local = this.agentx as AgentXLocal;
    try {
      await local.agents.destroy(agentId);
    } catch (error) {
      this.thrownError = error as Error;
    }
  }
);

Then("agentx.agents.has should return false", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  const exists = local.agents.has(this.agent!.agentId);
  expect(exists).toBe(false);
});

Then("agentx.agents.get should return undefined", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  const agent = local.agents.get(this.agent!.agentId);
  expect(agent).toBeUndefined();
});

Then("it should not throw", function (this: TestWorld) {
  expect(this.thrownError).toBeUndefined();
});

// ===== Destroy All =====

When("I call agentx.agents.destroyAll", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  await local.agents.destroyAll();
});

Then("all agents should be destroyed", function (this: TestWorld) {
  for (const agent of this.agents) {
    expect(agent.lifecycle).toBe("destroyed");
  }
});

Then("agentx.agents.list should return empty array", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  const list = local.agents.list();
  expect(list).toEqual([]);
});

// ===== State Change Subscription =====

When("I subscribe to state changes", function (this: TestWorld) {
  this.stateChangeUnsubscribe = this.agent!.onStateChange((change) => {
    this.stateChanges.push(change);
  });
});

Then("the agent state should be {string}", function (this: TestWorld, expectedState: string) {
  expect(this.agent?.state).toBe(expectedState);
});

When("I unsubscribe from state changes", function (this: TestWorld) {
  try {
    this.stateChangeUnsubscribe?.();
  } catch (error) {
    this.thrownError = error as Error;
  }
});

// ===== Batch Event Subscription =====

When("I batch subscribe to events:", function (this: TestWorld, table: DataTable) {
  const eventTypes = table.hashes().map((row) => row.event_type);

  // Build EventHandlerMap dynamically
  const handlers: Record<string, (event: unknown) => void> = {};
  for (const eventType of eventTypes) {
    handlers[eventType] = () => {
      // No-op handler for testing
    };
  }

  this.batchUnsubscribe = this.agent!.on(handlers as any);
});

Given("I batch subscribe to events:", function (this: TestWorld, table: DataTable) {
  const eventTypes = table.hashes().map((row) => row.event_type);

  const handlers: Record<string, (event: unknown) => void> = {};
  for (const eventType of eventTypes) {
    handlers[eventType] = () => {};
  }

  this.batchUnsubscribe = this.agent!.on(handlers as any);
});

Then("I should receive a single unsubscribe function", function (this: TestWorld) {
  // Check either batchUnsubscribe, reactUnsubscribe, or lifecycleUnsubscribe
  const unsub = this.batchUnsubscribe ?? this.reactUnsubscribe ?? this.lifecycleUnsubscribe;
  expect(unsub).toBeDefined();
  expect(typeof unsub).toBe("function");
});

Then("I should receive the unsubscribe function", function (this: TestWorld) {
  // Check stateChangeUnsubscribe, lifecycleUnsubscribe, middlewareUnsubscribe, or interceptorUnsubscribe
  const unsub =
    this.stateChangeUnsubscribe ??
    this.lifecycleUnsubscribe ??
    this.middlewareUnsubscribe ??
    this.interceptorUnsubscribe;
  expect(unsub).toBeDefined();
  expect(typeof unsub).toBe("function");
});

When("I call the batch unsubscribe function", function (this: TestWorld) {
  try {
    this.batchUnsubscribe?.();
  } catch (error) {
    this.thrownError = error as Error;
  }
});

// ===== React API =====

When("I react with handlers:", function (this: TestWorld, table: DataTable) {
  const handlerNames = table.hashes().map((row) => row.handler);

  // Build ReactHandlerMap dynamically
  const handlers: Record<string, (event: unknown) => void> = {};
  for (const handlerName of handlerNames) {
    handlers[handlerName] = () => {
      // No-op handler for testing
    };
  }

  this.reactUnsubscribe = this.agent!.react(handlers as any);
});

Given("I react with handlers:", function (this: TestWorld, table: DataTable) {
  const handlerNames = table.hashes().map((row) => row.handler);

  const handlers: Record<string, (event: unknown) => void> = {};
  for (const handlerName of handlerNames) {
    handlers[handlerName] = () => {};
  }

  this.reactUnsubscribe = this.agent!.react(handlers as any);
});

When("I call the react unsubscribe function", function (this: TestWorld) {
  try {
    this.reactUnsubscribe?.();
  } catch (error) {
    this.thrownError = error as Error;
  }
});

// ===== Lifecycle Hooks =====

When("I subscribe to onReady", function (this: TestWorld) {
  this.lifecycleUnsubscribe = this.agent!.onReady(() => {
    this.onReadyCalled = true;
  });
});

When("I subscribe to onDestroy", function (this: TestWorld) {
  this.lifecycleUnsubscribe = this.agent!.onDestroy(() => {
    this.onDestroyCalled = true;
  });
});

Given("I subscribe to onDestroy", function (this: TestWorld) {
  this.lifecycleUnsubscribe = this.agent!.onDestroy(() => {
    this.onDestroyCalled = true;
  });
});

When("I destroy the agent", async function (this: TestWorld) {
  await this.agent!.destroy();
});

Then("the onReady handler should have been called", function (this: TestWorld) {
  expect(this.onReadyCalled).toBe(true);
});

Then("the onDestroy handler should have been called", function (this: TestWorld) {
  expect(this.onDestroyCalled).toBe(true);
});

// ===== Middleware & Interceptor =====

When("I add a middleware", function (this: TestWorld) {
  this.middlewareUnsubscribe = this.agent!.use(async (message, next) => {
    await next(message);
  });
});

Given("I add a middleware", function (this: TestWorld) {
  this.middlewareUnsubscribe = this.agent!.use(async (message, next) => {
    await next(message);
  });
});

When("I remove the middleware", function (this: TestWorld) {
  try {
    this.middlewareUnsubscribe?.();
  } catch (error) {
    this.thrownError = error as Error;
  }
});

When("I add an interceptor", function (this: TestWorld) {
  this.interceptorUnsubscribe = this.agent!.intercept((event, next) => {
    next(event);
  });
});

Given("I add an interceptor", function (this: TestWorld) {
  this.interceptorUnsubscribe = this.agent!.intercept((event, next) => {
    next(event);
  });
});

When("I remove the interceptor", function (this: TestWorld) {
  try {
    this.interceptorUnsubscribe?.();
  } catch (error) {
    this.thrownError = error as Error;
  }
});
