/**
 * Chat - Chat interface component
 *
 * Business component that combines MessagePane + InputPane with useAgent hook.
 * Displays entries and handles sending/receiving.
 *
 * Uses Entry-first design:
 * - entries: all conversation entries (user, assistant, error)
 * - streamingText: current streaming text for assistant entry
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
import { useAgent, type EntryData } from "~/hooks";
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
 * Render a single entry based on its type
 */
function renderEntry(entry: EntryData, streamingText: string): React.ReactNode {
  switch (entry.type) {
    case "user":
      return <UserEntry key={entry.id} entry={entry} />;

    case "assistant":
      return (
        <AssistantEntry
          key={entry.id}
          entry={entry}
          streamingText={
            entry.status === "streaming" || entry.status === "thinking" || entry.status === "queued"
              ? streamingText
              : undefined
          }
        />
      );

    case "error":
      return <ErrorEntry key={entry.id} entry={entry} />;

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
  // Use Entry-first state
  const { entries, streamingText, status, send, interrupt } = useAgent(agentx, imageId ?? null);

  // Determine loading state
  const isLoading =
    status === "thinking" ||
    status === "responding" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result";

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
      <ChatHeader agentName={agentName} status={status} messageCount={entries.length} />

      {/* Message area */}
      <div style={{ height: messageHeight }} className="min-h-0">
        <MessagePane>{entries.map((entry) => renderEntry(entry, streamingText))}</MessagePane>
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
