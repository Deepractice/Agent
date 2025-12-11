/**
 * Entry Reducer
 *
 * Entry-first state management.
 * All events flow through this reducer to produce EntryData[].
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
  EntryState,
  EntryAction,
  EntryData,
  UserEntryData,
  AssistantEntryData,
  ErrorEntryData,
  ToolBlockData,
} from "./types";

/**
 * Initial state
 */
export const initialEntryState: EntryState = {
  entries: [],
  entryIds: new Set(),
  pendingToolCalls: new Map(),
  streamingEntryId: null,
  streamingText: "",
  errors: [],
  agentStatus: "idle",
};

// ============================================================================
// History Processing
// ============================================================================

/**
 * Convert history messages to entries
 * Groups tool-call messages with their parent assistant message
 */
function processHistoryMessages(messages: Message[]): {
  entries: EntryData[];
  entryIds: Set<string>;
  pendingToolCalls: Map<string, string>;
} {
  const entries: EntryData[] = [];
  const entryIds = new Set<string>();
  const pendingToolCalls = new Map<string, string>();

  // First pass: collect tool results by toolCallId
  const toolResultMap = new Map<string, ToolResultMessage>();
  for (const msg of messages) {
    if (msg.subtype === "tool-result") {
      const toolResult = msg as ToolResultMessage;
      toolResultMap.set(toolResult.toolCallId, toolResult);
      entryIds.add(msg.id);
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
      entryIds.add(msg.id);
    }
  }

  // Third pass: build entries
  for (const msg of messages) {
    if (msg.subtype === "tool-call" || msg.subtype === "tool-result") {
      // Already processed above
      continue;
    }

    entryIds.add(msg.id);

    switch (msg.subtype) {
      case "user": {
        const userMsg = msg as UserMessage;
        const content =
          typeof userMsg.content === "string"
            ? userMsg.content
            : userMsg.content
                .filter((part) => part.type === "text")
                .map((part) => (part as { type: "text"; text: string }).text)
                .join("");

        entries.push({
          type: "user",
          id: msg.id,
          content,
          timestamp: msg.timestamp,
          status: "success",
        } as UserEntryData);
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

        // Get tool blocks for this assistant
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

        // For history, id and messageId are the same (both are backend message id)
        entries.push({
          type: "assistant",
          id: msg.id,
          messageId: msg.id,
          content,
          timestamp: msg.timestamp,
          status: "completed",
          blocks,
        } as AssistantEntryData);
        break;
      }

      case "error": {
        const errorMsg = msg as ErrorMessage;
        entries.push({
          type: "error",
          id: msg.id,
          content: errorMsg.content,
          timestamp: msg.timestamp,
          errorCode: errorMsg.errorCode,
        } as ErrorEntryData);
        break;
      }
    }
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

    // Create pseudo-assistant entry for orphan tools
    entries.push({
      type: "assistant",
      id: `assistant_orphan_${Date.now()}`,
      content: "",
      timestamp: orphanToolCalls[0].timestamp,
      status: "completed",
      blocks,
    } as AssistantEntryData);
  }

  return { entries, entryIds, pendingToolCalls };
}

// ============================================================================
// Reducer
// ============================================================================

/**
 * Find the index of the streaming assistant entry
 */
function findStreamingEntryIndex(state: EntryState): number {
  if (!state.streamingEntryId) return -1;
  return state.entries.findIndex((e) => e.type === "assistant" && e.id === state.streamingEntryId);
}

/**
 * Entry reducer
 */
