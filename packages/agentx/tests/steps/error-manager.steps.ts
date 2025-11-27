/**
 * Step definitions for Error Manager feature
 *
 * Tests: agentx.errors API (addHandler, removeHandler)
 * Local mode only - remote mode does not have error manager
 *
 * Note: Common steps like "a local AgentX instance" are defined in common.steps.ts
 */

import { Given, When, Then, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { AgentXLocal, ErrorHandler } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";
import { createMockDriver } from "../support/MockDriver";

// ===== Add Handler =====

When("I add an error handler to agentx.errors", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  const handler: ErrorHandler = {
    handle: (agentId, error, event) => {
      this.errorCalls.push({ agentId, error, event });
    },
  };

  local.errors.addHandler(handler);
  this.errorHandler = handler;
  this.errorHandlers.push(handler);
});

Then("the handler should be registered", function (this: TestWorld) {
  expect(this.errorHandler).toBeDefined();
});

// ===== Error Handler Receives Errors =====

Given("an error handler is registered", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  const handler: ErrorHandler = {
    handle: (agentId, error, event) => {
      this.errorCalls.push({ agentId, error, event });
    },
  };

  local.errors.addHandler(handler);
  this.errorHandler = handler;
});

When("the agent emits an error event", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  const definition = local.agents.define({
    name: "ErrorEmitter",
    driver: createMockDriver(),
  });

  const errorAgent = local.agents.create(definition, {
    shouldError: true,
    errorMessage: "Test error from agent",
  });

  this.agent = errorAgent;
  this.agents.push(errorAgent);

  try {
    await errorAgent.receive("trigger error");
  } catch (error) {
    // Expected
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
});

When("the agent emits an error with context:", async function (this: TestWorld, table: DataTable) {
  const local = this.agentx as AgentXLocal;
  const errorData = table.rowsHash();

  const definition = local.agents.define({
    name: "ContextErrorAgent",
    driver: createMockDriver(),
  });

  const errorAgent = local.agents.create(definition, {
    shouldError: true,
    errorMessage: errorData.message,
  });

  this.agent = errorAgent;
  this.agents.push(errorAgent);

  try {
    await errorAgent.receive("trigger error");
  } catch (error) {
    // Expected
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
});

Then("the error handler should be called", function (this: TestWorld) {
  expect(this.errorHandler).toBeDefined();
});

Then("the handler should receive agentId and error", function (this: TestWorld) {
  expect(this.errorCalls).toBeDefined();
});

// ===== Multiple Handlers =====

Given("{int} error handlers are registered", function (this: TestWorld, count: number) {
  const local = this.agentx as AgentXLocal;

  for (let i = 0; i < count; i++) {
    const handler: ErrorHandler = {
      handle: (agentId, error, event) => {
        this.errorCalls.push({ agentId, error, event, handlerIndex: i });
      },
    };
    local.errors.addHandler(handler);
    this.errorHandlers.push(handler);
  }
});

Then("all {int} handlers should be called", function (this: TestWorld, count: number) {
  expect(this.errorHandlers.length).toBe(count);
});

// ===== Remove Handler =====

When("I remove the error handler", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  local.errors.removeHandler(this.errorHandler!);
});

When("an agent emits an error event", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  const definition = local.agents.define({
    name: "ErrorEmitter",
    driver: createMockDriver(),
  });

  const errorAgent = local.agents.create(definition, {
    shouldError: true,
  });

  this.agents.push(errorAgent);

  try {
    await errorAgent.receive("trigger error");
  } catch (error) {
    // Expected
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
});

Then("the removed handler should NOT be called", function (this: TestWorld) {
  expect(this.errorHandler).toBeDefined();
});

Then("the handler should receive the error context", function (this: TestWorld) {
  expect(this.errorCalls).toBeDefined();
});

// ===== Local Only =====

Then("agentx.errors should be undefined", function (this: TestWorld) {
  expect((this.agentx as any).errors).toBeUndefined();
});
