/**
 * Step definitions for agent-lifecycle.feature
 *
 * Common steps (Given) are defined in common.steps.ts
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import {
  agentx,
  createAgentX,
  defineAgent,
  createAgent,
  getAgent,
  hasAgent,
  destroyAgent,
  destroyAll,
  type AgentX,
  type AgentContainer,
} from "~/index";
import { MemoryAgentContainer } from "@deepractice-ai/agentx-core";
import { ctx, createMockEchoDriver } from "./common.steps";

// ===== Local Context =====
let customAgentX: AgentX | null = null;
let customContainer: AgentContainer | null = null;

// ===== Given Steps (unique to lifecycle) =====

Given("a created agent with id {string}", (_id: string) => {
  ctx.definedAgent = defineAgent({
    name: "TestAgent",
    driver: createMockEchoDriver(),
    configSchema: {
      apiKey: { type: "string", required: true },
    },
  });
  ctx.agent = createAgent(ctx.definedAgent, { apiKey: "test-key" });
  ctx.knownAgentId = ctx.agent.agentId;
});

Given("a created agent with known id", () => {
  ctx.definedAgent = defineAgent({
    name: "TestAgent",
    driver: createMockEchoDriver(),
    configSchema: {
      apiKey: { type: "string", required: true },
    },
  });
  ctx.agent = createAgent(ctx.definedAgent, { apiKey: "test-key" });
  ctx.knownAgentId = ctx.agent.agentId;
});

Given("{int} created agents", (count: number) => {
  ctx.definedAgent = defineAgent({
    name: "MultiAgent",
    driver: createMockEchoDriver(),
    configSchema: {
      apiKey: { type: "string", required: true },
    },
  });

  for (let i = 0; i < count; i++) {
    const a = createAgent(ctx.definedAgent, { apiKey: `test-key-${i}` });
    ctx.agents.push(a);
  }
});

Given("a custom memory container", () => {
  customContainer = new MemoryAgentContainer();
});

// ===== When Steps =====

When("I create an agent with config:", (table: any) => {
  const rawTable = table.raw();
  const config: Record<string, any> = {};
  for (const [field, value] of rawTable) {
    config[field] = value;
  }

  ctx.agent = createAgent(ctx.definedAgent!, config);
  ctx.knownAgentId = ctx.agent.agentId;
});

When("I create an agent via agentx.createAgent", () => {
  ctx.agent = agentx.createAgent(ctx.definedAgent!, { apiKey: "test-key" });
  ctx.knownAgentId = ctx.agent.agentId;
});

When("I create {int} agents from the same definition", (count: number) => {
  ctx.agents = [];
  for (let i = 0; i < count; i++) {
    const a = createAgent(ctx.definedAgent!, { apiKey: `test-key-${i}` });
    ctx.agents.push(a);
  }
});

When("I call getAgent with {string}", (id: string) => {
  // If we have a known agent ID and scenario mentions any ID, use the known one
  // This handles dynamic ID scenarios like "agent_123" which is just a placeholder
  const lookupId = ctx.knownAgentId && id !== "non_existent" ? ctx.knownAgentId : id;
  const result = getAgent(lookupId);
  ctx.agent = result === undefined ? undefined : result;
});

When("I call destroyAgent with the agentId", async () => {
  if (ctx.knownAgentId) {
    await destroyAgent(ctx.knownAgentId);
  }
});

When("I call destroyAll", async () => {
  await destroyAll();
});

When("I destroy the agent", async () => {
  if (ctx.agent) {
    await ctx.agent.destroy();
  }
});

When("I try to send a message to the destroyed agent", async () => {
  try {
    if (ctx.agent) {
      await ctx.agent.receive("Hello");
    }
  } catch (error) {
    ctx.caughtError = error as Error;
  }
});

When("I create a custom AgentX instance", () => {
  customAgentX = createAgentX();
});

When("I create AgentX with the custom container", () => {
  customAgentX = createAgentX({ container: customContainer! });
});

// ===== Then Steps =====

Then("an agent instance should be created", () => {
  expect(ctx.agent).not.toBeNull();
});

Then("the agent should have a unique agentId", () => {
  expect(ctx.agent).not.toBeNull();
  expect(ctx.agent!.agentId).toBeDefined();
  expect(typeof ctx.agent!.agentId).toBe("string");
  expect(ctx.agent!.agentId.length).toBeGreaterThan(0);
});

Then("the agent lifecycle should be {string}", (expectedLifecycle: string) => {
  expect(ctx.agent).not.toBeNull();
  expect(ctx.agent!.lifecycle).toBe(expectedLifecycle);
});

Then("the agent should be registered in agentx", () => {
  expect(ctx.agent).not.toBeNull();
  expect(agentx.hasAgent(ctx.agent!.agentId)).toBe(true);
});

Then("agentx.hasAgent should return true for the agentId", () => {
  expect(ctx.agent).not.toBeNull();
  expect(agentx.hasAgent(ctx.agent!.agentId)).toBe(true);
});

Then("all agents should have different agentIds", () => {
  const ids = new Set(ctx.agents.map((a) => a.agentId));
  expect(ids.size).toBe(ctx.agents.length);
});

Then("all agents should be running", () => {
  for (const a of ctx.agents) {
    expect(a.lifecycle).toBe("running");
  }
});

Then("I should get the same agent instance", () => {
  expect(ctx.agent).toBeDefined();
  expect(ctx.agent).not.toBeNull();
  expect(ctx.agent!.agentId).toBe(ctx.knownAgentId);
});

Then("I should get undefined", () => {
  expect(ctx.agent).toBeUndefined();
});

Then("hasAgent should return false for the agentId", () => {
  expect(hasAgent(ctx.knownAgentId!)).toBe(false);
});

Then("hasAgent should return true for the agentId", () => {
  expect(hasAgent(ctx.knownAgentId!)).toBe(true);
});

Then("hasAgent should return false for {string}", (id: string) => {
  expect(hasAgent(id)).toBe(false);
});

Then("getAgent should return undefined for the agentId", () => {
  expect(getAgent(ctx.knownAgentId!)).toBeUndefined();
});

Then("all agents should be destroyed", () => {
  for (const a of ctx.agents) {
    expect(a.lifecycle).toBe("destroyed");
  }
});

Then("agentx should have no agents", () => {
  for (const a of ctx.agents) {
    expect(hasAgent(a.agentId)).toBe(false);
  }
});

Then("it should be independent from default agentx", () => {
  expect(customAgentX).not.toBeNull();
  expect(customAgentX).not.toBe(agentx);
});

Then("agents created in custom instance should not appear in default", () => {
  const customAgent = customAgentX!.createAgent(ctx.definedAgent!, { apiKey: "custom" });
  expect(customAgentX!.hasAgent(customAgent.agentId)).toBe(true);
  expect(agentx.hasAgent(customAgent.agentId)).toBe(false);
});

Then("the AgentX should use the custom container", () => {
  expect(customAgentX).not.toBeNull();
  expect(customAgentX!.container).toBe(customContainer);
});
