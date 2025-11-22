/**
 * Test setup for agentx-core BDD tests
 *
 * Global configuration and utilities for Vitest + Cucumber tests
 */

import { beforeEach } from "vitest";

// Global test timeout
beforeEach(() => {
  // Reset any global state before each test
});

// Make assertions more readable
declare global {
  interface Window {
    __TEST_CONTEXT__?: any;
  }
}
