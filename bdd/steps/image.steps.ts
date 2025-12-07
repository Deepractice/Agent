/**
 * Step definitions for image.feature
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";

// ============================================================================
// Given
// ============================================================================

Given(
  /^agent "([^"]*)" has been snapshotted$/,
  async function (this: AgentXWorld, agentName: string) {
    assert(this.agentx, "AgentX not initialized");

    const agentId = this.createdAgents.get(agentName);
    assert(agentId, `Agent ${agentName} not found`);

    const response = await this.agentx.request("image_snapshot_request", {
      agentId,
    });

    const data = response.data as { record?: { imageId: string } };
    assert(data.record?.imageId, "Snapshot failed");
  }
);

Given(
  /^agent "([^"]*)" has been snapshotted as "([^"]*)"$/,
  async function (this: AgentXWorld, agentName: string, imageAlias: string) {
    assert(this.agentx, "AgentX not initialized");

    const agentId = this.createdAgents.get(agentName);
    assert(agentId, `Agent ${agentName} not found`);

    const response = await this.agentx.request("image_snapshot_request", {
      agentId,
    });

    const data = response.data as { record?: { imageId: string } };
    assert(data.record?.imageId, "Snapshot failed");

    // Store the imageId with alias
    this.createdImages.set(imageAlias, data.record.imageId);
  }
);

// ============================================================================
// When - image_snapshot_request
// ============================================================================

When(
  /^I call agentx\.request\("image_snapshot_request", \{ agentId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, agentIdOrName: string) {
    assert(this.agentx, "AgentX not initialized");

    const agentId = this.createdAgents.get(agentIdOrName) ?? agentIdOrName;

    this.lastResponse = await this.agentx.request("image_snapshot_request", {
      agentId,
    });
  }
);

// ============================================================================
// When - image_list_request
// ============================================================================

When(/^I call agentx\.request\("image_list_request", \{\}\)$/, async function (this: AgentXWorld) {
  assert(this.agentx, "AgentX not initialized");
  this.lastResponse = await this.agentx.request("image_list_request", {});
});

// ============================================================================
// When - image_get_request
// ============================================================================

When(
  /^I call agentx\.request\("image_get_request", \{ imageId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, imageIdOrAlias: string) {
    assert(this.agentx, "AgentX not initialized");

    const imageId = this.createdImages.get(imageIdOrAlias) ?? imageIdOrAlias;

    this.lastResponse = await this.agentx.request("image_get_request", {
      imageId,
    });
  }
);

// ============================================================================
// When - image_resume_request
// ============================================================================

When(
  /^I call agentx\.request\("image_resume_request", \{ imageId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, imageIdOrAlias: string) {
    assert(this.agentx, "AgentX not initialized");

    const imageId = this.createdImages.get(imageIdOrAlias) ?? imageIdOrAlias;

    this.lastResponse = await this.agentx.request("image_resume_request", {
      imageId,
    });
  }
);

// ============================================================================
// When - image_delete_request
// ============================================================================

When(
  /^I call agentx\.request\("image_delete_request", \{ imageId: "([^"]*)" \}\)$/,
  async function (this: AgentXWorld, imageIdOrAlias: string) {
    assert(this.agentx, "AgentX not initialized");

    const imageId = this.createdImages.get(imageIdOrAlias) ?? imageIdOrAlias;

    this.lastResponse = await this.agentx.request("image_delete_request", {
      imageId,
    });
  }
);

// ============================================================================
// Then - Response assertions
// ============================================================================

Then("response.data.record should be defined", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { record?: unknown };
  assert(data.record !== undefined, "record should be defined");
});

Then("response.data.record should be null", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { record?: unknown };
  assert(data.record === null, "record should be null");
});

Then(/^response\.data\.record\.imageId should be defined$/, function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { record?: { imageId?: string } };
  assert(data.record?.imageId !== undefined, "record.imageId should be defined");
});

Then(
  /^response\.data\.record\.imageId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { record?: { imageId?: string } };

    const expectedId = this.createdImages.get(expected) ?? expected;
    assert.strictEqual(data.record?.imageId, expectedId);
  }
);

Then(
  /^response\.data\.record\.agentId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { record?: { agentId?: string } };

    const expectedId = this.createdAgents.get(expected) ?? expected;
    assert.strictEqual(data.record?.agentId, expectedId);
  }
);

Then("response.data.records should be an empty array", function (this: AgentXWorld) {
  assert(this.lastResponse, "No response received");
  const data = this.lastResponse.data as { records?: unknown[] };
  assert(Array.isArray(data.records), "records should be an array");
  assert.strictEqual(data.records.length, 0, "records should be empty");
});

Then(
  /^response\.data\.records should have length (\d+)$/,
  function (this: AgentXWorld, expected: number) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { records?: unknown[] };
    assert(Array.isArray(data.records), "records should be an array");
    assert.strictEqual(data.records.length, expected);
  }
);

Then(
  /^response\.data\.imageId should be "([^"]*)"$/,
  function (this: AgentXWorld, expected: string) {
    assert(this.lastResponse, "No response received");
    const data = this.lastResponse.data as { imageId?: string };

    const expectedId = this.createdImages.get(expected) ?? expected;
    assert.strictEqual(data.imageId, expectedId);
  }
);

Then(/^image "([^"]*)" should not exist$/, async function (this: AgentXWorld, imageAlias: string) {
  assert(this.agentx, "AgentX not initialized");

  const imageId = this.createdImages.get(imageAlias) ?? imageAlias;

  const response = await this.agentx.request("image_get_request", { imageId });
  const data = response.data as { record?: unknown };

  assert(data.record === null, `Image ${imageAlias} should not exist`);
});