export function entryReducer(state: EntryState, action: EntryAction): EntryState {
  switch (action.type) {
    case "RESET":
      return initialEntryState;

    case "LOAD_HISTORY": {
      const { entries, entryIds, pendingToolCalls } = processHistoryMessages(action.messages);
      return {
        ...state,
        entries,
        entryIds,
        pendingToolCalls,
        streamingEntryId: null,
        streamingText: "",
      };
    }

    // ========== User Entry ==========

    case "USER_ENTRY_ADD": {
      if (state.entryIds.has(action.entry.id)) {
        return state;
      }

      const newEntryIds = new Set(state.entryIds);
      newEntryIds.add(action.entry.id);

      return {
        ...state,
        entries: [...state.entries, action.entry],
        entryIds: newEntryIds,
      };
    }

    case "USER_ENTRY_STATUS": {
      // Update last user entry status
      const entries = [...state.entries];
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.type === "user" && entry.status === "pending") {
          entries[i] = {
            ...entry,
            status: action.status,
            errorCode: action.errorCode,
          };
          break;
        }
      }
      return { ...state, entries };
    }

    // ========== Assistant Entry ==========

    case "ASSISTANT_ENTRY_START": {
      if (state.entryIds.has(action.id)) {
        return state;
      }

      const newEntry: AssistantEntryData = {
        type: "assistant",
        id: action.id,
        content: "",
        timestamp: Date.now(),
        status: "queued",
        blocks: [],
      };

      const newEntryIds = new Set(state.entryIds);
      newEntryIds.add(action.id);

      return {
        ...state,
        entries: [...state.entries, newEntry],
        entryIds: newEntryIds,
        streamingEntryId: action.id,
        streamingText: "",
      };
    }

    case "ASSISTANT_ENTRY_STATUS": {
      const index = findStreamingEntryIndex(state);
      if (index === -1) return state;

      const entries = [...state.entries];
      const entry = entries[index] as AssistantEntryData;
      entries[index] = { ...entry, status: action.status };

      return { ...state, entries };
    }

    case "ASSISTANT_ENTRY_TEXT_DELTA": {
      return {
        ...state,
        streamingText: state.streamingText + action.text,
      };
    }

    case "ASSISTANT_ENTRY_MESSAGE_START": {
      // Set messageId on streaming entry (id stays the same)
      const index = findStreamingEntryIndex(state);
      if (index === -1) return state;

      const entries = [...state.entries];
      const entry = entries[index] as AssistantEntryData;
      entries[index] = { ...entry, messageId: action.messageId };

      return { ...state, entries };
    }

    case "ASSISTANT_ENTRY_COMPLETE": {
      const msg = action.message as AssistantMessage;

      // Extract content from message
      const extractedContent =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((part) => part.type === "text")
              .map((part) => (part as { type: "text"; text: string }).text)
              .join("");

      // Find streaming entry to update
      const index = findStreamingEntryIndex(state);

      if (index !== -1) {
        // Update existing streaming entry - id stays the same!
        const entries = [...state.entries];
        const existingEntry = entries[index] as AssistantEntryData;

        // Use extracted content, fallback to streamingText if empty
        const content = extractedContent || state.streamingText;

        entries[index] = {
          ...existingEntry,
          // id stays the same (never changes)
          messageId: msg.id, // ensure messageId is set
          content,
          status: "completed",
        };

        return {
          ...state,
          entries,
          streamingEntryId: null,
          streamingText: "",
        };
      } else {
        // No streaming entry, add as new (from history reload or late arrival)
        // Use messageId to check for duplicates
        const isDuplicate = state.entries.some(
          (e) => e.type === "assistant" && (e as AssistantEntryData).messageId === msg.id
        );
        if (isDuplicate) {
          return {
            ...state,
            streamingEntryId: null,
            streamingText: "",
          };
        }

        // For non-streaming entries, id and messageId are the same
        const newEntry: AssistantEntryData = {
          type: "assistant",
          id: msg.id,
          messageId: msg.id,
          content: extractedContent,
          timestamp: msg.timestamp,
          status: "completed",
          blocks: [],
        };

        const newEntryIds = new Set(state.entryIds);
        newEntryIds.add(msg.id);

        return {
          ...state,
          entries: [...state.entries, newEntry],
          entryIds: newEntryIds,
          streamingEntryId: null,
          streamingText: "",
        };
      }
    }

    // ========== Tool Block ==========

    case "TOOL_BLOCK_ADD": {
      const msg = action.message;
      const parentMessageId = msg.parentId; // Backend messageId

      // Find parent entry by messageId
      let parentIndex = -1;
      if (parentMessageId) {
        parentIndex = state.entries.findIndex(
          (e) => e.type === "assistant" && (e as AssistantEntryData).messageId === parentMessageId
        );
      }

      // If not found by messageId, try streaming entry
      if (parentIndex === -1 && state.streamingEntryId) {
        parentIndex = findStreamingEntryIndex(state);
      }

      if (parentIndex === -1) {
        // No parent found, create orphan assistant entry
        const orphanEntry: AssistantEntryData = {
          type: "assistant",
          id: `assistant_for_${msg.id}`,
          messageId: parentMessageId,
          content: "",
          timestamp: msg.timestamp,
          status: "completed", // Not streaming - just a container for orphan tools
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

        const newEntryIds = new Set(state.entryIds);
        newEntryIds.add(orphanEntry.id);

        const newPendingToolCalls = new Map(state.pendingToolCalls);
        newPendingToolCalls.set(msg.toolCall.id, orphanEntry.id);

        return {
          ...state,
          entries: [...state.entries, orphanEntry],
          entryIds: newEntryIds,
          pendingToolCalls: newPendingToolCalls,
        };
      }

      // Add block to parent entry
      const entries = [...state.entries];
      const parentEntry = entries[parentIndex] as AssistantEntryData;

      const newBlock: ToolBlockData = {
        id: msg.id,
        toolCallId: msg.toolCall.id,
        name: msg.toolCall.name,
        input: msg.toolCall.input,
        status: "executing",
        startTime: Date.now(),
      };

      entries[parentIndex] = {
        ...parentEntry,
        blocks: [...parentEntry.blocks, newBlock],
      };

      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.set(msg.toolCall.id, parentEntry.id); // Use entry.id

      return {
        ...state,
        entries,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    case "TOOL_BLOCK_RESULT": {
      const msg = action.message;
      const parentEntryId = state.pendingToolCalls.get(msg.toolCallId);

      if (!parentEntryId) {
        return state;
      }

      // Find parent entry
      const parentIndex = state.entries.findIndex(
        (e) => e.type === "assistant" && e.id === parentEntryId
      );

      if (parentIndex === -1) {
        return state;
      }

      const entries = [...state.entries];
      const parentEntry = entries[parentIndex] as AssistantEntryData;

      // Find and update the tool block
      const blockIndex = parentEntry.blocks.findIndex((b) => b.toolCallId === msg.toolCallId);

      if (blockIndex === -1) {
        return state;
      }

      const block = parentEntry.blocks[blockIndex];
      const isError =
        typeof msg.toolResult.output === "object" &&
        msg.toolResult.output !== null &&
        "type" in msg.toolResult.output &&
        (msg.toolResult.output as { type: string }).type === "error-text";

      // Calculate duration from startTime
      const now = Date.now();
      const duration = block.startTime ? (now - block.startTime) / 1000 : 0;

      const updatedBlock: ToolBlockData = {
        ...block,
        status: isError ? "error" : "success",
        output: msg.toolResult.output,
        duration,
      };

      const newBlocks = [...parentEntry.blocks];
      newBlocks[blockIndex] = updatedBlock;

      entries[parentIndex] = {
        ...parentEntry,
        blocks: newBlocks,
      };

      // Remove from pending
      const newPendingToolCalls = new Map(state.pendingToolCalls);
      newPendingToolCalls.delete(msg.toolCallId);

      return {
        ...state,
        entries,
        pendingToolCalls: newPendingToolCalls,
      };
    }

    // ========== Error Entry ==========

    case "ERROR_ENTRY_ADD": {
      const msg = action.message as ErrorMessage;

      if (state.entryIds.has(msg.id)) {
        return state;
      }

      const newEntry: ErrorEntryData = {
        type: "error",
        id: msg.id,
        content: msg.content,
        timestamp: msg.timestamp,
        errorCode: msg.errorCode,
      };

      const newEntryIds = new Set(state.entryIds);
      newEntryIds.add(msg.id);

      return {
        ...state,
        entries: [...state.entries, newEntry],
        entryIds: newEntryIds,
        streamingEntryId: null,
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
