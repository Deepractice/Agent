/**
 * Test setup for agentx package
 *
 * This file is loaded before all tests run.
 */

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
