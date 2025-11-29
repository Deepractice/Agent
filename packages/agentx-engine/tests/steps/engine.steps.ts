/**
 * Step definitions for engine.feature
 */

import { Given, When, Then, Before } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import {
  AgentEngine,
  createStreamPresenter,
  createMessagePresenter,
  createStatePresenter,
  type Driver,
  type Presenter,
  type AgentOutput,
} from "~/index";
import type { StreamEventType, UserMessage } from "@deepractice-ai/agentx-types";

// ===== Test Context =====

interface TestEvent {
  agentId: string;
  event: AgentOutput;
}

// All collected events
let events: TestEvent[] = [];
// Events by presenter name
let presenterEvents: Map<string, TestEvent[]> = new Map();
// Typed presenter events
let streamPresenterEvents: TestEvent[] = [];
let messagePresenterEvents: TestEvent[] = [];
let statePresenterEvents: TestEvent[] = [];
// Presenters list
let presenters: Presenter[] = [];
// Engine and driver
let engine: AgentEngine;
let driver: Driver;
// Error tracking
let engineError: Error | null = null;

Before(() => {
  events = [];
  presenterEvents = new Map();
  streamPresenterEvents = [];
  messagePresenterEvents = [];
  statePresenterEvents = [];
  presenters = [];
  engineError = null;
});

// ===== Mock Drivers =====

