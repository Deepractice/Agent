/**
 * Conversation Reducer
 *
 * Conversation-first state management.
 * All events flow through this reducer to produce ConversationData[].
 */

import type {
  Message,
  ToolCallMessage,
  ToolResultMessage,
  AssistantMessage,
  ErrorMessage,
  UserMessage,
} from "agentxjs";
import type {
  ConversationState,
  ConversationAction,
  ConversationData,
  UserConversationData,
  AssistantConversationData,
  ErrorConversationData,
  ToolBlockData,
} from "./types";

/**
 * Initial state
 */
export const initialConversationState: ConversationState = {
  conversations: [],
  conversationIds: new Set(),
  pendingToolCalls: new Map(),
  streamingConversationId: null,
  streamingText: "",
  errors: [],
  agentStatus: "idle",
};

// ============================================================================
// History Processing
// ============================================================================

/**
 * Convert history messages to conversations
 * Groups tool-call messages with their parent assistant message
 */
function processHistoryMessages(messages: Message[]): {
  conversations: ConversationData[];
  conversationIds: Set<string>;
  pendingToolCalls: Map<string, string>;
} {
  const conversations: ConversationData[] = [];
  const conversationIds = new Set<string>();
  const pendingToolCalls = new Map<string, string>();

  // First pass: collect tool results by toolCallId
  const toolResultMap = new Map<string, ToolResultMessage>();
  for (const msg of messages) {
    if (msg.subtype === "tool-result") {
      const toolResult = msg as ToolResultMessage;
      toolResultMap.set(toolResult.toolCallId, toolResult);
      conversationIds.add(msg.id);
    }
  }

  // Second pass: collect tool-calls by parentId
  const toolCallsByParent = new Map<string, ToolCallMessage[]>();
  for (const msg of messages) {
    if (msg.subtype === "tool-call") {
      const toolCall = msg as ToolCallMessage;
      const parentId = toolCall.parentId || "orphan";
      const existing = toolCallsByParent.get(parentId) || [];
      existing.push(toolCall);
      toolCallsByParent.set(parentId, existing);
      conversationIds.add(msg.id);
    }
  }

  // Third pass: build conversations
  // Group consecutive assistant messages into single conversation
  let currentAssistantConversation: AssistantConversationData | null = null;

  for (const msg of messages) {
    if (msg.subtype === "tool-call" || msg.subtype === "tool-result") {
      continue;
    }

    conversationIds.add(msg.id);

    switch (msg.subtype) {
      case "user": {
        // Finalize any pending assistant conversation
        if (currentAssistantConversation) {
          conversations.push(currentAssistantConversation);
          currentAssistantConversation = null;
        }

        const userMsg = msg as UserMessage;
        const content =
          typeof userMsg.content === "string"
            ? userMsg.content
            : userMsg.content
                .filter((part) => part.type === "text")
                .map((part) => (part as { type: "text"; text: string }).text)
                .join("");

        conversations.push({
          type: "user",
          id: msg.id,
          content,
          timestamp: msg.timestamp,
          status: "success",
        } as UserConversationData);
        break;
      }

      case "assistant": {
        const assistantMsg = msg as AssistantMessage;
        const content =
          typeof assistantMsg.content === "string"
            ? assistantMsg.content
            : assistantMsg.content
                .filter((part) => part.type === "text")
                .map((part) => (part as { type: "text"; text: string }).text)
                .join("");

        // Get tool blocks for this message
        const toolCalls = toolCallsByParent.get(msg.id) || [];
        const blocks: ToolBlockData[] = toolCalls.map((tc) => {
          const result = toolResultMap.get(tc.toolCall.id);
          const hasResult = !!result;
          const isError =
            hasResult &&
            typeof result.toolResult.output === "object" &&
            result.toolResult.output !== null &&
            "type" in result.toolResult.output &&
            (result.toolResult.output as { type: string }).type === "error-text";

          return {
            id: tc.id,
            toolCallId: tc.toolCall.id,
            name: tc.toolCall.name,
            input: tc.toolCall.input,
            status: hasResult ? (isError ? "error" : "success") : "executing",
            output: result?.toolResult.output,
            duration: result ? (result.timestamp - tc.timestamp) / 1000 : undefined,
          } as ToolBlockData;
        });

        // Accumulate into current conversation or create new one
        if (currentAssistantConversation !== null) {
          // Accumulate content and blocks
          const existing: AssistantConversationData = currentAssistantConversation;
          currentAssistantConversation = {
            ...existing,
            messageIds: [...existing.messageIds, msg.id],
            content: existing.content + (content ? "\n\n" + content : ""),
            blocks: [...existing.blocks, ...blocks],
          };
        } else {
          currentAssistantConversation = {
            type: "assistant",
            id: `assistant_${msg.id}`,
            messageIds: [msg.id],
            content,
            timestamp: msg.timestamp,
            status: "completed",
            blocks,
          };
        }
        break;
      }

      case "error": {
        // Finalize any pending assistant conversation
        if (currentAssistantConversation) {
          conversations.push(currentAssistantConversation);
          currentAssistantConversation = null;
        }

        const errorMsg = msg as ErrorMessage;
        conversations.push({
          type: "error",
          id: msg.id,
          content: errorMsg.content,
          timestamp: msg.timestamp,
          errorCode: errorMsg.errorCode,
        } as ErrorConversationData);
        break;
      }
    }
  }

  // Finalize any pending assistant conversation
  if (currentAssistantConversation) {
    conversations.push(currentAssistantConversation);
  }

  // Handle orphan tool-calls (no parentId)
  const orphanToolCalls = toolCallsByParent.get("orphan") || [];
  if (orphanToolCalls.length > 0) {
    const blocks: ToolBlockData[] = orphanToolCalls.map((tc) => {
      const result = toolResultMap.get(tc.toolCall.id);
      const hasResult = !!result;
      const isError =
        hasResult &&
        typeof result.toolResult.output === "object" &&
        result.toolResult.output !== null &&
        "type" in result.toolResult.output &&
        (result.toolResult.output as { type: string }).type === "error-text";

      return {
        id: tc.id,
        toolCallId: tc.toolCall.id,
        name: tc.toolCall.name,
        input: tc.toolCall.input,
        status: hasResult ? (isError ? "error" : "success") : "executing",
        output: result?.toolResult.output,
        duration: result ? (result.timestamp - tc.timestamp) / 1000 : undefined,
      } as ToolBlockData;
    });

    conversations.push({
      type: "assistant",
      id: `assistant_orphan_${Date.now()}`,
      messageIds: [],
      content: "",
      timestamp: orphanToolCalls[0].timestamp,
      status: "completed",
      blocks,
    } as AssistantConversationData);
  }

  return { conversations, conversationIds, pendingToolCalls };
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Find the index of the streaming assistant conversation
 */
function findStreamingConversationIndex(state: ConversationState): number {
  if (!state.streamingConversationId) return -1;
  return state.conversations.findIndex(
    (c) => c.type === "assistant" && c.id === state.streamingConversationId
  );
}

/**
 * Conversation reducer
 */
export function conversationReducer(
  state: ConversationState,
  action: ConversationAction
): ConversationState {
  switch (action.type) {
    case "RESET":
      return initialConversationState;

    case "LOAD_HISTORY": {
      const { conversations, conversationIds, pendingToolCalls } = processHistoryMessages(
        action.messages
      );
      return {
        ...state,
        conversations,
        conversationIds,
        pendingToolCalls,
        streamingConversationId: null,
        streamingText: "",
      };
    }

    // ========== User Conversation ==========

    case "USER_CONVERSATION_ADD": {
      if (state.conversationIds.has(action.conversation.id)) {
        return state;
      }

      const newConversationIds = new Set(state.conversationIds);
      newConversationIds.add(action.conversation.id);

      return {
        ...state,
        conversations: [...state.conversations, action.conversation],
        conversationIds: newConversationIds,
      };
    }

    case "USER_CONVERSATION_STATUS": {
      const conversations = [...state.conversations];
      for (let i = conversations.length - 1; i >= 0; i--) {
        const conv = conversations[i];
        if (conv.type === "user" && conv.status === "pending") {
          conversations[i] = {
            ...conv,
            status: action.status,
            errorCode: action.errorCode,
          };
          break;
        }
      }
      return { ...state, conversations };
    }

    // ========== Assistant Conversation ==========

    case "ASSISTANT_CONVERSATION_START": {
      if (state.conversationIds.has(action.id)) {
        return state;
      }

      const newConversation: AssistantConversationData = {
        type: "assistant",
        id: action.id,
        messageIds: [],
        content: "",
        timestamp: Date.now(),
        status: "queued",
        blocks: [],
      };

      const newConversationIds = new Set(state.conversationIds);
      newConversationIds.add(action.id);

      return {
        ...state,
        conversations: [...state.conversations, newConversation],
        conversationIds: newConversationIds,
        streamingConversationId: action.id,
        streamingText: "",
      };
    }

    case "ASSISTANT_CONVERSATION_STATUS": {
      const index = findStreamingConversationIndex(state);
      if (index === -1) return state;

      const conversations = [...state.conversations];
      const conv = conversations[index] as AssistantConversationData;
      conversations[index] = { ...conv, status: action.status };

      return { ...state, conversations };
    }

    case "ASSISTANT_CONVERSATION_TEXT_DELTA": {
      return {
        ...state,
        streamingText: state.streamingText + action.text,
      };
    }

    case "ASSISTANT_CONVERSATION_MESSAGE_START": {
      // Add messageId to streaming conversation
      const index = findStreamingConversationIndex(state);
      if (index === -1) return state;

      const conversations = [...state.conversations];
      const conv = conversations[index] as AssistantConversationData;
      conversations[index] = {
        ...conv,
        messageIds: [...conv.messageIds, action.messageId],
      };

      return { ...state, conversations };
    }

    case "ASSISTANT_CONVERSATION_CONTENT": {
      // Accumulate content from assistant_message (don't end conversation!)
      const msg = action.message as AssistantMessage;

      const extractedContent =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("");

      const index = findStreamingConversationIndex(state);

      if (index !== -1) {
        const conversations = [...state.conversations];
        const existingConv = conversations[index] as AssistantConversationData;

        // Accumulate content (append with separator if existing content)
        const newContent = existingConv.content
          ? existingConv.content + "\n\n" + extractedContent
          : extractedContent || state.streamingText;

        conversations[index] = {
          ...existingConv,
          content: newContent,
          // Don't change status - still streaming!
          // Don't clear streamingConversationId - more content may come!
        };

        return {
          ...state,
          conversations,
          streamingText: "", // Reset streaming text after accumulating
        };
      } else {
        // No streaming conversation, check for duplicates
        const isDuplicate = state.conversations.some(
          (c) =>
            c.type === "assistant" && (c as AssistantConversationData).messageIds.includes(msg.id)
        );
        if (isDuplicate) {
          return state;
        }

        // Create new conversation (late arrival from history)
        const newConversation: AssistantConversationData = {
          type: "assistant",
          id: `assistant_${msg.id}`,
          messageIds: [msg.id],
          content: extractedContent,
          timestamp: msg.timestamp,
          status: "completed",
          blocks: [],
        };

        const newConversationIds = new Set(state.conversationIds);
        newConversationIds.add(newConversation.id);

        return {
          ...state,
          conversations: [...state.conversations, newConversation],
          conversationIds: newConversationIds,
        };
      }
    }

    case "ASSISTANT_CONVERSATION_FINISH": {
      // Called on conversation_end - now we can mark as completed
      const index = findStreamingConversationIndex(state);
      if (index === -1) return state;

      const conversations = [...state.conversations];
      const conv = conversations[index] as AssistantConversationData;

      // If there's remaining streaming text, append it
      const finalContent = state.streamingText
        ? conv.content
          ? conv.content + "\n\n" + state.streamingText
          : state.streamingText
        : conv.content;

      conversations[index] = {
        ...conv,
        content: finalContent,
        status: "completed",
      };

      return {
        ...state,
        conversations,
        streamingConversationId: null,
        streamingText: "",
      };
    }

    // ========== Tool Block ==========

    case "TOOL_BLOCK_ADD": {
      const msg = action.message;
      const parentMessageId = msg.parentId;

      // Find parent conversation by messageId
      let parentIndex = -1;
      if (parentMessageId) {
        parentIndex = state.conversations.findIndex(
          (c) =>
            c.type === "assistant" &&
            (c as AssistantConversationData).messageIds.includes(parentMessageId)
        );
      }

      // If not found by messageId, try streaming conversation
      if (parentIndex === -1 && state.streamingConversationId) {
        parentIndex = findStreamingConversationIndex(state);
      }

      if (parentIndex === -1) {
        // No parent found, create orphan assistant conversation
        const orphanConversation: AssistantConversationData = {
          type: "assistant",
          id: `assistant_for_${msg.id}`,
          messageIds: parentMessageId ? [parentMessageId] : [],
          content: "",
          timestamp: msg.timestamp,
          status: "streaming",
          blocks: [
            {
              id: msg.id,
              toolCallId: msg.toolCall.id,
              name: msg.toolCall.name,
              input: msg.toolCall.input,
              status: "executing",
              startTime: Date.now(),
            },
          ],
        };

        const newConversationIds = new Set(state.conversationIds);
        newConversationIds.add(orphanConversation.id);

        const newPendingToolCalls = new Map(state.pendingToolCalls);
        newPendingToolCalls.set(msg.toolCall.id, orphanConversation.id);

        return {
          ...state,
          conversations: [...state.conversations, orphanConversation],
          conversationIds: newConversationIds,
          pendingToolCalls: newPendingToolCalls,
          streamingConversationId: orphanConversation.id,
        };
      }

      // Add block to parent conversation
      const conversations = [...state.conversations];
      const parentConv = conversations[parentIndex] as AssistantConversationData;

      const newBlock: ToolBlockData = {
        id: msg.id,
        toolCallId: msg.toolCall.id,
        name: msg.toolCall.name,
        input: msg.toolCall.input,
        status: "executing",
        startTime: Date.now(),
      };

      conversations[parentIndex] = {
        ...parentConv,
        blocks: [...parentConv.blocks, newBlock],
      };

      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.set(msg.toolCall.id, parentConv.id);

      return {
        ...state,
        conversations,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    case "TOOL_BLOCK_RESULT": {
      const msg = action.message;
      const parentConversationId = state.pendingToolCalls.get(msg.toolCallId);

      if (!parentConversationId) {
        return state;
      }

      const parentIndex = state.conversations.findIndex(
        (c) => c.type === "assistant" && c.id === parentConversationId
      );

      if (parentIndex === -1) {
        return state;
      }

      const conversations = [...state.conversations];
      const parentConv = conversations[parentIndex] as AssistantConversationData;

      const blockIndex = parentConv.blocks.findIndex((b) => b.toolCallId === msg.toolCallId);

      if (blockIndex === -1) {
        return state;
      }

      const block = parentConv.blocks[blockIndex];
      const isError =
        typeof msg.toolResult.output === "object" &&
        msg.toolResult.output !== null &&
        "type" in msg.toolResult.output &&
        (msg.toolResult.output as { type: string }).type === "error-text";

      const now = Date.now();
      const duration = block.startTime ? (now - block.startTime) / 1000 : 0;

      const updatedBlock: ToolBlockData = {
        ...block,
        status: isError ? "error" : "success",
        output: msg.toolResult.output,
        duration,
      };

      const newBlocks = [...parentConv.blocks];
      newBlocks[blockIndex] = updatedBlock;

      conversations[parentIndex] = {
        ...parentConv,
        blocks: newBlocks,
      };

      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.delete(msg.toolCallId);

      return {
        ...state,
        conversations,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    // ========== Error Conversation ==========

    case "ERROR_CONVERSATION_ADD": {
      const msg = action.message as ErrorMessage;

      if (state.conversationIds.has(msg.id)) {
        return state;
      }

      const newConversation: ErrorConversationData = {
        type: "error",
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
        errorCode: msg.errorCode,
      };

      const newConversationIds = new Set(state.conversationIds);
      newConversationIds.add(msg.id);

      return {
        ...state,
        conversations: [...state.conversations, newConversation],
        conversationIds: newConversationIds,
        streamingConversationId: null,
        streamingText: "",
      };
    }

    case "ERROR_ADD": {
      return {
        ...state,
        errors: [...state.errors, action.error],
      };
    }

    case "ERRORS_CLEAR": {
      return {
        ...state,
        errors: [],
      };
    }

    // ========== Agent Status ==========

    case "AGENT_STATUS": {
      return {
        ...state,
        agentStatus: action.status,
      };
    }

    default:
      return state;
  }
}
