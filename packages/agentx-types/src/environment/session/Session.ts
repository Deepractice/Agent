import type { Message } from "~/agent/message/Message";

/**
 * Session - 1-to-1 Conversation Snapshot
 *
 * A session represents a conversation between a user and a specific agent.
 * It's a snapshot of the conversation history and context.
 *
 * Think of it as:
 * - Your chat history with a specific friend in WeChat
 * - A conversation thread with a particular assistant
 * - A saved conversation that maintains continuity
 *
 * ## Key Principles
 *
 * 1. **Session is data, Agent is runtime**
 *    - Session can be serialized and persisted
 *    - Agent instance reads Session to "revive" from snapshot
 *    - Session is passive (data), Agent is active (execution)
 *
 * 2. **Session records the relationship**
 *    - userId: Who is having the conversation
 *    - agentId: Which agent is serving this conversation
 *    - Users expect continuity - same agent, same context
 *
 * 3. **Session belongs to a specific user-agent pair**
 *    - Like chat history: you don't share your chat with friend A to friend B
 *    - Users build familiarity and trust with a specific agent
 *    - Switching agents would break the conversation continuity
 *
 * ## Usage Patterns
 *
 * ```typescript
 * // User selects an agent and starts conversation
 * const session = createSession({
 *   userId: "user-123",
 *   agentId: "writing-assistant",
 *   title: "My writing project"
 * });
 *
 * // Agent reads session to revive
 * const agent = new AgentService(driver);
 * agent.loadFromSession(session);
 *
 * // Continue conversation with the same agent
 * await agent.send("Continue from where we left off");
 *
 * // Save updated session
 * const updatedSession = agent.exportToSession();
 * await saveSession(updatedSession);
 * ```
 */
export interface Session {
  /** Unique identifier */
  id: string;

  /** Session title */
  title: string;

  /**
   * Which agent created or last served this session
   * Records which agent generated the conversation content
   *
   * Think of it like:
   * - You chat with your writing coach (not randomly switching coaches)
   * - You consult your family doctor (not seeing a different doctor each time)
   * - You work with your project manager (consistency matters)
   */
  agentId: string;

  /**
   * Which user owns this session (optional)
   *
   * Optional because:
   * - Some sessions are agent-initiated (no user involved)
   * - Background tasks or automated workflows
   * - Agent-to-agent conversations
   *
   * When present:
   * - Essential for multi-user scenarios and permission control
   * - Used for session filtering and user-specific history
   */
  userId?: string;

  /** All messages in this session (conversation history) */
  messages: Message[];

  /** When this session was created */
  createdAt: Date;

  /** When this session was last updated */
  updatedAt: Date;

  /**
   * Optional metadata for application-layer extensions
   * Examples: tags, categories, project info, etc.
   */
  metadata?: Record<string, unknown>;
}
