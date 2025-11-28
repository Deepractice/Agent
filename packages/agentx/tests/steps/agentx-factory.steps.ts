/**
 * Step definitions for AgentX Factory feature
 *
 * Tests: createAgentX() function and different modes (local/remote)
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { createAgentX } from "../../src";
import type { AgentXLocal, AgentXRemote } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";
import { createMockDriver } from "../support/MockDriver";

// ===== Local Mode =====

When("I call createAgentX()", function (this: TestWorld) {
  this.agentx = createAgentX();
});

Then("I should get an AgentXLocal instance", function (this: TestWorld) {
  expect(this.agentx).toBeDefined();
  expect((this.agentx as AgentXLocal).mode).toBe("local");
});

Then("the mode should be {string}", function (this: TestWorld, mode: string) {
  expect((this.agentx as any).mode).toBe(mode);
});

Then("it should have agents manager", function (this: TestWorld) {
  expect(this.agentx!.agents).toBeDefined();
  expect(typeof this.agentx!.agents.define).toBe("function");
  expect(typeof this.agentx!.agents.create).toBe("function");
  expect(typeof this.agentx!.agents.get).toBe("function");
  expect(typeof this.agentx!.agents.has).toBe("function");
  expect(typeof this.agentx!.agents.list).toBe("function");
  expect(typeof this.agentx!.agents.destroy).toBe("function");
  expect(typeof this.agentx!.agents.destroyAll).toBe("function");
});

Then("it should have sessions manager", function (this: TestWorld) {
  expect((this.agentx as AgentXLocal).sessions).toBeDefined();
  expect(typeof (this.agentx as AgentXLocal).sessions.create).toBe("function");
  expect(typeof (this.agentx as AgentXLocal).sessions.get).toBe("function");
  expect(typeof (this.agentx as AgentXLocal).sessions.listByAgent).toBe("function");
  expect(typeof (this.agentx as AgentXLocal).sessions.destroy).toBe("function");
});

Then("it should have errors manager", function (this: TestWorld) {
  const local = this.agentx as AgentXLocal;
  expect(local.errors).toBeDefined();
  expect(typeof local.errors.addHandler).toBe("function");
  expect(typeof local.errors.removeHandler).toBe("function");
});

// ===== Remote Mode =====

When("I call createAgentX with serverUrl {string}", function (this: TestWorld, serverUrl: string) {
  this.agentx = createAgentX({ mode: "remote", remote: { serverUrl } });
});

Then("I should get an AgentXRemote instance", function (this: TestWorld) {
  expect(this.agentx).toBeDefined();
  expect((this.agentx as AgentXRemote).mode).toBe("remote");
});

Then("it should have platform manager", function (this: TestWorld) {
  const remote = this.agentx as AgentXRemote;
  expect(remote.platform).toBeDefined();
  expect(typeof remote.platform.getInfo).toBe("function");
  expect(typeof remote.platform.getHealth).toBe("function");
});

Then("it should NOT have errors manager", function (this: TestWorld) {
  expect((this.agentx as any).errors).toBeUndefined();
});

// ===== Instance Independence =====

Given("a local AgentX instance {string}", function (this: TestWorld, instanceName: string) {
  const instance = createAgentX();
  this.agentxInstances.set(instanceName, instance);
});

When("I create an agent in {string}", function (this: TestWorld, instanceName: string) {
  const instance = this.agentxInstances.get(instanceName) as AgentXLocal;
  expect(instance).toBeDefined();

  const definition = instance.agents.define({
    name: "TestAgent",
    driver: createMockDriver(),
  });

  this.agent = instance.agents.create(definition, {});
  this.agents.push(this.agent);
});

Then("the agent should NOT exist in {string}", function (this: TestWorld, instanceName: string) {
  const instance = this.agentxInstances.get(instanceName) as AgentXLocal;
  expect(instance).toBeDefined();

  const agentId = this.agent?.agentId;
  expect(agentId).toBeDefined();

  const exists = instance.agents.has(agentId!);
  expect(exists).toBe(false);
});
