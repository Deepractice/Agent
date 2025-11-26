/**
 * Session - Conversation history
 *
 * Records the history of a conversation.
 * Can be associated with one Agent at a time.
 */

import type { Message } from "./Message";

/**
 * Session - Conversation history container
 */
export interface Session {
  /**
   * Unique session ID
   */
  sessionId: string;

  /**
   * Associated agent ID (optional, can be bound later)
   */
  agentId?: string;

  /**
   * Session title (optional)
   */
  title?: string;

  /**
   * Messages in this session
   */
  messages: Message[];

  /**
   * When created
   */
  createdAt: Date;

  /**
   * When last updated
   */
  updatedAt: Date;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new session
 */
export function createSession(title?: string): Session {
  const now = new Date();
  return {
    sessionId: generateSessionId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Associate session with an agent
 */
export function associateAgent(session: Session, agentId: string): Session {
  return {
    ...session,
    agentId,
    updatedAt: new Date(),
  };
}

/**
 * Disassociate session from agent
 */
export function disassociateAgent(session: Session): Session {
  const { agentId: _, ...rest } = session;
  return {
    ...rest,
    updatedAt: new Date(),
  };
}

/**
 * Add message to session
 */
export function addMessage(session: Session, message: Message): Session {
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date(),
  };
}

/**
 * Get messages by agent ID
 */
export function getMessagesByAgent(session: Session, agentId: string): Message[] {
  return session.messages.filter((m) => m.agentId === agentId);
}

/**
 * Clear all messages
 */
export function clearMessages(session: Session): Session {
  return {
    ...session,
    messages: [],
    updatedAt: new Date(),
  };
}
