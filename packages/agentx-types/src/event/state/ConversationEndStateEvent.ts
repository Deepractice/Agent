/**
 * Conversation End State Event (L2: State Layer)
 *
 * State transition: Responding → ConversationEnded
 *
 * Emitted when a conversation round completes successfully.
 * A conversation is a single user-assistant interaction cycle.
 *
 * Contains the complete assistant response and conversation statistics.
 *
 * Note: Error results are emitted as ErrorStateEvent
 *
 * Aligned with: SDKResultMessage (subtype: "success") from @anthropic-ai/claude-agent-sdk
 */

import type { StateEvent } from "./StateEvent";
import type { AssistantMessage } from "~/message";
import type { TokenUsage } from "~/llm/TokenUsage";

export interface ConversationEndStateEvent extends StateEvent {
  type: "conversation_end";

  /**
   * Event data (conversation statistics)
   */
  data: {
    /**
     * Optional conversation identifier
     */
    conversationId?: string;

    /**
     * Complete assistant response
     */
    assistantMessage: AssistantMessage;

    /**
     * Total duration in milliseconds
     */
    durationMs: number;

    /**
     * API call duration in milliseconds
     */
    durationApiMs: number;

    /**
     * Number of turns in this conversation
     */
    numTurns: number;

    /**
     * Result message/description
     */
    result: string;

    /**
     * Total cost in USD for this conversation
     */
    totalCostUsd: number;

    /**
     * Token usage statistics for this conversation
     */
    usage: TokenUsage;
  };
}
