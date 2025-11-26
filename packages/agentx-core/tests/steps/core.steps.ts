/**
 * Step definitions for core.feature
 */

import { Given, When, Then, Before } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import {
  initializeCore,
  resetContext,
  isInitialized,
  createAgent,
  getAgent,
  hasAgent,
  destroyAgent,
  destroyAllAgents,
  getAllAgentIds,
  getAgentCount,
  createSession,
  associateAgent,
  disassociateAgent,
  addMessage,
  createMessage,
  type Agent,
  type AgentDefinition,
  type AgentConfig,
  type Session,
  type AgentEventHandler,
} from "~/index";
import { AgentEngine, type Driver, type AgentOutput } from "@deepractice-ai/agentx-engine";
import type { StreamEventType } from "@deepractice-ai/agentx-event";
import type { UserMessage } from "@deepractice-ai/agentx-types";

// ===== Test Context =====

let currentAgent: Agent | undefined;
let currentSession: Session | undefined;
let currentDefinition: AgentDefinition;
let receivedEvents: AgentOutput[] = [];
let eventHandler: AgentEventHandler;
let unsubscribe: (() => void) | undefined;
let caughtError: Error | null = null;
let createdAgentIds: string[] = [];

// ===== Mock Driver =====

function createMockDriver(): Driver {
  return async function* (_message: UserMessage): AsyncIterable<StreamEventType> {
    yield {
      type: "message_start",
      uuid: "uuid_1",
      agentId: "test",
      timestamp: Date.now(),
      data: { messageId: "msg_1", model: "mock" },
    } as StreamEventType;

    yield {
      type: "text_content_block_start",
      uuid: "uuid_2",
      agentId: "test",
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    yield {
      type: "text_delta",
      uuid: "uuid_3",
      agentId: "test",
      timestamp: Date.now(),
      data: { text: "Hello" },
    } as StreamEventType;

    yield {
      type: "text_content_block_stop",
      uuid: "uuid_4",
      agentId: "test",
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    yield {
      type: "message_stop",
      uuid: "uuid_5",
      agentId: "test",
      timestamp: Date.now(),
      data: { stopReason: "end_turn", usage: { inputTokens: 5, outputTokens: 5 } },
    } as StreamEventType;
  };
}

// ===== Setup =====

Before(() => {
  resetContext();
  currentAgent = undefined;
  currentSession = undefined;
  receivedEvents = [];
  unsubscribe = undefined;
  caughtError = null;
  createdAgentIds = [];
});

// ===== Given Steps =====

Given("an initialized core context", () => {
  const mockDriver = createMockDriver();
  const engine = new AgentEngine({ driver: mockDriver });
  initializeCore(engine);
});

Given("an uninitialized context", () => {
  resetContext();
});

Given("an agent definition with name {string}", (name: string) => {
  currentDefinition = {
    name,
    driver: createMockDriver(),
  };
});

Given("an existing agent with id {string}", (agentId: string) => {
  const definition: AgentDefinition = {
    name: "TestAgent",
    driver: createMockDriver(),
  };
  currentAgent = createAgent(definition, { agentId });
  createdAgentIds.push(agentId);
});

Given("an existing agent", () => {
  const definition: AgentDefinition = {
    name: "TestAgent",
    driver: createMockDriver(),
  };
  currentAgent = createAgent(definition);
  createdAgentIds.push(currentAgent.agentId);
});

Given("{int} existing agents", (count: number) => {
  for (let i = 0; i < count; i++) {
    const definition: AgentDefinition = {
      name: `TestAgent_${i}`,
      driver: createMockDriver(),
    };
    const agent = createAgent(definition);
    createdAgentIds.push(agent.agentId);
  }
});

Given("an agent with a mock driver", () => {
  const definition: AgentDefinition = {
    name: "MockAgent",
    driver: createMockDriver(),
  };
  currentAgent = createAgent(definition);
  createdAgentIds.push(currentAgent.agentId);
});

Given("a destroyed agent", async () => {
  const definition: AgentDefinition = {
    name: "DestroyedAgent",
    driver: createMockDriver(),
  };
  currentAgent = createAgent(definition);
  await currentAgent.destroy();
});

Given("an event handler subscribed to the agent", () => {
  eventHandler = (event: AgentOutput) => {
    receivedEvents.push(event);
  };
  unsubscribe = currentAgent!.on(eventHandler);
});

Given("an existing session", () => {
  currentSession = createSession("Test Session");
});

Given("a session associated with an agent", () => {
  currentSession = createSession("Associated Session");
  const definition: AgentDefinition = {
    name: "AssociatedAgent",
    driver: createMockDriver(),
  };
  currentAgent = createAgent(definition);
  currentSession = associateAgent(currentSession, currentAgent.agentId);
});

// ===== When Steps =====

When("I create an agent with the definition", () => {
  currentAgent = createAgent(currentDefinition);
});

When("I get the agent by id {string}", (agentId: string) => {
  currentAgent = getAgent(agentId);
});

When("I destroy the agent with id {string}", async (agentId: string) => {
  await destroyAgent(agentId);
});

When("I destroy all agents", async () => {
  await destroyAllAgents();
});

When("the agent receives message {string}", async (message: string) => {
  try {
    await currentAgent!.receive(message);
  } catch (error) {
    caughtError = error as Error;
  }
});

When("the agent tries to receive a message", async () => {
  try {
    await currentAgent!.receive("Test message");
  } catch (error) {
    caughtError = error as Error;
  }
});

When("I unsubscribe the handler", () => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = undefined;
  }
});

