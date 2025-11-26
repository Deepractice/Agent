/**
 * Message - Entity in Session
 *
 * Represents a single message in a conversation.
 * Each message records which Agent produced it.
 *
 * Relationship with agentx-types Message:
 * - types Message: Industry-level, communication protocol (union type by role)
 * - core Message: Business-level, persistent record (unified interface with agentId)
 */

import type {
  ContentPart,
  Message as TypesMessage,
} from "@deepractice-ai/agentx-types";

/**
 * Message role types
 */
export type MessageRole = "user" | "assistant" | "tool" | "error" | "system";

/**
 * Message - A record in session history
 */
export interface Message {
  /**
   * Unique message ID
   */
  id: string;

  /**
   * Which Agent produced this message
   */
  agentId: string;

  /**
   * Message role
   */
  role: MessageRole;

  /**
   * Message content
   */
  content: string | ContentPart[];

  /**
   * Timestamp
   */
  timestamp: number;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Create a new message
 */
export function createMessage(
  agentId: string,
  role: MessageRole,
  content: string | ContentPart[],
  metadata?: Record<string, unknown>
): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    agentId,
    role,
    content,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Convert industry-level Message to business-level Message
 */
export function fromTypesMessage(msg: TypesMessage, agentId: string): Message {
  const roleMap: Record<string, MessageRole> = {
    user: "user",
    assistant: "assistant",
    system: "system",
    "tool-use": "tool",
    error: "error",
  };

  const role = roleMap[msg.role] ?? "assistant";

  let content: string | ContentPart[];
  if (msg.role === "tool-use") {
    content = [msg.toolCall, msg.toolResult];
  } else if (msg.role === "error") {
    content = msg.message;
  } else {
    content = msg.content;
  }

  return {
    id: msg.id,
    agentId,
    role,
    content,
    timestamp: msg.timestamp,
    metadata: "metadata" in msg ? (msg.metadata as Record<string, unknown>) : undefined,
  };
}
