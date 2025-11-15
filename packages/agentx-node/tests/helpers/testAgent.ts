/**
 * Test Agent Helpers
 *
 * Utilities for creating agents in tests.
 * Supports both MockProvider (default) and real ClaudeProvider (opt-in).
 */

import { createAgent as createAgentCore } from "@deepractice-ai/agentx-core";
import type { Agent, AgentConfig } from "@deepractice-ai/agentx-api";
import { MockProvider, type MockProviderOptions } from "../mocks/MockProvider";
import { ClaudeProvider } from "~/providers/ClaudeProvider";

/**
 * Test mode - controlled by environment variable
 *
 * - "mock" (default): Use MockProvider for fast, deterministic tests
 * - "integration": Use real ClaudeProvider for integration tests
 *
 * Set via: TEST_MODE=integration pnpm test
 */
export const TEST_MODE = process.env.TEST_MODE || "mock";

/**
 * Check if we should use real API
 */
export function useRealAPI(): boolean {
  return TEST_MODE === "integration";
}

/**
 * Create an agent for testing
 *
 * By default uses MockProvider. Set TEST_MODE=integration to use real API.
 *
 * @param config - Agent configuration
 * @param mockOptions - Options for MockProvider (ignored if using real API)
 * @returns Agent instance
 *
 * @example
 * ```typescript
 * // Unit test with mock (default)
 * const agent = createTestAgent({
 *   apiKey: "test-key",
 *   model: "claude-sonnet-4",
 * });
 *
 * // Integration test with real API
 * // Run with: TEST_MODE=integration pnpm test
 * const agent = createTestAgent({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: "claude-sonnet-4",
 * });
 * ```
 */
export function createTestAgent(
  config: AgentConfig,
  mockOptions?: MockProviderOptions
): Agent {
  if (useRealAPI()) {
    // Integration test mode - use real ClaudeProvider
    const provider = new ClaudeProvider(config);
    return createAgentCore(config, provider);
  } else {
    // Unit test mode (default) - use MockProvider
    const provider = new MockProvider(config, mockOptions);
    return createAgentCore(config, provider);
  }
}

/**
 * Get default test config
 *
 * Returns appropriate config based on test mode:
 * - Mock mode: uses dummy API key
 * - Integration mode: uses real API key from env
 */
export function getDefaultTestConfig(): AgentConfig {
  return {
    apiKey: useRealAPI()
      ? process.env.ANTHROPIC_API_KEY || ""
      : "mock-api-key",
    model: "claude-sonnet-4-20250514",
  };
}

/**
 * Skip test if not in integration mode
 *
 * Use this to mark tests that require real API
 *
 * @example
 * ```typescript
 * Given("I send a complex multi-turn conversation", function() {
 *   skipUnlessIntegration();
 *   // This test only runs with TEST_MODE=integration
 * });
 * ```
 */
export function skipUnlessIntegration() {
  if (!useRealAPI()) {
    // @ts-ignore - vitest provides this
    this.skip();
  }
}

/**
 * Skip test if in integration mode
 *
 * Use this for tests that should only run with mock
 *
 * @example
 * ```typescript
 * Given("I simulate a network error", function() {
 *   skipIfIntegration();
 *   // This test only runs in mock mode
 * });
 * ```
 */
export function skipIfIntegration() {
  if (useRealAPI()) {
    // @ts-ignore - vitest provides this
    this.skip();
  }
}
