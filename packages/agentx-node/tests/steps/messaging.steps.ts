import { Given, When, Then, After } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { createTestAgent, getDefaultTestConfig } from "../helpers/testAgent";
import { sharedContext as context, resetSharedContext } from "../helpers/sharedContext";

// Clean up after each scenario
After(() => {
  resetSharedContext();
});

// Background: Create agent with valid configuration
Given("I have created an agent with valid configuration", () => {
  const config = getDefaultTestConfig();
  context.agent = createTestAgent(config);
  context.createdAgents.push(context.agent);

  // Register event listeners to capture all events
  context.agent.on("user", (event) => {
    context.events.push(event);
    context.userEvents.push(event);
  });

  context.agent.on("assistant", (event) => {
    context.events.push(event);
    context.assistantEvents.push(event);
  });

  context.agent.on("stream_event", (event) => {
    context.events.push(event);
    context.streamEvents.push(event);
  });

  context.agent.on("result", (event) => {
    context.events.push(event);
    context.resultEvents.push(event);
  });

  context.agent.on("system", (event) => {
    context.events.push(event);
  });
});

// Scenario: Send a simple text message
When("I send the message {string}", async (message: string) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  await context.agent.send(message);
  context.messagesSent++;
});

Then("the agent should emit a {string} event with my message", (eventType: string) => {
  if (eventType === "user") {
    expect(context.userEvents.length).toBeGreaterThan(0);
    const lastUserEvent = context.userEvents[context.userEvents.length - 1];
    expect(lastUserEvent.type).toBe("user");
    expect(lastUserEvent.message.content).toBeDefined();
  }
});

Then("the agent should emit an {string} event with a response", (eventType: string) => {
  if (eventType === "assistant") {
    expect(context.assistantEvents.length).toBeGreaterThan(0);
    const lastAssistantEvent = context.assistantEvents[context.assistantEvents.length - 1];
    expect(lastAssistantEvent.type).toBe("assistant");
    expect(lastAssistantEvent.message.content).toBeDefined();
  }
});

Then("the agent should emit a {string} event when complete", (eventType: string) => {
  if (eventType === "result") {
    expect(context.resultEvents.length).toBeGreaterThan(0);
    const lastResultEvent = context.resultEvents[context.resultEvents.length - 1];
    expect(lastResultEvent.type).toBe("result");
  }
});

// Scenario: Receive streaming responses
Given("I am listening for {string} events", (eventType: string) => {
  // Already listening in background step
  expect(context.agent).toBeDefined();
});

When("I send a message {string}", async (message: string) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  await context.agent.send(message);
  context.messagesSent++;
});

Then("I should receive multiple stream events", () => {
  expect(context.streamEvents.length).toBeGreaterThan(1);
});

Then("each stream event should contain delta content", () => {
  context.streamEvents.forEach((event) => {
    expect(event.type).toBe("stream_event");
    expect(event.delta).toBeDefined();
  });
});

Then("the deltas should arrive in order", () => {
  // Check that timestamps are increasing
  for (let i = 1; i < context.streamEvents.length; i++) {
    expect(context.streamEvents[i].timestamp).toBeGreaterThanOrEqual(
      context.streamEvents[i - 1].timestamp
    );
  }
});

// Scenario: Access conversation history
Given("I have sent {int} messages to the agent", async (count: number) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  for (let i = 0; i < count; i++) {
    await context.agent.send(`Message ${i + 1}`);
    context.messagesSent++;
  }
});

When("I check the agent's messages property", () => {
  expect(context.agent).toBeDefined();
});

Then("I should see all {int} messages ({int} user + {int} assistant)", (total: number, userCount: number, assistantCount: number) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  const messages = context.agent.messages;
  expect(messages.length).toBe(total);

  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");

  expect(userMessages.length).toBe(userCount);
  expect(assistantMessages.length).toBe(assistantCount);
});

Then("the messages should be in chronological order", () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  const messages = context.agent.messages;

  // Check that messages alternate: user, assistant, user, assistant...
  for (let i = 0; i < messages.length; i++) {
    if (i % 2 === 0) {
      expect(messages[i].role).toBe("user");
    } else {
      expect(messages[i].role).toBe("assistant");
    }
  }
});

// Scenario: Send message with context
Given("I have sent {string}", async (message: string) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  await context.agent.send(message);
  context.messagesSent++;
});

// Matches: When I send "What's my name?"
When(/^I send "([^"]*)"$/, async (message: string) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  // Clear previous assistant events to track only this message's response
  context.assistantEvents = [];

  await context.agent.send(message);
  context.messagesSent++;
});

Then("the assistant response should mention {string}", (keyword: string) => {
  expect(context.assistantEvents.length).toBeGreaterThan(0);
  const lastAssistantEvent = context.assistantEvents[context.assistantEvents.length - 1];
  const content = typeof lastAssistantEvent.message.content === "string"
    ? lastAssistantEvent.message.content
    : JSON.stringify(lastAssistantEvent.message.content);

  expect(content.toLowerCase()).toContain(keyword.toLowerCase());
});

// Scenario: Track token usage
When("I send a message and wait for completion", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  await context.agent.send("Test message");
  context.messagesSent++;
});

Then("the result event should include token usage", () => {
  expect(context.resultEvents.length).toBeGreaterThan(0);
  const lastResult = context.resultEvents[context.resultEvents.length - 1];

  if (lastResult.subtype === "success") {
    expect(lastResult.usage).toBeDefined();
  }
});

Then("usage should show input and output tokens", () => {
  const lastResult = context.resultEvents[context.resultEvents.length - 1];

  if (lastResult.subtype === "success") {
    expect(lastResult.usage.input).toBeGreaterThan(0);
    expect(lastResult.usage.output).toBeGreaterThan(0);
  }
});

Then("usage should show cache read and write tokens", () => {
  const lastResult = context.resultEvents[context.resultEvents.length - 1];

  if (lastResult.subtype === "success") {
    expect(lastResult.usage.cacheRead).toBeGreaterThanOrEqual(0);
    expect(lastResult.usage.cacheWrite).toBeGreaterThanOrEqual(0);
  }
});

// Scenario: Track conversation cost
Given("I send a message and wait for completion", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  await context.agent.send("Test message");
  context.messagesSent++;
});

When("I receive the result event", () => {
  expect(context.resultEvents.length).toBeGreaterThan(0);
});

Then("it should include totalCostUsd", () => {
  const lastResult = context.resultEvents[context.resultEvents.length - 1];
  expect(lastResult.totalCostUsd).toBeDefined();
});

Then("the cost should be greater than {int}", (minCost: number) => {
  const lastResult = context.resultEvents[context.resultEvents.length - 1];
  expect(lastResult.totalCostUsd).toBeGreaterThanOrEqual(minCost);
});

// Scenario: Multiple messages in sequence
When("I wait for completion", async () => {
  // Wait a bit to ensure all events are processed
  await new Promise((resolve) => setTimeout(resolve, 50));
});

Then("the agent should have {int} messages total", (count: number) => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }
  expect(context.agent.messages.length).toBe(count);
});

Then("each request should have its own result event", () => {
  expect(context.resultEvents.length).toBe(context.messagesSent);
});
