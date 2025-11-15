import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { sharedContext as context } from "../helpers/sharedContext";
import type { AgentEvent } from "@deepractice-ai/agentx-types";

// Handler tracking for tests
interface HandlerRecord {
  name: string;
  called: boolean;
  events: AgentEvent[];
}

const handlers = new Map<string, HandlerRecord>();

// Helper to reset handler state
function resetHandlers() {
  handlers.clear();
}

// Register a named handler
function registerNamedHandler(
  name: string,
  eventType: string,
  subtype?: string
) {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  const record: HandlerRecord = {
    name,
    called: false,
    events: [],
  };

  handlers.set(name, record);

  // Create the handler function
  const handler = (event: AgentEvent) => {
    // Filter by subtype if specified
    if (subtype && event.subtype !== subtype) {
      return;
    }

    record.called = true;
    record.events.push(event);
  };

  // Register with agent
  const unregister = context.agent.on(eventType as any, handler);

  // Store unregister function for later
  context.unregisterHandlers = context.unregisterHandlers || new Map();
  context.unregisterHandlers.set(name, unregister);
}

// ============================================================
// Given steps
// ============================================================

Given(/^I register a handler for "([^"]*)" events$/, (eventType: string) => {
  registerNamedHandler("default", eventType);
});

Given(
  /^I have registered a handler for "([^"]*)" events$/,
  (eventType: string) => {
    registerNamedHandler("default", eventType);
  }
);

Given(
  /^I register handler ([A-Z]) for "([^"]*)" events$/,
  (handlerName: string, eventType: string) => {
    registerNamedHandler(handlerName, eventType);
  }
);

Given(
  /^I register a handler for "([^"]*)" events with subtype "([^"]*)"$/,
  (eventType: string, subtype: string) => {
    resetHandlers();
    registerNamedHandler("default", eventType, subtype);
  }
);

// ============================================================
// When steps
// ============================================================

When("the agent sends a response", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  // Send a simple message to trigger response
  context.lastResult = await context.agent.send("Hello");
});

When("the conversation completes", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  // Send and wait for completion
  context.lastResult = await context.agent.send("Test message");
});

When("I unregister the handler", () => {
  const unregisterFn = context.unregisterHandlers?.get("default");

  if (!unregisterFn) {
    throw new Error("No handler registered to unregister");
  }

  unregisterFn();
  context.unregisterHandlers?.delete("default");
});

When("the result event is emitted", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  context.lastResult = await context.agent.send("Test");
});

When("the agent initializes", async () => {
  // Agent is already initialized in Background
  // Just trigger first interaction to emit system init
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  context.lastResult = await context.agent.send("Hello");
});

When("the agent is generating a response", async () => {
  if (!context.agent) {
    throw new Error("Agent not initialized");
  }

  context.lastResult = await context.agent.send("Tell me a story");
});

When("the agent encounters an error during execution", async () => {
  // Force an error by creating new agent with error provider
  const { createTestAgent } = await import("../helpers/testAgent");

  context.agent = createTestAgent(
    {
      apiKey: "test-key",
      model: "claude-3-5-sonnet-20241022",
    },
    {
      simulateError: true,
      errorType: "execution",
    }
  );

  // Register handler for result events
  registerNamedHandler("default", "result");

  try {
    context.lastResult = await context.agent.send("This will error");
  } catch {
    // Error expected, continue
  }
});

// ============================================================
// Then steps
// ============================================================

Then(
  "my handler should be called with the assistant message event",
  () => {
    const handler = handlers.get("default");
    expect(handler).toBeDefined();
    expect(handler!.called).toBe(true);
    expect(handler!.events.length).toBeGreaterThan(0);

    const assistantEvent = handler!.events.find((e) => e.type === "assistant");
    expect(assistantEvent).toBeDefined();
  }
);

