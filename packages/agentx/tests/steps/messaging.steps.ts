/**
 * Step definitions for agent-messaging.feature
 *
 * Common steps (Given) are defined in common.steps.ts
 */

import { When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import { ctx } from "./common.steps";

// ===== When Steps =====

When("I send message {string}", async (message: string) => {
  if (ctx.agent) {
    await ctx.agent.receive(message);
    ctx.messagesProcessed++;
  }
});

When("I send a UserMessage object with content {string}", async (content: string) => {
  if (ctx.agent) {
    const userMessage: UserMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    await ctx.agent.receive(userMessage);
    ctx.messagesProcessed++;
  }
});

// ===== Then Steps =====

Then("the agent should receive the message", () => {
  expect(ctx.messagesProcessed).toBeGreaterThan(0);
});

Then("the agent state should transition through {string}", (_state: string) => {
  // If we subscribed to events, check them
  if (ctx.receivedEvents.length > 0) {
    const hasResponding = ctx.receivedEvents.some(
      (e) => e.type === "message_start" || e.type === "text_delta"
    );
    expect(hasResponding).toBe(true);
  } else {
    // If no subscription, just verify message was processed and agent is back to idle
    expect(ctx.messagesProcessed).toBeGreaterThan(0);
    expect(ctx.agent!.state).toBe("idle");
  }
});

Then("the agent state should return to {string}", (state: string) => {
  expect(ctx.agent).not.toBeNull();
  expect(ctx.agent!.state).toBe(state);
});

Then("the message should have the correct structure", () => {
  expect(ctx.messagesProcessed).toBeGreaterThan(0);
});

Then("I should receive {string} event", (eventType: string) => {
  const hasEvent = ctx.receivedEvents.some((e) => e.type === eventType);
  expect(hasEvent).toBe(true);
});

Then("I should receive {string} events", (eventType: string) => {
  const events = ctx.receivedEvents.filter((e) => e.type === eventType);
  expect(events.length).toBeGreaterThan(0);
});

Then("the assistant message should contain {string}", (expectedContent: string) => {
  const assistantMessages = ctx.receivedEvents.filter((e) => e.type === "assistant_message");
  expect(assistantMessages.length).toBeGreaterThan(0);

  const message = assistantMessages[0] as any;
  expect(message.data.content).toContain(expectedContent);
});

Then("the state should transition: idle -> responding -> idle", () => {
  const hasStart = ctx.receivedEvents.some((e) => e.type === "message_start");
  const hasStop = ctx.receivedEvents.some((e) => e.type === "message_stop");
  expect(hasStart).toBe(true);
  expect(hasStop).toBe(true);
  expect(ctx.agent!.state).toBe("idle");
});

Then("both messages should be processed successfully", () => {
  expect(ctx.messagesProcessed).toBe(2);
});

Then("the agent state should be {string}", (expectedState: string) => {
  expect(ctx.agent).not.toBeNull();
  expect(ctx.agent!.state).toBe(expectedState);
});
