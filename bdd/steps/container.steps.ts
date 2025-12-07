/**
 * Step definitions for container.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

// ============================================================================
// Given
// ============================================================================

Given("container {string} exists", async function (this: AgentXWorld, containerId: string) {
  assert(this.agentx, "AgentX not initialized");
  await this.agentx.request("container_create_request", { containerId });
  this.createdContainers.push(containerId);
});

// ============================================================================
// When - request()
// ============================================================================

When(
  /^I call agentx\.request\("container_create_request", \{ containerId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, containerId: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("container_create_request", {
      containerId,
    });
  }
);

When(
  /^I call agentx\.request\("container_get_request", \{ containerId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, containerId: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("container_get_request", {
      containerId,
    });
  }
);

When(
  /^I call agentx\.request\("container_list_request", \{\}\)$/,
  async function (this: AgentXWorld) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("container_list_request", {});
  }
);

// ============================================================================
// Then - Response assertions
// ============================================================================

Then(/^I should receive a "([^"]*)" event$/, function (this: AgentXWorld, eventType: string) {
  assert(this.lastResponse, "No response received");
  assert.strictEqual(
    this.lastResponse.type,
    eventType,
    `Expected event type ${eventType}, got ${this.lastResponse.type}`
  );
});

Then(
  /^response\.data\.containerId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { containerId?: string };
    assert.strictEqual(data.containerId, expected);
  }
);

Then("response.data.error should be undefined", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { error?: string };
  assert.strictEqual(data.error, undefined);
});

Then("response.data.error should be defined", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { error?: string };
  assert(data.error !== undefined, "Expected error to be defined");
});

Then("response.data.exists should be true", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { exists?: boolean };
  assert.strictEqual(data.exists, true);
});

Then("response.data.exists should be false", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { exists?: boolean };
  assert.strictEqual(data.exists, false);
});

Then("response.data.containerIds should be an empty array", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { containerIds?: string[] };
  assert(Array.isArray(data.containerIds), "containerIds should be an array");
  assert.strictEqual(data.containerIds.length, 0, "containerIds should be empty");
});

Then(
  /^response\.data\.containerIds should contain "([^"]*)"$/,
  function (this: AgentXWorld, containerId: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { containerIds?: string[] };
    assert(Array.isArray(data.containerIds), "containerIds should be an array");
    assert(data.containerIds.includes(containerId), `containerIds should contain ${containerId}`);
  }
);
