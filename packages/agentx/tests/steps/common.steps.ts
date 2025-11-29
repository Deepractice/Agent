/**
 * Common step definitions shared across all feature files
 *
 * These steps are used by multiple features and need to be defined only once.
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { createAgentX } from "../../src";
import type { AgentXLocal, AgentXRemote } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";
import { createMockDriver } from "../support/MockDriver";

// ===== AgentX Instance Creation =====

Given("a local AgentX instance", function (this: TestWorld) {
  this.agentx = createAgentX();
});

Given("a remote AgentX instance", function (this: TestWorld) {
  this.agentx = createAgentX({
    mode: "remote",
    remote: { serverUrl: "http://localhost:5200/agentx" },
  });
});

// ===== Agent Creation =====

Given("a created agent", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  const definition = local.agents.define({
    name: "TestAgent",
    driver: createMockDriver(),
  });

  this.agent = local.agents.create(definition, {});
  this.agents.push(this.agent);
});

Given("{int} created agents", function (this: TestWorld, count: number) {
  const local = this.agentx as AgentXLocal;

  const definition = local.agents.define({
    name: "TestAgent",
    driver: createMockDriver(),
  });

  for (let i = 0; i < count; i++) {
    const agent = local.agents.create(definition, {});
    this.agents.push(agent);
  }
});

// ===== Common Assertions =====

Then("I should get undefined", function (this: TestWorld) {
  expect(this.result).toBeUndefined();
});

Then("I should get an empty array", function (this: TestWorld) {
  expect(Array.isArray(this.result)).toBe(true);
  expect(this.result.length).toBe(0);
});
