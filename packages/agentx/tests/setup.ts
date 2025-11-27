/**
 * Test setup for agentx package
 *
 * This file is loaded before all tests run.
 */

import { setWorldConstructor, Before, After } from "@deepracticex/vitest-cucumber";
import { createWorld, resetWorld, type TestWorld } from "./support/world";

// Set world constructor - creates fresh world for each scenario
setWorldConstructor(createWorld);

// Reset world before each scenario
Before(function (this: TestWorld) {
  resetWorld(this);
});

// Cleanup after each scenario
After(async function (this: TestWorld) {
  // Destroy all agents
  for (const agent of this.agents) {
    try {
      await agent.destroy();
    } catch {
      // Ignore errors during cleanup
    }
  }
});

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: console.warn,
    error: console.error,
  };
}
