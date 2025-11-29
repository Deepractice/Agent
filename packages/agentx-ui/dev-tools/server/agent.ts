/**
 * Agent Definition for AgentX UI Development
 *
 * Defines the Claude agent used for UI development and testing.
 */

import { defineAgent } from "@deepractice-ai/agentx-adk";
import { ClaudeDriver } from "@deepractice-ai/agentx-claude";

/**
 * ClaudeAgent - AI assistant for UI development testing
 *
 * This agent is used in Storybook stories to test AgentX UI components.
 */
export const ClaudeAgent = defineAgent({
  name: "ClaudeAgent",
  description: "Claude-powered assistant for UI development testing",
  driver: ClaudeDriver,
  config: {
    model: "claude-sonnet-4-20250514",
    systemPrompt: "你的名字叫 agentx ， 别人问你是谁，你就回答我是 agentx 。",
    permissionMode: "bypassPermissions", // Test: definition-level permission mode
  },
});

/**
 * Default configuration for ClaudeAgent instances
 *
 * Used when creating agents dynamically via the API.
 * This will test if instance-level config can override definition-level config.
 */
export const defaultAgentConfig = {
  // apiKey and baseUrl will be provided by dev-server
  // model and systemPrompt are already in ClaudeAgent definition

  // Test override: This should override the definition's systemPrompt
  systemPrompt: "你是一个测试助手，名字叫 TestBot。别人问你是谁，你就回答我是 TestBot。",
};
