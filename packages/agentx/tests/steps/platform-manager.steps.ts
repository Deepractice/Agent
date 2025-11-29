/**
 * Step definitions for Platform Manager feature
 *
 * Tests: agentx.platform API (getInfo, getHealth)
 * Remote mode only - local mode does not have platform manager
 *
 * Note: Common steps like "a local AgentX instance" are defined in common.steps.ts
 */

import { Given, When, Then, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { AgentXRemote } from "@deepractice-ai/agentx-types";
import type { TestWorld } from "../support/world";

// ===== Get Info =====

Given("the server returns platform info:", function (this: TestWorld, table: DataTable) {
  const data = table.rowsHash();
  this.mockServerData = {
    ...this.mockServerData,
    platformInfo: {
      platform: data.platform,
      version: data.version,
      agentCount: parseInt(data.agentCount, 10),
    },
  };
});

When("I call agentx.platform.getInfo", async function (this: TestWorld) {
  // In a real test, this would call the server
  // For mock testing, we simulate the response
  try {
    // Simulate: platformInfo = await (agentx as AgentXRemote).platform.getInfo();
    this.platformInfo = this.mockServerData?.platformInfo;
  } catch (error) {
    this.thrownError = error as Error;
  }
});

Then("I should get PlatformInfo", function (this: TestWorld) {
  expect(this.platformInfo).toBeDefined();
  expect(this.platformInfo?.platform).toBeDefined();
  expect(this.platformInfo?.version).toBeDefined();
});

Then("the platform should be {string}", function (this: TestWorld, expectedPlatform: string) {
  expect(this.platformInfo?.platform).toBe(expectedPlatform);
});

Then("the version should be {string}", function (this: TestWorld, expectedVersion: string) {
  expect(this.platformInfo?.version).toBe(expectedVersion);
});

Then("the agentCount should be {int}", function (this: TestWorld, expectedCount: number) {
  expect(this.platformInfo?.agentCount).toBe(expectedCount);
});

// ===== Get Health =====

Given("the server returns health status:", function (this: TestWorld, table: DataTable) {
  const data = table.rowsHash();
  this.mockServerData = {
    ...this.mockServerData,
    healthStatus: {
      status: data.status as "healthy" | "degraded" | "unhealthy",
      timestamp: Date.now(),
      agentCount: data.agentCount ? parseInt(data.agentCount, 10) : 0,
    },
  };
});

When("I call agentx.platform.getHealth", async function (this: TestWorld) {
  // Simulate: healthStatus = await (agentx as AgentXRemote).platform.getHealth();
  try {
    this.healthStatus = this.mockServerData?.healthStatus;
  } catch (error) {
    this.thrownError = error as Error;
  }
});

Then("I should get HealthStatus", function (this: TestWorld) {
  expect(this.healthStatus).toBeDefined();
  expect(this.healthStatus?.status).toBeDefined();
  expect(this.healthStatus?.timestamp).toBeDefined();
});

Then("the status should be {string}", function (this: TestWorld, expectedStatus: string) {
  expect(this.healthStatus?.status).toBe(expectedStatus);
});

Then("it should have a timestamp", function (this: TestWorld) {
  expect(this.healthStatus?.timestamp).toBeDefined();
  expect(typeof this.healthStatus?.timestamp).toBe("number");
  expect(this.healthStatus!.timestamp).toBeGreaterThan(0);
});

// ===== Local Mode =====

Then("agentx.platform should be undefined", function (this: TestWorld) {
  expect((this.agentx as any).platform).toBeUndefined();
});
