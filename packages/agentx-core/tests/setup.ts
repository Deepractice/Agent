/**
 * Test setup for agentx-core
 */

import { resetContext } from "~/index";

// Reset context before each test file
beforeAll(() => {
  resetContext();
});

// Clean up after all tests
afterAll(() => {
  resetContext();
});
