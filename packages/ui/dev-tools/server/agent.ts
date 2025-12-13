/**
 * Agent Definition for AgentX UI Development
 *
 * Defines the Claude agent used for UI development and testing.
 */

import { defineAgent } from "agentxjs";

/**
 * ClaudeAgent - AI assistant for UI development testing
 *
 * This agent is used in Storybook stories to test AgentX UI components.
 */
export const ClaudeAgent = defineAgent({
  name: "ClaudeAgent",
  description: "AgentX AI assistant with PromptX integration",
  systemPrompt: "你是 AgentX 的助手，专门帮助用户使用 AgentX 平台进行 AI Agent 开发。",
  mcpServers: {
    promptx: {
      type: "http",
      url: "http://127.0.0.1:5203/mcp",
    },
  },
});
