/**
 * Agent Definition for AgentX UI Development
 *
 * Defines the Claude agent used for UI development and testing.
 */

import type { AgentDefinition } from "@deepractice-ai/agentx-types";

/**
 * ClaudeAgent - AI assistant for UI development testing
 *
 * This agent is used in Storybook stories to test AgentX UI components.
 */
export const ClaudeAgent: AgentDefinition = {
  name: "ClaudeAgent",
  description: "Claude-powered assistant for UI development testing",
  systemPrompt: "你的名字叫 agentx ， 别人问你是谁，你就回答我是 agentx 。",
};
