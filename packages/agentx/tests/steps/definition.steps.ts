/**
 * Step definitions for agent-definition.feature
 */

import { Given, When, Then } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import { defineAgent, type DefinedAgent, type AgentDriver } from "~/index";
import type { StreamEventType, UserMessage, AgentContext } from "@deepractice-ai/agentx-types";
import { ctx } from "./common.steps";

// ===== Local Context =====

let driver: AgentDriver;
let definition: DefinedAgent | null = null;

// ===== Mock Driver =====

function createMockEchoDriver(): AgentDriver {
  return {
    name: "MockEchoDriver",
    description: "A mock driver that echoes input",
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

// ===== Given Steps =====

Given("a mock echo driver", () => {
  driver = createMockEchoDriver();
});

// ===== When Steps =====

When("I define an agent with name {string} and the driver", (name: string) => {
  definition = defineAgent({
    name,
    driver,
  });
});

When("I define an agent with:", (table: any) => {
  const rawTable = table.raw();
  const data: Record<string, string> = {};
  for (const [key, value] of rawTable) {
    data[key] = value;
  }

  definition = defineAgent({
    name: data.name,
    description: data.description,
    driver,
  });
});

When("I define an agent with config schema:", (table: any) => {
  const rawTable = table.raw();
  const headers = rawTable[0];
  const rows = rawTable.slice(1);

  const configSchema: Record<string, any> = {};

  for (const row of rows) {
    const field: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const value = row[i];

      if (header === "field") continue;
      if (header === "type") field.type = value;
      if (header === "required") field.required = value === "true";
      if (header === "default") field.default = value;
    }

    const fieldName = row[headers.indexOf("field")];
    configSchema[fieldName] = field;
  }

  definition = defineAgent({
    name: "SchemaAgent",
    driver,
    configSchema,
  });
});

When("I try to define an agent without name", () => {
  try {
    definition = defineAgent({
      name: "",
      driver,
    });
  } catch (error) {
    ctx.caughtError = error as Error;
  }
});

When("I try to define an agent without driver", () => {
  try {
    definition = defineAgent({
      name: "NoDriverAgent",
      driver: null as any,
    });
  } catch (error) {
    ctx.caughtError = error as Error;
  }
});

// ===== Then Steps =====

Then("the agent definition should have name {string}", (expectedName: string) => {
  expect(definition).not.toBeNull();
  expect(definition!.name).toBe(expectedName);
});

Then("the agent definition should have the driver", () => {
  expect(definition).not.toBeNull();
  expect(definition!.driver).toBe(driver);
});

Then("the agent definition should have description {string}", (expectedDesc: string) => {
  expect(definition).not.toBeNull();
  expect(definition!.description).toBe(expectedDesc);
});

Then("the agent definition should have config schema", () => {
  expect(definition).not.toBeNull();
  expect(definition!.configSchema).toBeDefined();
});

Then(
  "the config schema should have field {string} of type {string}",
  (fieldName: string, fieldType: string) => {
    expect(definition).not.toBeNull();
    expect(definition!.configSchema).toBeDefined();
    expect(definition!.configSchema![fieldName]).toBeDefined();
    expect(definition!.configSchema![fieldName].type).toBe(fieldType);
  }
);

Then("the config schema field {string} should be required", (fieldName: string) => {
  expect(definition).not.toBeNull();
  expect(definition!.configSchema![fieldName].required).toBe(true);
});

Then(
  "the config schema field {string} should have default {string}",
  (fieldName: string, defaultValue: string) => {
    expect(definition).not.toBeNull();
    expect(definition!.configSchema![fieldName].default).toBe(defaultValue);
  }
);

Then("it should throw error containing {string}", (errorMsg: string) => {
  expect(ctx.caughtError).not.toBeNull();
  expect(ctx.caughtError!.message).toContain(errorMsg);
});

Then("the agent definition should be frozen", () => {
  expect(definition).not.toBeNull();
  expect(Object.isFrozen(definition)).toBe(true);
});

Then("modifying the definition should throw error", () => {
  expect(definition).not.toBeNull();
  expect(() => {
    (definition as any).name = "Modified";
  }).toThrow();
});