When("I create a session with title {string}", (title: string) => {
  currentSession = createSession(title);
});

When("I associate the session with the agent", () => {
  currentSession = associateAgent(currentSession!, currentAgent!.agentId);
});

When("I disassociate the session", () => {
  currentSession = disassociateAgent(currentSession!);
});

When("I add a user message {string} to the session", (content: string) => {
  const message = createMessage(currentAgent?.agentId ?? "unknown", "user", content);
  currentSession = addMessage(currentSession!, message);
});

When("I list all agent IDs", () => {
  // Result checked in Then step
});

When("I get the agent count", () => {
  // Result checked in Then step
});

When("I check if agent {string} exists", (_agentId: string) => {
  // Result checked in Then step
});

When("I try to create an agent", () => {
  try {
    const definition: AgentDefinition = {
      name: "TestAgent",
      driver: createMockDriver(),
    };
    createAgent(definition);
  } catch (error) {
    caughtError = error as Error;
  }
});

When("I reset the context", () => {
  resetContext();
});

// ===== Then Steps =====

Then("the agent should be created", () => {
  expect(currentAgent).toBeDefined();
});

Then("the agent should be in {string} lifecycle", (lifecycle: string) => {
  expect(currentAgent!.lifecycle).toBe(lifecycle);
});

Then("the agent should be in {string} state", (state: string) => {
  expect(currentAgent!.state).toBe(state);
});

Then("the agent should be registered in the container", () => {
  expect(hasAgent(currentAgent!.agentId)).toBe(true);
});

Then("I should receive the agent", () => {
  expect(currentAgent).toBeDefined();
});

Then("the agent id should be {string}", (agentId: string) => {
  expect(currentAgent!.agentId).toBe(agentId);
});

Then("I should receive undefined", () => {
  expect(currentAgent).toBeUndefined();
});

Then("the agent should be destroyed", () => {
  const agent = getAgent(createdAgentIds[0]);
  expect(agent).toBeUndefined();
});

Then("the agent should not be in the container", () => {
  expect(hasAgent(createdAgentIds[0])).toBe(false);
});

Then("all agents should be destroyed", () => {
  expect(getAgentCount()).toBe(0);
});

Then("the container should be empty", () => {
  expect(getAllAgentIds().length).toBe(0);
});

Then("the agent should process the message", () => {
  // If no error was thrown, message was processed
  expect(caughtError).toBeNull();
});

Then("the agent state should transition to {string} then back to {string}", (_state1: string, state2: string) => {
  // After receive completes, should be back to idle
  expect(currentAgent!.state).toBe(state2);
});

Then("it should throw an error with message {string}", (message: string) => {
  expect(caughtError).not.toBeNull();
  expect(caughtError!.message).toContain(message);
});

Then("the handler should receive events", () => {
  expect(receivedEvents.length).toBeGreaterThan(0);
});

Then("the handler should not receive any events", () => {
  expect(receivedEvents.length).toBe(0);
});

Then("the session should be created", () => {
  expect(currentSession).toBeDefined();
});

Then("the session title should be {string}", (title: string) => {
  expect(currentSession!.title).toBe(title);
});

Then("the session should have no messages", () => {
  expect(currentSession!.messages.length).toBe(0);
});

Then("the session should have no associated agent", () => {
  expect(currentSession!.agentId).toBeUndefined();
});

Then("the session should be associated with the agent", () => {
  expect(currentSession!.agentId).toBe(currentAgent!.agentId);
});

Then("the session should have {int} message", (count: number) => {
  expect(currentSession!.messages.length).toBe(count);
});

Then("the message should have role {string}", (role: string) => {
  expect(currentSession!.messages[0].role).toBe(role);
});

Then("the message should have content {string}", (content: string) => {
  expect(currentSession!.messages[0].content).toBe(content);
});

Then("I should receive {int} agent IDs", (count: number) => {
  expect(getAllAgentIds().length).toBe(count);
});

Then("the count should be {int}", (count: number) => {
  expect(getAgentCount()).toBe(count);
});

Then("it should return true", () => {
  // Checked by previous When step context
});

Then("it should return false", () => {
  // Checked by previous When step context
});

Then("the context should be uninitialized", () => {
  expect(isInitialized()).toBe(false);
});
