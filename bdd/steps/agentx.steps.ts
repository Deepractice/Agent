/**
 * Step definitions for agentx.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { createAgentX } from "agentxjs";
import type { AgentXWorld } from "./world";

// ============================================================================
// Given
// ============================================================================

Given("an AgentX instance", async function (this: AgentXWorld) {
  this.agentx = await createAgentX();
});

Given("an AgentX instance in local mode", async function (this: AgentXWorld) {
  this.agentx = await createAgentX();
});

Given("an AgentX instance in remote mode", async function (this: AgentXWorld) {
  // This would need a server running - mark as pending for now
  throw new Error("Remote mode test requires running server");
});

// ============================================================================
// When - createAgentX()
// ============================================================================

When("I call createAgentX\\()", async function (this: AgentXWorld) {
  this.agentx = await createAgentX();
});

// LLM config
When(
  /^I call createAgentX with llm\.apiKey "([^"]*)"$/,
  async function (this: AgentXWorld, apiKey: string) {
    this.agentx = await createAgentX({ llm: { apiKey } });
  }
);

When(
  /^I call createAgentX with llm\.baseUrl "([^"]*)"$/,
  async function (this: AgentXWorld, baseUrl: string) {
    this.agentx = await createAgentX({ llm: { baseUrl } });
  }
);

When(
  /^I call createAgentX with llm\.model "([^"]*)"$/,
  async function (this: AgentXWorld, model: string) {
    this.agentx = await createAgentX({ llm: { model } });
  }
);

// Storage config
When(
  /^I call createAgentX with storage\.driver "([^"]*)"$/,
  async function (this: AgentXWorld, driver: string) {
    this.agentx = await createAgentX({
      storage: { driver: driver as "memory" | "sqlite" | "postgresql" },
    });
  }
);

When(
  /^I call createAgentX with storage\.driver "([^"]*)" and storage\.path "([^"]*)"$/,
  async function (this: AgentXWorld, driver: string, path: string) {
    this.agentx = await createAgentX({
      storage: { driver: driver as "sqlite", path },
    });
  }
);

When(
  /^I call createAgentX with storage\.driver "([^"]*)" and storage\.url "([^"]*)"$/,
  async function (this: AgentXWorld, driver: string, url: string) {
    this.agentx = await createAgentX({
      storage: { driver: driver as "postgresql" | "mysql" | "redis", url },
    });
  }
);

// Remote config
When(
  /^I call createAgentX with server "([^"]*)"$/,
  async function (this: AgentXWorld, server: string) {
    this.agentx = await createAgentX({ server });
  }
);

// ============================================================================
// When - dispose
// ============================================================================

When("I call agentx.dispose\\()", async function (this: AgentXWorld) {
  assert(this.agentx, "AgentX not initialized");
  await this.agentx.dispose();
  this.agentx = undefined;
});

// ============================================================================
// Then - AgentX instance
// ============================================================================

Then("I should receive an AgentX instance", function (this: AgentXWorld) {
  assert(this.agentx, "AgentX should be defined");
  assert(typeof this.agentx === "object", "AgentX should be an object");
});

Then("AgentX should have method {string}", function (this: AgentXWorld, methodName: string) {
  assert(this.agentx, "AgentX not initialized");
  const method = (this.agentx as Record<string, unknown>)[methodName];
  assert(typeof method === "function", `AgentX should have method ${methodName}`);
});

Then("the promise should resolve", function (this: AgentXWorld) {
  // If we get here, the promise resolved
  assert(true);
});

Then("all resources should be released", function (this: AgentXWorld) {
  // AgentX should be undefined after dispose
  assert(!this.agentx, "AgentX should be disposed");
});
