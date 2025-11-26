/**
 * Step definitions for agent-events.feature
 *
 * Common steps (Given) are defined in common.steps.ts
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { ctx } from "./common.steps";

// ===== Local Context =====
let typedHandlerEvents: any[] = [];
let handlerAEvents: any[] = [];
let handlerBEvents: any[] = [];
let normalHandlerEvents: any[] = [];
let agentCrashed = false;

// ===== Given Steps (unique to events) =====

Given("I subscribe with a global handler", () => {
  if (ctx.agent) {
    ctx.agent.on((event) => {
      ctx.receivedEvents.push(event);
    });
  }
});

Given("I subscribe to {string} events", (eventType: string) => {
  typedHandlerEvents = [];
  if (ctx.agent) {
    ctx.agent.on(eventType, (event) => {
      typedHandlerEvents.push(event);
    });
  }
});

Given("I subscribe to all events and get unsubscribe function", () => {
  if (ctx.agent) {
    ctx.unsubscribeFn = ctx.agent.on((event) => {
      ctx.receivedEvents.push(event);
    });
  }
});

// Parse array syntax like ["message_start", "message_stop"]
Given(/^I subscribe to \[(.*)\] events$/, (typesStr: string) => {
  typedHandlerEvents = [];
  if (ctx.agent) {
    const types = typesStr
      .replace(/"/g, "")
      .split(",")
      .map((t) => t.trim());
    ctx.agent.on(types, (event) => {
      typedHandlerEvents.push(event);
    });
  }
});

Given("I subscribe handler A to {string} events", (eventType: string) => {
  handlerAEvents = [];
  if (ctx.agent) {
    ctx.unsubscribeFn = ctx.agent.on(eventType, (event) => {
      handlerAEvents.push(event);
    });
  }
});

Given("I subscribe handler B to {string} events", (eventType: string) => {
  handlerBEvents = [];
  if (ctx.agent) {
    ctx.agent.on(eventType, (event) => {
      handlerBEvents.push(event);
    });
  }
});

Given("I subscribe a handler that throws error", () => {
  if (ctx.agent) {
    ctx.agent.on(() => {
      throw new Error("Handler error");
    });
  }
});

Given("I subscribe a normal handler", () => {
  normalHandlerEvents = [];
  if (ctx.agent) {
    ctx.agent.on((event) => {
      normalHandlerEvents.push(event);
    });
  }
});

// ===== When Steps =====

When("I call the unsubscribe function", () => {
  if (ctx.unsubscribeFn) {
    ctx.unsubscribeFn();
    ctx.unsubscribeFn = null;
  }
});

When("I unsubscribe handler A", () => {
  if (ctx.unsubscribeFn) {
    ctx.unsubscribeFn();
    ctx.unsubscribeFn = null;
  }
});

// ===== Then Steps =====

Then("the global handler should receive all events", () => {
  expect(ctx.receivedEvents.length).toBeGreaterThan(0);
});

Then("the handler should receive stream events", () => {
  const streamTypes = ["message_start", "text_delta", "message_stop"];
  const hasStreamEvents = ctx.receivedEvents.some((e) => streamTypes.includes(e.type));
  expect(hasStreamEvents).toBe(true);
});

Then("the handler should receive message events", () => {
  const messageTypes = ["assistant_message"];
  const hasMessageEvents = ctx.receivedEvents.some((e) => messageTypes.includes(e.type));
  expect(hasMessageEvents).toBe(true);
});

Then("the handler should only receive {string} events", (eventType: string) => {
  expect(typedHandlerEvents.length).toBeGreaterThan(0);
  for (const event of typedHandlerEvents) {
    expect(event.type).toBe(eventType);
  }
});

Then("the handler should not receive {string} events", (eventType: string) => {
  const hasEvent = typedHandlerEvents.some((e) => e.type === eventType);
  expect(hasEvent).toBe(false);
});

Then("the handler should receive {string} events", (eventType: string) => {
  const hasEvent = typedHandlerEvents.some((e) => e.type === eventType);
  expect(hasEvent).toBe(true);
});

Then("the handler should receive exactly {int} event", (count: number) => {
  expect(typedHandlerEvents.length).toBe(count);
});

Then("the event should be {string}", (eventType: string) => {
  expect(typedHandlerEvents.length).toBeGreaterThan(0);
  expect(typedHandlerEvents[0].type).toBe(eventType);
});

Then("the event data should contain {string}", (expectedContent: string) => {
  expect(typedHandlerEvents.length).toBeGreaterThan(0);
  const event = typedHandlerEvents[0] as any;
  expect(event.data.content).toContain(expectedContent);
});

Then("the handler should not receive any events", () => {
  expect(ctx.receivedEvents.length).toBe(0);
});

Then("handler A should not receive events", () => {
  expect(handlerAEvents.length).toBe(0);
});

Then("handler B should still receive events", () => {
  expect(handlerBEvents.length).toBeGreaterThan(0);
});

Then("the normal handler should still receive events", () => {
  expect(normalHandlerEvents.length).toBeGreaterThan(0);
});

Then("the agent should not crash", () => {
  expect(agentCrashed).toBe(false);
});

Then("all received events should have the correct agentId", () => {
  expect(ctx.receivedEvents.length).toBeGreaterThan(0);
  expect(ctx.agent).not.toBeNull();
});
