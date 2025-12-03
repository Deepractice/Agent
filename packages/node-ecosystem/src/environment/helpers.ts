/**
 * Helper functions for Claude Environment
 */

import type { UserMessage } from "@agentxjs/types";
import type { SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

/**
 * Build prompt string from UserMessage
 */
export function buildPrompt(message: UserMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => (part as any).text)
      .join("\n");
  }
  return "";
}

/**
 * Build SDK UserMessage from AgentX UserMessage
 */
export function buildSDKUserMessage(message: UserMessage, sessionId: string): SDKUserMessage {
  return {
    type: "user",
    message: { role: "user", content: buildPrompt(message) },
    parent_tool_use_id: null,
    session_id: sessionId,
  };
}
