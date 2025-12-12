/**
 * Chat - Chat interface component
 *
 * Business component that combines MessagePane + InputPane with useAgent hook.
 * Displays conversations and handles sending/receiving.
 *
 * Uses Conversation-first, Block-based design:
 * - conversations: all conversation entries (user, assistant, error)
 * - streamingText: current streaming text for active TextBlock
 * - currentTextBlockId: id of the TextBlock receiving streaming text
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
import type { AgentX } from "agentxjs";
import { Save, Smile, Paperclip, FolderOpen } from "lucide-react";
import { MessagePane, InputPane, type ToolBarItem } from "~/components/pane";
import { UserEntry, AssistantEntry, ErrorEntry } from "~/components/entry";
import { useAgent, type ConversationData } from "~/hooks";
import { cn } from "~/utils";
import { ChatHeader } from "./ChatHeader";

export interface ChatProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Image ID for the conversation
   */
  imageId?: string | null;
  /**
   * Agent name to display in header
   */
  agentName?: string;
  /**
   * Callback when save button is clicked
   */
  onSave?: () => void;
  /**
   * Show save button in toolbar
   * @default false
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
 * Render a single conversation based on its type
 */
function renderConversation(
  conversation: ConversationData,
  streamingText: string,
  currentTextBlockId: string | null,
  onStop?: () => void
): React.ReactNode {
  switch (conversation.type) {
    case "user":
      return <UserEntry key={conversation.id} entry={conversation} />;

    case "assistant":
      return (
        <AssistantEntry
          key={conversation.id}
          entry={conversation}
          streamingText={streamingText}
          currentTextBlockId={currentTextBlockId}
          onStop={onStop}
        />
      );

    case "error":
      return <ErrorEntry key={conversation.id} entry={conversation} />;

    default:
      return null;
  }
}

/**
 * Chat component
 */
export function Chat({
  agentx,
  imageId,
  agentName,
  onSave,
  showSaveButton = false,
  placeholder = "Type a message...",
  inputHeightRatio = 0.25,
  className,
}: ChatProps) {
  // Use Conversation-first, Block-based state
  const { conversations, streamingText, currentTextBlockId, status, send, interrupt } = useAgent(
    agentx,
    imageId ?? null
  );

  // Determine loading state
  const isLoading =
    status === "thinking" ||
    status === "responding" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result";

  // ESC key to interrupt
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoading) {
        e.preventDefault();
        interrupt();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, interrupt]);

  // Toolbar items
  const toolbarItems: ToolBarItem[] = React.useMemo(
    () => [
      { id: "emoji", icon: <Smile className="w-4 h-4" />, label: "Emoji" },
      { id: "attach", icon: <Paperclip className="w-4 h-4" />, label: "Attach" },
      { id: "folder", icon: <FolderOpen className="w-4 h-4" />, label: "File" },
    ],
    []
  );

  const toolbarRightItems: ToolBarItem[] = React.useMemo(() => {
    if (!showSaveButton || !onSave) return [];
    return [{ id: "save", icon: <Save className="w-4 h-4" />, label: "Save conversation" }];
  }, [showSaveButton, onSave]);

  const handleToolbarClick = React.useCallback(
    (id: string) => {
      if (id === "save" && onSave) {
        onSave();
      }
    },
    [onSave]
  );

  // Calculate heights
  const inputHeight = `${Math.round(inputHeightRatio * 100)}%`;
  const messageHeight = `${Math.round((1 - inputHeightRatio) * 100)}%`;

  // Show empty state if no conversation selected
  if (!imageId) {
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
      <ChatHeader agentName={agentName} status={status} messageCount={conversations.length} />

      {/* Message area */}
      <div style={{ height: messageHeight }} className="min-h-0">
        <MessagePane>
          {conversations.map((conv) =>
            renderConversation(conv, streamingText, currentTextBlockId, interrupt)
          )}
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
