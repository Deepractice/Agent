/**
 * Chat - Chat interface component
 *
 * Business component that combines MessagePane + InputPane with useAgent hook.
 * Displays messages and handles sending/receiving.
 *
 * @example
 * ```tsx
 * <Chat
 *   agentx={agentx}
 *   agentId={currentAgentId}
 *   onSave={() => snapshotAgent(currentAgentId)}
 * />
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { Save, Smile, Paperclip, FolderOpen } from "lucide-react";
import { MessagePane, InputPane, type MessagePaneItem, type ToolBarItem } from "~/components/pane";
import { useAgent, type UIMessage } from "~/hooks";
import { cn } from "~/utils";

export interface ChatProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Current agent ID to chat with
   */
  agentId: string | null;
  /**
   * Callback when save button is clicked
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
 * Convert UIMessage to MessagePaneItem
 */
function toMessagePaneItem(msg: UIMessage): MessagePaneItem {
  return {
    id: msg.id,
    role: msg.role === "tool_call" || msg.role === "tool_result" ? "tool" : msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    metadata: msg.role === "tool_call" || msg.role === "tool_result"
      ? { toolName: msg.role === "tool_call" ? "Tool Call" : "Tool Result" }
      : undefined,
  };
}

/**
 * Chat component
 */
export function Chat({
  agentx,
  agentId,
  onSave,
  showSaveButton = true,
  placeholder = "Type a message...",
  inputHeightRatio = 0.25,
  className,
}: ChatProps) {
  const {
    messages,
    streaming,
    status,
    send,
    interrupt,
  } = useAgent(agentx, agentId);

  // Map UIMessage[] to MessagePaneItem[]
  const items: MessagePaneItem[] = React.useMemo(() => {
    return messages.map(toMessagePaneItem);
  }, [messages]);

  // Determine loading state
  const isLoading = status === "thinking" || status === "responding" || status === "tool_executing";

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
    return [
      { id: "save", icon: <Save className="w-4 h-4" />, label: "Save conversation" },
    ];
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

  // Show empty state if no agent selected
  if (!agentId) {
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
      {/* Message area */}
      <div style={{ height: messageHeight }} className="min-h-0">
        <MessagePane
          items={items}
          streamingText={streaming}
          isLoading={isLoading && !streaming}
        />
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
