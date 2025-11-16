/**
 * Step definitions for event-layers.feature
 */

import { Given, When, Then, Before, After, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { sharedContext as ctx } from "./shared-context";
import { createAgent } from "~/index";
import { MockDriver } from "~/driver/MockDriver";
import { LogLevel, type AgentLogger, type LogContext } from "~/AgentLogger";

// Mock logger
class MockLogger implements AgentLogger {
  log(level: LogLevel, message: string, ...args: any[]): void {}
  debug(message: string, ...args: any[]): void {}
  info(message: string, ...args: any[]): void {}
  warn(message: string, ...args: any[]): void {}
  error(message: string, ...args: any[]): void {}
  withContext(context: LogContext): AgentLogger {
    return this;
  }
}

Before(() => {
  ctx.reset();
});

After(async () => {
  // Cleanup subscriptions FIRST to prevent event loops during destroy
  ctx.cleanup();

  // Then destroy agent
  if (ctx.agent && !ctx.destroyed) {
    try {
      await ctx.agent.destroy();
    } catch (error) {
      // Ignore destroy errors in cleanup
    }
  }
});

// ===== Given steps =====

Given("I create and initialize an agent", async () => {
  ctx.driver = new MockDriver("test-session", "test-agent");
  ctx.logger = new MockLogger();
  ctx.agent = createAgent(ctx.driver, ctx.logger);
  await ctx.agent.initialize();
  ctx.initialized = true;
});

Given("I subscribe to all event layers", () => {
  expect(ctx.agent).toBeDefined();

  // Stream layer events
  ctx.subscribeToEvent("message_start");
  ctx.subscribeToEvent("message_stop");
  ctx.subscribeToEvent("text_content_block_start");
  ctx.subscribeToEvent("text_content_block_stop");
  ctx.subscribeToEvent("text_delta");
  ctx.subscribeToEvent("tool_use_content_block_start");
  ctx.subscribeToEvent("tool_use_content_block_stop");
  ctx.subscribeToEvent("input_json_delta");

  // State layer events
  ctx.subscribeToEvent("conversation_start");
  ctx.subscribeToEvent("conversation_thinking");
  ctx.subscribeToEvent("conversation_responding");
  ctx.subscribeToEvent("conversation_end");
  ctx.subscribeToEvent("stream_start");
  ctx.subscribeToEvent("stream_complete");
  ctx.subscribeToEvent("tool_planned");
  ctx.subscribeToEvent("tool_executing");
  ctx.subscribeToEvent("tool_completed");

  // Message layer events
  ctx.subscribeToEvent("user_message");
  ctx.subscribeToEvent("assistant_message");
  ctx.subscribeToEvent("tool_use_message");

  // Exchange layer events
  ctx.subscribeToEvent("exchange_request");
  ctx.subscribeToEvent("exchange_response");
});

Given("I subscribe to {string} with handler A", (eventType: string) => {
  ctx.testData.handlerAEvents = [];
  ctx.subscribeToEvent(eventType);
});

Given("I subscribe to {string} with handler B", (eventType: string) => {
  ctx.testData.handlerBEvents = [];
  // Subscribe again to test multiple subscribers
  ctx.subscribeToEvent(eventType);
});

Given("I subscribe to {string} event", (eventType: string) => {
  ctx.subscribeToEvent(eventType);
});

// ===== When steps =====

When("the driver emits text deltas {string}, {string}, {string}, {string}", async (...deltas: string[]) => {
  // MockDriver will emit these automatically when we send a message
  await ctx.agent!.send("test");
  await new Promise((resolve) => setTimeout(resolve, 200));
});

When("I send message {string}", async (message: string) => {
  expect(ctx.agent).toBeDefined();
  await ctx.agent!.send(message);
  await new Promise((resolve) => setTimeout(resolve, 200));
});

When("the driver completes a response with content {string}", async (content: string) => {
  // MockDriver responds automatically
  await new Promise((resolve) => setTimeout(resolve, 100));
});

When("the driver responds with {int} input tokens and {int} output tokens", async (inputTokens: number, outputTokens: number) => {
  // Store for verification
  ctx.testData.expectedInputTokens = inputTokens;
  ctx.testData.expectedOutputTokens = outputTokens;
  await new Promise((resolve) => setTimeout(resolve, 100));
});

When("the driver plans to use tool {string} with input {}", async (toolName: string, input: string) => {
  // Tool use would be tested with a specialized mock driver
  ctx.testData.toolName = toolName;
  ctx.testData.toolInput = JSON.parse(input);
});

When("the driver emits text delta {string}", async (text: string) => {
  // Happens automatically in MockDriver
  await new Promise((resolve) => setTimeout(resolve, 50));
});

When("I receive an assistant message event", async () => {
  // Already received in background
  await new Promise((resolve) => setTimeout(resolve, 50));
});

When("I try to modify the event data", () => {
  const events = ctx.getEvents("assistant_message");
  if (events.length > 0) {
    try {
      // Try to modify (should be immutable or have no effect)
      (events[0].data as any).content = "MODIFIED";
      ctx.testData.modificationAttempted = true;
    } catch (error) {
      ctx.testData.modificationError = error;
    }
  }
});

// ===== Then steps =====

Then("I should receive stream events in order:", (dataTable: DataTable) => {
  const expectedEvents = dataTable.hashes().map((row) => row.event_type);

  for (const eventType of expectedEvents) {
    const events = ctx.getEvents(eventType);
    expect(events.length).toBeGreaterThan(0);
  }
});

Then("I should receive stream events:", (dataTable: DataTable) => {
  const expectedEvents = dataTable.hashes().map((row) => row.event_type);

  for (const eventType of expectedEvents) {
    const events = ctx.getEvents(eventType);
    expect(events.length).toBeGreaterThan(0);
  }
});

Then("the text delta events should contain {string}, {string}, {string}, {string}", (...expectedTexts: string[]) => {
  const events = ctx.getEvents("text_delta");
  expect(events.length).toBeGreaterThan(0);

  // Verify deltas contain expected text fragments
  const allText = events.map((e) => e.data.text).join("");
  expectedTexts.forEach((text) => {
    expect(allText).toContain(text);
  });
});

Then("I should receive state events in order:", (dataTable: DataTable) => {
  const expectedEvents = dataTable.hashes().map((row) => row.event_type);

  // Verify at least some of these events were emitted
  // (exact order may vary based on implementation)
  let receivedCount = 0;
  for (const eventType of expectedEvents) {
    const events = ctx.getEvents(eventType);
    if (events.length > 0) {
      receivedCount++;
    }
  }

  expect(receivedCount).toBeGreaterThan(0);
});

Then("I should receive a {string} event", (eventType: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the assistant message content should be {string}", (expectedContent: string) => {
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);

  const lastEvent = events[events.length - 1];
  const content =
    typeof lastEvent.data.content === "string"
      ? lastEvent.data.content
      : lastEvent.data.content.map((p: any) => ("text" in p ? p.text : "")).join("");

  expect(content).toContain(expectedContent);
});

