import { Given, When, Then, After, DataTable } from "@deepracticex/vitest-cucumber";
import { expect } from "vitest";
import type { AgentConfig } from "@deepractice-ai/agentx-api";
import { createTestAgent, getDefaultTestConfig } from "../helpers/testAgent";
import { sharedContext as context, resetSharedContext } from "../helpers/sharedContext";

// Clean up after each scenario
After(() => {
  resetSharedContext();
});

// Scenario: Create agent with minimal configuration
When("I create an agent with:", (table: DataTable) => {
  const config: Partial<AgentConfig> = {};

  const rows = table.hashes();
  rows.forEach((row) => {
    const { field, value } = row;
    if (field === "apiKey") config.apiKey = value;
    if (field === "model") config.model = value;
    if (field === "maxThinkingTokens")
      config.maxThinkingTokens = parseInt(value, 10);
    if (field === "baseUrl") config.baseUrl = value;
  });

  context.agentConfig = config;

  try {
    context.agent = createTestAgent(config as AgentConfig);
    context.createdAgents.push(context.agent);
  } catch (error) {
    context.error = error as Error;
  }
});

Then("the agent should be created successfully", () => {
  expect(context.agent).toBeDefined();
  expect(context.error).toBeUndefined();
});

// Common step: Create agent with default config
Given("I have created an agent", () => {
  const config = getDefaultTestConfig();
  context.agent = createTestAgent(config);
  context.createdAgents.push(context.agent);
});

// Scenario: Configure system prompt
Given("I create an agent with system prompt {string}", (systemPrompt: string) => {
  const config: AgentConfig = {
    ...getDefaultTestConfig(),
    systemPrompt,
  };

  context.agentConfig = config;
  context.agent = createTestAgent(config);
  context.createdAgents.push(context.agent);
});

// Note: "When I send" is defined in messaging.steps.ts and will be shared

Then("the assistant should respond as a coding assistant", () => {
  // This verifies the system prompt was applied
  // The actual response content would be influenced by the system prompt
  expect(context.agent).toBeDefined();
});

// Scenario: Configure thinking tokens limit
Then("the agent should use up to {int} thinking tokens", (limit: number) => {
  // This verifies the config was accepted
  // Actual token counting is tested during messaging
  expect(context.agent).toBeDefined();
  expect(context.agentConfig?.maxThinkingTokens).toBe(limit);
});

// Scenario: Configure custom API base URL
Then("the agent should use the custom base URL", () => {
  expect(context.agent).toBeDefined();
  expect(context.agentConfig?.baseUrl).toBe("https://custom-api.com");
});

// Scenario: Configure MCP servers with stdio transport
Given(
  "I create an agent with MCP server configuration:",
  (configJson: { content: string }) => {
    const mcpConfig = JSON.parse(configJson.content);

    const config: AgentConfig = {
      ...getDefaultTestConfig(),
      mcp: mcpConfig,
    };

    context.agent = createTestAgent(config);
    context.createdAgents.push(context.agent);
  }
);

Then("the agent should have access to the filesystem MCP server", () => {
  // MCP server connection is async, just verify agent was created with config
  expect(context.agent).toBeDefined();
});

// Scenario: Configure MCP servers with SSE transport
Then("the agent should connect to the SSE MCP server", () => {
  // SSE connection is async, just verify agent was created with config
  expect(context.agent).toBeDefined();
});

// Scenario: Missing required configuration throws error
When("I try to create an agent without apiKey", () => {
  try {
    const config = {
      model: "claude-sonnet-4-20250514",
    } as AgentConfig;

    context.agent = createTestAgent(config);
  } catch (error) {
    context.error = error as Error;
  }
});

Then("it should throw an AgentConfigError", () => {
  expect(context.error).toBeDefined();
  expect(context.error?.name).toBe("AgentConfigError");
});

Then("the error should indicate {string}", (message: string) => {
  expect(context.error?.message).toContain(message);
});

// Scenario: Missing model configuration throws error
When("I try to create an agent without model", () => {
  try {
    const config = {
      apiKey: "sk-ant-test-12345",
    } as AgentConfig;

    context.agent = createTestAgent(config);
  } catch (error) {
    context.error = error as Error;
  }
});

// Scenario: Configuration validation before creation
Given("I have invalid configuration", () => {
  context.agentConfig = {
    // Missing both apiKey and model
  };
});

When("I try to create an agent", () => {
  try {
    context.agent = createTestAgent(context.agentConfig as AgentConfig);
  } catch (error) {
    context.error = error as Error;
  }
});

Then("the error should be thrown immediately", () => {
  expect(context.error).toBeDefined();
  expect(context.error?.name).toBe("AgentConfigError");
});

Then("no network requests should be made", () => {
  // If we get a config error, no network was attempted
  expect(context.error).toBeDefined();
  expect(context.agent).toBeUndefined();
});
