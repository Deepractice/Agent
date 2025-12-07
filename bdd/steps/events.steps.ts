/**
 * Step definitions for events.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";
import type { SystemEvent } from "@agentxjs/types/event";

// ============================================================================
// State for event handling tests
// ============================================================================

interface EventTestState {
  lastUnsubscribe?: () => void;
  handlerCalled: boolean;
  receivedEvent?: SystemEvent;
  receivedEvents: SystemEvent[];
}

// Per-scenario state (attached to world)
function getEventState(world: AgentXWorld): EventTestState {
  if (!(world as unknown as { _eventState?: EventTestState })._eventState) {
    (world as unknown as { _eventState: EventTestState })._eventState = {
      handlerCalled: false,
      receivedEvents: [],
    };
  }
  return (world as unknown as { _eventState: EventTestState })._eventState;
}

// ============================================================================
// Given - Subscriptions
// ============================================================================

Given(/^I am subscribed to "([^"]*)" events$/, function (this: AgentXWorld, eventType: string) {
  assert(this.agentx, "AgentX not initialized");

  const state = getEventState(this);

  const unsubscribe = this.agentx.on(eventType, (event) => {
    state.handlerCalled = true;
    state.receivedEvent = event;
    state.receivedEvents.push(event);
  });

  this.eventHandlers.set(eventType, unsubscribe);
});

Given(
  /^I am subscribed via onCommand to "([^"]*)"$/,
  function (this: AgentXWorld, eventType: string) {
    assert(this.agentx, "AgentX not initialized");

    const state = getEventState(this);

    const unsubscribe = this.agentx.onCommand(eventType as "container_create_response", (event) => {
      state.handlerCalled = true;
      state.receivedEvent = event;
      state.receivedEvents.push(event);
    });

    this.eventHandlers.set(eventType, unsubscribe);
  }
);

// ============================================================================
// When - on() / onCommand()
// ============================================================================

When(/^I call agentx\.on\("([^"]*)", handler\)$/, function (this: AgentXWorld, eventType: string) {
  assert(this.agentx, "AgentX not initialized");

  const state = getEventState(this);

  state.lastUnsubscribe = this.agentx.on(eventType, (event) => {
    state.handlerCalled = true;
    state.receivedEvent = event;
    state.receivedEvents.push(event);
  });
});

When(
  /^I call agentx\.onCommand\("([^"]*)", handler\)$/,
  function (this: AgentXWorld, eventType: string) {
    assert(this.agentx, "AgentX not initialized");

    const state = getEventState(this);

    state.lastUnsubscribe = this.agentx.onCommand(
      eventType as "container_create_response",
      (event) => {
        state.handlerCalled = true;
        state.receivedEvent = event;
        state.receivedEvents.push(event);
      }
    );
  }
);

When(/^container "([^"]*)" is created$/, async function (this: AgentXWorld, containerId: string) {
  assert(this.agentx, "AgentX not initialized");
  await this.agentx.request("container_create_request", { containerId });
});

When("I call the unsubscribe function", function (this: AgentXWorld) {
  const state = getEventState(this);
  const unsubscribe = this.eventHandlers.values().next().value;
  if (unsubscribe) {
    unsubscribe();
  }
  state.handlerCalled = false; // Reset after unsubscribe
});

// ============================================================================
// Then - Assertions
// ============================================================================

Then("I should receive an Unsubscribe function", function (this: AgentXWorld) {
  const state = getEventState(this);
  assert(typeof state.lastUnsubscribe === "function", "Should receive an unsubscribe function");
});

Then(
  /^my handler should be called with "([^"]*)" event$/,
  function (this: AgentXWorld, eventType: string) {
    const state = getEventState(this);
    assert(state.handlerCalled, "Handler should have been called");
    assert(state.receivedEvent, "Should have received an event");
    assert.strictEqual(state.receivedEvent.type, eventType);
  }
);

Then("my handler should be called", function (this: AgentXWorld) {
  const state = getEventState(this);
  assert(state.handlerCalled, "Handler should have been called");
});

Then("my handler should not be called", function (this: AgentXWorld) {
  const state = getEventState(this);
  assert(!state.handlerCalled, "Handler should not have been called");
});

Then(/^event\.type should be "([^"]*)"$/, function (this: AgentXWorld, expected: string) {
  const state = getEventState(this);
  assert(state.receivedEvent, "Should have received an event");
  assert.strictEqual(state.receivedEvent.type, expected);
});

Then(
  /^event\.data\.containerId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    const state = getEventState(this);
    assert(state.receivedEvent, "Should have received an event");
    const data = state.receivedEvent.data as { containerId?: string };
    assert.strictEqual(data.containerId, expected);
  }
);

Then(
  /^event should have typed data with containerId "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    const state = getEventState(this);
    assert(state.receivedEvent, "Should have received an event");
    const data = state.receivedEvent.data as { containerId?: string };
    assert.strictEqual(data.containerId, expected);
  }
);
