/**
 * Step definitions for agent.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

// ============================================================================
// Given
// ============================================================================

Given(
  /^agent "([^"]*)" exists in container "([^"]*)"$/,
  async function (this: AgentXWorld, agentName: string, containerId: string) {
    assert(this.agentx, "AgentX not initialized");

    const response = await this.agentx.request("agent_run_request", {
      containerId,
      config: { name: agentName },
    });

    const data = response.data as { agentId?: string };
    assert(data.agentId, "Agent creation failed");

    // Store the agentId with the name as alias
    this.createdAgents.set(agentName, data.agentId);
  }
);

// ============================================================================
// When - agent_run_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_run_request", \{ containerId: "([^"]*)", config: \{ name: "([^"]*)" \} \}\)$/,
  async function (this: AgentXWorld, containerId: string, name: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("agent_run_request", {
      containerId,
      config: { name },
    });
  }
);

When(
  /^I call agentx\.request\("agent_run_request", \{ containerId: "([^"]*)", config: \{ name: "([^"]*)", systemPrompt: "([^"]*)" \} \}\)$/,
  async function (this: AgentXWorld, containerId: string, name: string, systemPrompt: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("agent_run_request", {
      containerId,
      config: { name, systemPrompt },
    });
  }
);

// ============================================================================
// When - agent_get_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_get_request", \{ agentId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, agentIdOrName: string) {
    assert(this.agentx, "AgentX not initialized");

    // Check if it's an alias
    const agentId = this.createdAgents.get(agentIdOrName) ?? agentIdOrName;

    this.lastResponse = await this.agentx.request("agent_get_request", {
      agentId,
    });
  }
);

// ============================================================================
// When - agent_list_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_list_request", \{ containerId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, containerId: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("agent_list_request", {
      containerId,
    });
  }
);

// ============================================================================
// When - agent_interrupt_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_interrupt_request", \{ agentId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, agentIdOrName: string) {
    assert(this.agentx, "AgentX not initialized");

    const agentId = this.createdAgents.get(agentIdOrName) ?? agentIdOrName;

    this.lastResponse = await this.agentx.request("agent_interrupt_request", {
      agentId,
    });
  }
);

// ============================================================================
// When - agent_destroy_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_destroy_request", \{ agentId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, agentIdOrName: string) {
    assert(this.agentx, "AgentX not initialized");

    const agentId = this.createdAgents.get(agentIdOrName) ?? agentIdOrName;

    this.lastResponse = await this.agentx.request("agent_destroy_request", {
      agentId,
    });
  }
);

// ============================================================================
// When - agent_destroy_all_request
// ============================================================================

When(
  /^I call agentx\.request\("agent_destroy_all_request", \{ containerId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, containerId: string) {
    assert(this.agentx, "AgentX not initialized");
    this.lastResponse = await this.agentx.request("agent_destroy_all_request", {
      containerId,
    });
  }
);

// ============================================================================
// Then - Response assertions
// ============================================================================

Then("response.data.agentId should be defined", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { agentId?: string };
  assert(data.agentId !== undefined, "agentId should be defined");
});

Then(
  /^response\.data\.agentId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { agentId?: string };

    // Check if expected is an alias
    const expectedId = this.createdAgents.get(expected) ?? expected;
    assert.strictEqual(data.agentId, expectedId);
  }
);

Then(
  /^response\.data\.agents should have length (\d+)$/,
  function (this: AgentXWorld, expected: number) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { agents?: unknown[] };
    assert(Array.isArray(data.agents), "agents should be an array");
    assert.strictEqual(data.agents.length, expected);
  }
);

Then("response.data.success should be true", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { success?: boolean };
  assert.strictEqual(data.success, true);
});

Then("response.data.success should be false", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { success?: boolean };
  assert.strictEqual(data.success, false);
});

Then(
  /^container "([^"]*)" should have (\d+) agents$/,
  async function (this: AgentXWorld, containerId: string, expected: number) {
    assert(this.agentx, "AgentX not initialized");

    const response = await this.agentx.request("agent_list_request", {
      containerId,
    });

    const data = response.data as { agents?: unknown[] };
    assert(Array.isArray(data.agents), "agents should be an array");
    assert.strictEqual(data.agents.length, expected);
  }
);
