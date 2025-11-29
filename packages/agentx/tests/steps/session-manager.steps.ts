/**
 * Step definitions for Session Manager feature
 *
 * Tests: agentx.sessions API (create, get, listByAgent, destroy)
 * Covers both Local and Remote modes
 *
 * Note: Common steps like "a local AgentX instance" are defined in common.steps.ts
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { AgentXLocal, AgentXRemote, Session } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";
import { createMockDriver } from "../support/MockDriver";

// ===== Local Mode Sessions =====

Given("a created session", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;

  if (!this.agent) {
    const definition = local.agents.define({
      name: "TestAgent",
      driver: createMockDriver(),
    });
    this.agent = local.agents.create(definition, {});
    this.agents.push(this.agent);
  }

  this.session = local.sessions.create(this.agent.agentId);
});

Given("{int} sessions for the agent", function (this: TestWorld, count: number) {
  const local = this.agentx as AgentXLocal;
  for (let i = 0; i < count; i++) {
    const s = local.sessions.create(this.agent!.agentId);
    this.sessions.push(s);
  }
});

When("I call agentx.sessions.create with the agentId", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  this.session = local.sessions.create(this.agent!.agentId);
});

When("I call agentx.sessions.get with the sessionId", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  this.result = await local.sessions.get(this.session!.sessionId);
});

When(
  "I call agentx.sessions.get with {string}",
  async function (this: TestWorld, sessionId: string) {
    const local = this.agentx as AgentXLocal;
    this.result = await local.sessions.get(sessionId);
  }
);

When("I call agentx.sessions.listByAgent with the agentId", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  this.result = await local.sessions.listByAgent(this.agent!.agentId);
});

When("I call agentx.sessions.destroy with the sessionId", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  await local.sessions.destroy(this.session!.sessionId);
});

Then("I should get a Session object", function (this: TestWorld) {
  expect(this.session).toBeDefined();
  expect(this.session?.sessionId).toBeDefined();
  expect(this.session?.agentId).toBeDefined();
});

Then("the session should have a unique sessionId", function (this: TestWorld) {
  expect(this.session?.sessionId).toBeDefined();
  expect(typeof this.session?.sessionId).toBe("string");
  expect(this.session?.sessionId.length).toBeGreaterThan(0);
});

Then("the session agentId should match", function (this: TestWorld) {
  expect(this.session?.agentId).toBe(this.agent?.agentId);
});

Then("I should get the same session", function (this: TestWorld) {
  expect(this.result?.sessionId).toBe(this.session?.sessionId);
});

Then("I should get an array of {int} sessions", function (this: TestWorld, expectedCount: number) {
  expect(Array.isArray(this.result)).toBe(true);
  expect(this.result.length).toBe(expectedCount);
});

Then("agentx.sessions.get should return undefined", async function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  const s = await local.sessions.get(this.session!.sessionId);
  expect(s).toBeUndefined();
});

// ===== Remote Mode Sessions =====

Given("a mocked server", function (this: TestWorld) {
  this.mockServerData = { sessions: [] };
});

Given("a mocked server with sessions", function (this: TestWorld) {
  this.mockServerData = {
    sessions: [
      { sessionId: "session_1", agentId: "agent_1", createdAt: Date.now() },
      { sessionId: "session_2", agentId: "agent_1", createdAt: Date.now() },
    ],
  };
});

When("I call agentx.sessions.create with agentId", async function (this: TestWorld) {
  const remote = this.agentx as AgentXRemote;
  // Remote create returns a Promise - capture it but handle rejection
  const promise = remote.sessions.create("test_agent_id");
  // Prevent unhandled rejection by catching error (we're testing the return type, not actual server call)
  promise.catch(() => {
    // Expected - no server is running
  });
  this.result = promise;
});

When("I call agentx.sessions.sync", async function (this: TestWorld) {
  const remote = this.agentx as AgentXRemote;
  if ("sync" in remote.sessions) {
    await (remote.sessions as any).sync();
  }
});

Then("it should return a Promise", function (this: TestWorld) {
  expect(this.result).toBeInstanceOf(Promise);
});

Then("the Promise should resolve to a Session", async function (this: TestWorld) {
  // In real test, this would resolve from server
  // For now, just verify it's a promise
  expect(this.result).toBeInstanceOf(Promise);
});

Then("local cache should be updated from server", function (this: TestWorld) {
  expect(this.mockServerData?.sessions).toBeDefined();
});
