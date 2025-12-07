/**
 * Step definitions for server.feature (listen.feature)
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AgentXWorld } from "./world";
import { WebSocket } from "ws";

// ============================================================================
// State
// ============================================================================

interface ServerTestState {
  listenError?: Error;
  closeError?: Error;
}

function getServerState(world: AgentXWorld): ServerTestState {
  if (!(world as unknown as { _serverState?: ServerTestState })._serverState) {
    (world as unknown as { _serverState: ServerTestState })._serverState = {};
  }
  return (world as unknown as { _serverState: ServerTestState })._serverState;
}

// ============================================================================
// Given
// ============================================================================

Given(/^agentx is listening on port (\d+)$/, async function (this: AgentXWorld, port: number) {
  assert(this.agentx, "AgentX not initialized");
  await this.agentx.listen(port);
  this.usedPorts.push(port);
});

Given(
  /^agentx is already listening on port (\d+)$/,
  async function (this: AgentXWorld, port: number) {
    assert(this.agentx, "AgentX not initialized");
    await this.agentx.listen(port);
    this.usedPorts.push(port);
  }
);

// ============================================================================
// When - listen()
// ============================================================================

When(/^I call agentx\.listen\((\d+)\)$/, async function (this: AgentXWorld, port: number) {
  assert(this.agentx, "AgentX not initialized");

  const state = getServerState(this);

  try {
    await this.agentx.listen(port);
    this.usedPorts.push(port);
  } catch (err) {
    state.listenError = err as Error;
  }
});

When(
  /^I call agentx\.listen\((\d+), "([^"]*)"\)$/,
  async function (this: AgentXWorld, port: number, host: string) {
    assert(this.agentx, "AgentX not initialized");

    const state = getServerState(this);

    try {
      await this.agentx.listen(port, host);
      this.usedPorts.push(port);
    } catch (err) {
      state.listenError = err as Error;
    }
  }
);

// ============================================================================
// When - close()
// ============================================================================

When("I call agentx.close\\()", async function (this: AgentXWorld) {
  assert(this.agentx, "AgentX not initialized");

  const state = getServerState(this);

  try {
    await this.agentx.close();
  } catch (err) {
    state.closeError = err as Error;
  }
});

// ============================================================================
// Then - Assertions
// ============================================================================

Then(
  /^WebSocket server should be running on port (\d+)$/,
  async function (this: AgentXWorld, port: number) {
    // Try to connect to verify server is running
    const connected = await tryConnect(`ws://localhost:${port}`);
    assert(connected, `WebSocket server should be running on port ${port}`);
  }
);

Then(
  /^WebSocket server should be running on ([^:]+):(\d+)$/,
  async function (this: AgentXWorld, host: string, port: number) {
    const connected = await tryConnect(`ws://${host}:${port}`);
    assert(connected, `WebSocket server should be running on ${host}:${port}`);
  }
);

Then("WebSocket server should be stopped", async function (this: AgentXWorld) {
  // All used ports should be closed
  for (const port of this.usedPorts) {
    const connected = await tryConnect(`ws://localhost:${port}`, 500);
    assert(!connected, `WebSocket server on port ${port} should be stopped`);
  }
});

Then(/^it should throw "([^"]*)"$/, function (this: AgentXWorld, expectedMessage: string) {
  const state = getServerState(this);
  const error = state.listenError || state.closeError;

  assert(error, "Expected an error to be thrown");
  assert(
    error.message.includes(expectedMessage),
    `Expected error message to include "${expectedMessage}", got "${error.message}"`
  );
});

// ============================================================================
// Helper
// ============================================================================

async function tryConnect(url: string, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);

    const timer = setTimeout(() => {
      ws.close();
      resolve(false);
    }, timeout);

    ws.on("open", () => {
      clearTimeout(timer);
      ws.close();
      resolve(true);
    });

    ws.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