function createEchoDriver(): Driver {
  return async function* (message: UserMessage): AsyncIterable<StreamEventType> {
    const content =
      typeof message.content === "string"
        ? message.content
        : message.content.map((p) => ("text" in p ? p.text : "")).join("");

    const agentId = "test-agent";

    yield {
      type: "message_start",
      uuid: `uuid_1`,
      agentId,
      timestamp: Date.now(),
      data: { messageId: "msg_1", model: "mock" },
    } as StreamEventType;

    yield {
      type: "text_content_block_start",
      uuid: `uuid_2`,
      agentId,
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    for (const char of content) {
      yield {
        type: "text_delta",
        uuid: `uuid_${Math.random()}`,
        agentId,
        timestamp: Date.now(),
        data: { text: char },
      } as StreamEventType;
    }

    yield {
      type: "text_content_block_stop",
      uuid: `uuid_3`,
      agentId,
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    yield {
      type: "message_stop",
      uuid: `uuid_4`,
      agentId,
      timestamp: Date.now(),
      data: {
        stopReason: "end_turn",
        usage: { inputTokens: 10, outputTokens: content.length },
      },
    } as StreamEventType;
  };
}

function createFixedTextDriver(text: string): Driver {
  return async function* (_message: UserMessage): AsyncIterable<StreamEventType> {
    const agentId = "test-agent";

    yield {
      type: "message_start",
      uuid: `uuid_1`,
      agentId,
      timestamp: Date.now(),
      data: { messageId: "msg_1", model: "mock" },
    } as StreamEventType;

    yield {
      type: "text_content_block_start",
      uuid: `uuid_2`,
      agentId,
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    for (const char of text) {
      yield {
        type: "text_delta",
        uuid: `uuid_${Math.random()}`,
        agentId,
        timestamp: Date.now(),
        data: { text: char },
      } as StreamEventType;
    }

    yield {
      type: "text_content_block_stop",
      uuid: `uuid_3`,
      agentId,
      timestamp: Date.now(),
      data: { index: 0 },
    } as StreamEventType;

    yield {
      type: "message_stop",
      uuid: `uuid_4`,
      agentId,
      timestamp: Date.now(),
      data: {
        stopReason: "end_turn",
        usage: { inputTokens: 10, outputTokens: text.length },
      },
    } as StreamEventType;
  };
}

// ===== Given Steps =====

Given("a mock echo driver", () => {
  driver = createEchoDriver();
});

Given("a driver that streams {string} char by char", (text: string) => {
  driver = createFixedTextDriver(text);
});

Given("a driver that streams empty text", () => {
  driver = createFixedTextDriver("");
});

Given("a collecting presenter", () => {
  const presenter: Presenter = (agentId: string, event: AgentOutput) => {
    events.push({ agentId, event });
  };
  presenters.push(presenter);
});

Given("a presenter named {string}", (name: string) => {
  const namedEvents: TestEvent[] = [];
  presenterEvents.set(name, namedEvents);

  const presenter: Presenter = (agentId: string, event: AgentOutput) => {
    namedEvents.push({ agentId, event });
    events.push({ agentId, event });
  };
  presenters.push(presenter);
});

Given("a presenter that throws error", () => {
  const presenter: Presenter = () => {
    throw new Error("Presenter error");
  };
  presenters.push(presenter);
});

Given("a typed stream presenter", () => {
  const presenter = createStreamPresenter((agentId, event) => {
    streamPresenterEvents.push({ agentId, event: event as AgentOutput });
  });
  presenters.push(presenter);
});

Given("a typed message presenter", () => {
  const presenter = createMessagePresenter((agentId, event) => {
    messagePresenterEvents.push({ agentId, event: event as AgentOutput });
  });
  presenters.push(presenter);
});

Given("a typed state presenter", () => {
  const presenter = createStatePresenter((agentId, event) => {
    statePresenterEvents.push({ agentId, event: event as AgentOutput });
  });
  presenters.push(presenter);
});

Given("an AgentEngine", () => {
  engine = new AgentEngine({
    driver,
    presenters,
  });
});

Given("an AgentEngine with multiple presenters", () => {
  engine = new AgentEngine({
    driver,
    presenters,
  });
});

// ===== When Steps =====

When(
  "the engine receives {string} for agent {string}",
  async (message: string, agentId: string) => {
    try {
      await engine.receive(agentId, {
        role: "user",
        content: message,
        timestamp: Date.now(),
      });
    } catch (error) {
      engineError = error as Error;
    }
  }
);

// ===== Then Steps: Basic =====

Then("the presenter should have received events", () => {
  expect(events.length).toBeGreaterThan(0);
});

Then("the events should include {string}", (eventType: string) => {
  const hasType = events.some((e) => e.event.type === eventType);
  expect(hasType).toBe(true);
});

Then("the events should not include {string}", (eventType: string) => {
  const hasType = events.some((e) => e.event.type === eventType);
  expect(hasType).toBe(false);
});

Then("the assistant message should contain {string}", (expectedContent: string) => {
  const assistantMessages = events.filter((e) => e.event.type === "assistant_message");
  expect(assistantMessages.length).toBeGreaterThan(0);

  const message = assistantMessages[0].event as any;
  expect(message.data.content).toContain(expectedContent);
});

// ===== Then Steps: Stateless =====

Then(
  "agent {string} events should contain {string}",
  (agentId: string, expectedContent: string) => {
    const agentEvents = events.filter((e) => e.agentId === agentId);
    const textDeltas = agentEvents
      .filter((e) => e.event.type === "text_delta")
      .map((e) => (e.event as any).data.text)
      .join("");

    expect(textDeltas).toContain(expectedContent);
  }
);

Then("the engine should have no state field", () => {
  expect((engine as any).state).toBeUndefined();
});

Then("the engine should have no store field", () => {
  expect((engine as any).store).toBeUndefined();
});

// ===== Then Steps: AgentId =====

Then("all events should have agentId {string}", (expectedAgentId: string) => {
  for (const e of events) {
    expect(e.agentId).toBe(expectedAgentId);
  }
});

// ===== Then Steps: Ordering =====

Then("{string} should come before {string}", (firstType: string, secondType: string) => {
  const types = events.map((e) => e.event.type);
  const firstIndex = types.indexOf(firstType);
  const secondIndex = types.indexOf(secondType);

  expect(firstIndex).toBeGreaterThanOrEqual(0);
  expect(secondIndex).toBeGreaterThan(firstIndex);
});

// ===== Then Steps: Multiple Presenters =====

Then("presenter {string} should have received events", (name: string) => {
  const namedEvents = presenterEvents.get(name) || [];
  expect(namedEvents.length).toBeGreaterThan(0);
});

Then("the engine should not throw", () => {
  expect(engineError).toBeNull();
});

// ===== Then Steps: Typed Presenters =====

const STREAM_TYPES = [
  "message_start",
  "message_delta",
  "message_stop",
  "text_content_block_start",
  "text_delta",
  "text_content_block_stop",
  "tool_use_content_block_start",
  "input_json_delta",
  "tool_use_content_block_stop",
  "tool_call",
  "tool_result",
];

const MESSAGE_TYPES = ["user_message", "assistant_message", "tool_use_message", "error_message"];

const STATE_TYPES = [
  "agent_initializing",
  "agent_ready",
  "agent_destroyed",
  "conversation_start",
  "conversation_thinking",
  "conversation_responding",
  "conversation_end",
  "tool_planned",
  "tool_executing",
  "tool_completed",
  "tool_failed",
  "error_occurred",
];

Then("the stream presenter should have stream events", () => {
  expect(streamPresenterEvents.length).toBeGreaterThan(0);
  for (const e of streamPresenterEvents) {
    expect(STREAM_TYPES).toContain(e.event.type);
  }
});

Then("the stream presenter should not have message events", () => {
  for (const e of streamPresenterEvents) {
    expect(MESSAGE_TYPES).not.toContain(e.event.type);
  }
});

Then("the stream presenter should not have state events", () => {
  for (const e of streamPresenterEvents) {
    expect(STATE_TYPES).not.toContain(e.event.type);
  }
});

Then("the message presenter should have message events", () => {
  expect(messagePresenterEvents.length).toBeGreaterThan(0);
  for (const e of messagePresenterEvents) {
    expect(MESSAGE_TYPES).toContain(e.event.type);
  }
});

Then("the message presenter should not have stream events", () => {
  for (const e of messagePresenterEvents) {
    expect(STREAM_TYPES).not.toContain(e.event.type);
  }
});

Then("the state presenter should have state events", () => {
  expect(statePresenterEvents.length).toBeGreaterThan(0);
  for (const e of statePresenterEvents) {
    expect(STATE_TYPES).toContain(e.event.type);
  }
});

Then("the state presenter should not have stream events", () => {
  for (const e of statePresenterEvents) {
    expect(STREAM_TYPES).not.toContain(e.event.type);
  }
});

// ===== Then Steps: Re-injection =====

Then("assistant_message should be processed by turn tracker", () => {
  // Verified by the presence of assistant_message event
  // (turn tracker receives it via re-injection)
  const hasAssistantMessage = events.some((e) => e.event.type === "assistant_message");
  expect(hasAssistantMessage).toBe(true);
});

Then("state events should be produced from stream events", () => {
  const hasConversationStart = events.some((e) => e.event.type === "conversation_start");
  const hasConversationEnd = events.some((e) => e.event.type === "conversation_end");
  expect(hasConversationStart).toBe(true);
  expect(hasConversationEnd).toBe(true);
});

// ===== Then Steps: Driver Integration =====

Then("should receive {int} text_delta events", (count: number) => {
  const textDeltas = events.filter((e) => e.event.type === "text_delta");
  expect(textDeltas.length).toBe(count);
});

Then("combined text should be {string}", (expectedText: string) => {
  const textDeltas = events
    .filter((e) => e.event.type === "text_delta")
    .map((e) => (e.event as any).data.text)
    .join("");

  expect(textDeltas).toBe(expectedText);
});
