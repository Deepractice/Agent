/**
 * Common step definitions and shared context
 *
 * All shared steps are defined here ONLY ONCE.
 * Other step files import ctx and add their own unique steps.
 */

import { Before, After, Given } from "@deepracticex/vitest-cucumber";
import {
  destroyAll,
  defineAgent,
  createAgent,
  type Agent,
  type AgentDriver,
  type AgentEventType,
  type Unsubscribe,
} from "~/index";
import type { StreamEventType, UserMessage, AgentContext } from "@deepractice-ai/agentx-types";
import type { DefinedAgent } from "~/defineAgent";

// ===== Shared Test Context =====

export interface TestContext {
  definedAgent: DefinedAgent | null;
  agent: Agent | null | undefined;
  agents: Agent[];
  receivedEvents: AgentEventType[];
  caughtError: Error | null;
  unsubscribeFn: Unsubscribe | null;
  knownAgentId: string | null;
  messagesProcessed: number;
}

export const ctx: TestContext = {
  definedAgent: null,
  agent: null,
  agents: [],
  receivedEvents: [],
  caughtError: null,
  unsubscribeFn: null,
  knownAgentId: null,
  messagesProcessed: 0,
};

// ===== Hooks =====

Before(() => {
  ctx.definedAgent = null;
  ctx.agent = null;
  ctx.agents = [];
  ctx.receivedEvents = [];
  ctx.caughtError = null;
  ctx.unsubscribeFn = null;
  ctx.knownAgentId = null;
  ctx.messagesProcessed = 0;
});

After(async () => {
  await destroyAll();
});

// ===== Mock Driver Factory =====

export function createMockEchoDriver(): AgentDriver {
  return {
    name: "MockEchoDriver",
    async *receive(
      message: UserMessage,
      _context: AgentContext
    ): AsyncIterable<StreamEventType> {
      const content =
        typeof message.content === "string"
          ? message.content
          : message.content.map((p) => ("text" in p ? p.text : "")).join("");

      yield {
        type: "message_start",
        uuid: `uuid_1`,
        agentId: "test",
        timestamp: Date.now(),
        data: { messageId: "msg_1", model: "mock" },
      } as StreamEventType;

      yield {
        type: "text_content_block_start",
        uuid: `uuid_2`,
        agentId: "test",
        timestamp: Date.now(),
        data: { index: 0 },
      } as StreamEventType;

      for (const char of content) {
        yield {
          type: "text_delta",
          uuid: `uuid_${Math.random()}`,
          agentId: "test",
          timestamp: Date.now(),
          data: { text: char },
        } as StreamEventType;
      }

      yield {
        type: "text_content_block_stop",
        uuid: `uuid_3`,
        agentId: "test",
        timestamp: Date.now(),
        data: { index: 0 },
      } as StreamEventType;

      yield {
        type: "message_stop",
        uuid: `uuid_4`,
        agentId: "test",
        timestamp: Date.now(),
        data: {
          stopReason: "end_turn",
          usage: { inputTokens: 10, outputTokens: content.length },
        },
      } as StreamEventType;
    },
  };
}

// ===== Common Given Steps (ONLY defined here) =====

Given("a defined agent {string} with echo driver", (name: string) => {
  ctx.definedAgent = defineAgent({
    name,
    driver: createMockEchoDriver(),
    configSchema: {
      apiKey: { type: "string", required: true },
    },
  });
});

Given("an agent instance is created", () => {
  ctx.agent = createAgent(ctx.definedAgent!, { apiKey: "test-key" });
});

Given("I subscribe to all events", () => {
  if (ctx.agent) {
    ctx.agent.on((event) => {
      ctx.receivedEvents.push(event);
    });
  }
});
