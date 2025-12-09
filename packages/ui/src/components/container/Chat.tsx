/**
 * Chat - Chat interface component
 *
 * Business component that combines MessagePane + InputPane with useAgent hook.
 * Displays messages and handles sending/receiving.
 *
 * In the Image-First model:
 * - Use imageId for conversation identity (preferred)
 * - Agent is auto-activated on first message
 * - Messages are auto-saved
 *
 * @example
 * ```tsx
 * <Chat
 *   agentx={agentx}
 *   imageId={currentImageId}
 * />
 * ```
 */

import * as React from "react";
import type {
  AgentX,
  ToolCallMessage,
  ToolResultMessage,
  AssistantMessage as AssistantMessageType,
} from "agentxjs";
import { Save, Smile, Paperclip, FolderOpen } from "lucide-react";
import { MessagePane, InputPane, type ToolBarItem } from "~/components/pane";
import { MessageRenderer, AssistantMessage } from "~/components/message";
import { useAgent, type UIMessage } from "~/hooks";
import { cn } from "~/utils";
import { ChatHeader } from "./ChatHeader";

export interface ChatProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Image ID for the conversation (preferred in Image-First model)
   */
  imageId?: string | null;
  /**
   * Agent ID to chat with (legacy, use imageId instead)
   * @deprecated Use imageId instead
   */
  agentId?: string | null;
  /**
   * Agent name to display in header
   */
  agentName?: string;
  /**
   * Callback when save button is clicked
   * Note: In Image-First model, messages are auto-saved
   */
  onSave?: () => void;
  /**
   * Show save button in toolbar
   * @default true
   */
  showSaveButton?: boolean;
  /**
   * Input placeholder text
   */
  placeholder?: string;
  /**
   * Height ratio for input pane (0-1)
   * @default 0.25
   */
  inputHeightRatio?: number;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Extended UIMessage with tool result attached
 * Used for pairing tool-call and tool-result
 */
type UIMessageWithToolResult = UIMessage & {
  metadata?: UIMessage["metadata"] & {
    toolResult?: ToolResultMessage;
  };
};

/**
 * Process messages for rendering
 * - Pair tool-call with tool-result
 * - Filter out standalone tool-result messages
 */
function processMessages(messages: UIMessage[]): UIMessage[] {
  // Build a map of tool-result by toolCallId
  const toolResultMap = new Map<string, ToolResultMessage>();

  messages.forEach((msg) => {
    if (msg.subtype === "tool-result") {
      const toolResult = msg as ToolResultMessage;
      toolResultMap.set(toolResult.toolCallId, toolResult);
    }
  });

  // Filter and enrich messages
  const processed: UIMessage[] = [];

  messages.forEach((msg) => {
    // Skip tool-result messages (they will be attached to tool-call)
    if (msg.subtype === "tool-result") {
      return;
    }

    // For tool-call messages, attach the corresponding tool-result
    if (msg.subtype === "tool-call") {
      const toolCall = msg as ToolCallMessage & UIMessage;
      // Now we can directly access toolCall field (proper Message structure)
      const toolCallId = toolCall.toolCall.id;

      const toolResult = toolResultMap.get(toolCallId);

      if (toolResult) {
        // Attach tool-result via metadata
        const enriched: UIMessageWithToolResult = {
          ...toolCall,
          metadata: {
            ...toolCall.metadata,
            toolResult,
          },
        };
        processed.push(enriched);
      } else {
        // No result yet, just add the tool-call
        processed.push(msg);
      }
      return;
    }

    // Other messages pass through
    processed.push(msg);
  });

  return processed;
}

/**
 * Chat component
 */
export function Chat({
  agentx,
  imageId,
  agentId: legacyAgentId,
  agentName,
  onSave,
  showSaveButton = true,
  placeholder = "Type a message...",
  inputHeightRatio = 0.25,
  className,
}: ChatProps) {
  // Use imageId (Image-First model)
  // legacyAgentId is deprecated and ignored
  const { messages, streaming, status, send, interrupt } = useAgent(agentx, imageId ?? null);

  // Process messages: pair tool-call with tool-result
  const processedMessages = React.useMemo(() => processMessages(messages), [messages]);

  // Determine loading state
  const isLoading =
    status === "thinking" ||
    status === "responding" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result";

  // Toolbar items
  const toolbarItems: ToolBarItem[] = React.useMemo(() => {
    const items: ToolBarItem[] = [
      { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
      { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach" },
      { id: "folder", icon: <FolderOpen className="w-4 h-4" />, label: "File" },
    ];
    return items;
  }, []);

  const toolbarRightItems: ToolBarItem[] = React.useMemo(() => {
    if (!showSaveButton || !onSave) return [];
    return [{ id: "save", icon: <Save className="w-4 h-4" />, label: "Save conversation" }];
  }, [showSaveButton, onSave]);

  const handleToolbarClick = React.useCallback(
    (id: string) => {
      if (id === "save" && onSave) {
        onSave();
      }
      // Other toolbar actions can be added here
    },
    [onSave]
  );

  // Calculate heights
  const inputHeight = `${Math.round(inputHeightRatio * 100)}%`;
  const messageHeight = `${Math.round((1 - inputHeightRatio) * 100)}%`;

  // Show empty state if no conversation selected
  if (!imageId && !legacyAgentId) {
    return (
      <div className={cn("flex flex-col h-full bg-background", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No conversation selected</p>
            <p className="text-sm">Select a conversation or start a new one</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <ChatHeader agentName={agentName} status={status} messageCount={messages.length} />

      {/* Message area */}
      <div style={{ height: messageHeight }} className="min-h-0">
        <MessagePane>
          {/* Render each message */}
          {processedMessages.map((message) => {
            // Assistant messages: handle all lifecycle states
            if (message.role === "assistant" && message.subtype === "assistant") {
              const assistantMsg = message as UIMessage & AssistantMessageType;
              const messageStatus = assistantMsg.metadata?.status as
                | "queued"
                | "thinking"
                | "responding"
                | "success"
                | undefined;

              return (
                <AssistantMessage
                  key={message.id}
                  message={assistantMsg}
                  status={messageStatus}
                  streamingText={streaming}
                />
              );
            }

            // All other messages render through handler chain
            return <MessageRenderer key={message.id} message={message} />;
          })}
        </MessagePane>
      </div>

      {/* Input area */}
      <div style={{ height: inputHeight }} className="min-h-0">
        <InputPane
          onSend={send}
          onStop={interrupt}
          isLoading={isLoading}
          placeholder={placeholder}
          toolbarItems={toolbarItems}
          toolbarRightItems={toolbarRightItems}
          onToolbarItemClick={handleToolbarClick}
        />
      </div>
    </div>
  );
}