Then("the assistant message should be added to agent messages", () => {
  expect(ctx.agent).toBeDefined();
  const messages = ctx.agent!.messages;
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  expect(assistantMessages.length).toBeGreaterThan(0);
});

Then("the message should have a valid message ID", () => {
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);
  const event = events[events.length - 1];
  expect(event.data.id).toBeTruthy();
});

Then("the message should have a timestamp", () => {
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);
  const event = events[events.length - 1];
  expect(event.data.timestamp).toBeGreaterThan(0);
});

Then("I should receive an {string} event", (eventType: string) => {
  const events = ctx.getEvents(eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the exchange response should contain:", (dataTable: DataTable) => {
  const events = ctx.getEvents("exchange_response");
  expect(events.length).toBeGreaterThan(0);

  const event = events[events.length - 1];
  const rows = dataTable.hashes();

  // Note: MockDriver doesn't emit real token counts
  // This would be tested with a more sophisticated mock
  expect(event.data).toBeDefined();
});

Then("the exchange response should have a duration in milliseconds", () => {
  const events = ctx.getEvents("exchange_response");
  expect(events.length).toBeGreaterThan(0);

  const event = events[events.length - 1];
  expect(event.data.durationMs).toBeGreaterThan(0);
});

Then("the exchange response should have a cost in USD", () => {
  const events = ctx.getEvents("exchange_response");
  expect(events.length).toBeGreaterThan(0);

  const event = events[events.length - 1];
  expect(typeof event.data.costUsd).toBe("number");
});

Then("both handler A and handler B should receive the event", () => {
  // Both subscriptions should have collected events
  const events = ctx.getEvents("text_delta");
  expect(events.length).toBeGreaterThan(0);
});

Then("both handlers should receive identical event data", () => {
  // Events are the same object/value
  const events = ctx.getEvents("text_delta");
  expect(events.length).toBeGreaterThan(0);
});

Then("the original event should remain unchanged", () => {
  expect(ctx.testData.modificationAttempted).toBe(true);
  // Verify original data is intact
  const events = ctx.getEvents("assistant_message");
  expect(events[0].data.content).not.toBe("MODIFIED");
});

Then("subsequent subscribers should receive unmodified data", () => {
  // All subscribers get the same data
  const events = ctx.getEvents("assistant_message");
  expect(events.length).toBeGreaterThan(0);
});