Then("my handler should be called with the result event", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();
  expect(handler!.called).toBe(true);

  const resultEvent = handler!.events.find((e) => e.type === "result");
  expect(resultEvent).toBeDefined();
});

Then("I can check if it was successful or had an error", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();

  const resultEvent = handler!.events.find((e) => e.type === "result");
  expect(resultEvent).toBeDefined();
  expect(resultEvent!.subtype).toBeDefined();
  expect(["success", "error"]).toContain(resultEvent!.subtype);
});

Then("my handler should NOT be called", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();
  expect(handler!.called).toBe(false);
});

Then(/^both handler ([A-Z]) and ([A-Z]) should be called$/, (h1: string, h2: string) => {
  const handlerA = handlers.get(h1);
  const handlerB = handlers.get(h2);

  expect(handlerA).toBeDefined();
  expect(handlerB).toBeDefined();
  expect(handlerA!.called).toBe(true);
  expect(handlerB!.called).toBe(true);
});

Then("the handler parameter should have the correct type", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();

  const resultEvent = handler!.events.find((e) => e.type === "result");
  expect(resultEvent).toBeDefined();
  expect(resultEvent!.type).toBe("result");
});

Then(
  "I can access result-specific fields without type casting",
  () => {
    const handler = handlers.get("default");
    const resultEvent = handler!.events.find((e) => e.type === "result");

    // TypeScript should allow these without type assertion
    expect(resultEvent!.subtype).toBeDefined();
    expect(resultEvent!.usage).toBeDefined();
  }
);

Then("I should receive the system init event", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();
  expect(handler!.called).toBe(true);

  const systemEvent = handler!.events.find(
    (e) => e.type === "system" && e.subtype === "init"
  );
  expect(systemEvent).toBeDefined();
});

Then("it should include model information", () => {
  const handler = handlers.get("default");
  const systemEvent = handler!.events.find(
    (e) => e.type === "system" && e.subtype === "init"
  );

  expect(systemEvent).toBeDefined();
  // System init should have model info
  expect(systemEvent).toHaveProperty("model");
});

Then("it should include available tools", () => {
  const handler = handlers.get("default");
  const systemEvent = handler!.events.find(
    (e) => e.type === "system" && e.subtype === "init"
  );

  expect(systemEvent).toBeDefined();
  // System init should have tools array
  expect(systemEvent).toHaveProperty("tools");
});

Then("it should include the current working directory", () => {
  const handler = handlers.get("default");
  const systemEvent = handler!.events.find(
    (e) => e.type === "system" && e.subtype === "init"
  );

  expect(systemEvent).toBeDefined();
  // System init should have cwd
  expect(systemEvent).toHaveProperty("cwd");
});

Then("I should receive multiple stream events", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();
  expect(handler!.called).toBe(true);
  expect(handler!.events.length).toBeGreaterThan(1);
});

Then("I can display real-time progress to the user", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();

  // Stream events should have incremental data
  const streamEvents = handler!.events.filter(
    (e) => e.type === "stream_event"
  );
  expect(streamEvents.length).toBeGreaterThan(0);
});

Then("the result event subtype should be an error type", () => {
  const handler = handlers.get("default");
  expect(handler).toBeDefined();

  const resultEvent = handler!.events.find((e) => e.type === "result");
  expect(resultEvent).toBeDefined();
  // Error subtypes include error_during_execution, error_max_turns, etc.
  expect(resultEvent!.subtype).toMatch(/^error/);
});

Then("it should include error details", () => {
  const handler = handlers.get("default");
  const resultEvent = handler!.events.find((e) => e.type === "result");

  expect(resultEvent).toBeDefined();
  // Error result should have error field
  expect(resultEvent).toHaveProperty("error");
});

Then("it should still include usage statistics", () => {
  const handler = handlers.get("default");
  const resultEvent = handler!.events.find((e) => e.type === "result");

  expect(resultEvent).toBeDefined();
  expect(resultEvent!.usage).toBeDefined();
});
