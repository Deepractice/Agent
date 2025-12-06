/**
 * Container Components - Business Logic Layer
 *
 * Integration layer that combines Pane (UI) with Hooks (logic).
 * These components:
 * - Use AgentX hooks (useImages, useAgent)
 * - Map hook data to pane props
 * - Handle events and callbacks
 * - Manage business state
 *
 * Architecture:
 * ```
 * pane/ (pure UI) + hooks/ (logic) = container/ (business components)
 * ```
 *
 * Components:
 * - AgentList: Conversation list with CRUD operations
 * - Chat: Chat interface with messages and input
 */

// AgentList - Conversation list
export { AgentList } from "./AgentList";
export type { AgentListProps } from "./AgentList";

// Chat - Chat interface
export { Chat } from "./Chat";
export type { ChatProps } from "./Chat";
