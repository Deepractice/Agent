/**
 * Studio - Complete chat workspace
 *
 * Top-level component that provides a ready-to-use chat interface.
 * Combines AgentList and Chat with coordinated state management.
 *
 * Layout (WeChat style):
 * ```
 * ┌──────────────┬─────────────────────────────────────┐
 * │              │                                     │
 * │  AgentList   │              Chat                   │
 * │  (sidebar)   │                                     │
 * │              │  ┌─────────────────────────────────┐│
 * │  [Images]    │  │      MessagePane                ││
 * │              │  └─────────────────────────────────┘│
 * │              │  ┌─────────────────────────────────┐│
 * │  [+ New]     │  │      InputPane                  ││
 * │              │  └─────────────────────────────────┘│
 * └──────────────┴─────────────────────────────────────┘
 * ```
 *
 * @example
 * ```tsx
 * import { Studio } from "@agentxjs/ui";
 * import { useAgentX } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX({ server: "ws://localhost:5200" });
 *   return <Studio agentx={agentx} />;
 * }
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { AgentList } from "~/components/container/AgentList";
import { Chat } from "~/components/container/Chat";
import { useImages } from "~/hooks";
import { cn } from "~/utils";

export interface StudioProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Width of the sidebar (AgentList)
   * @default 280
   */
  sidebarWidth?: number;
  /**
   * Enable search in AgentList
   * @default true
   */
  searchable?: boolean;
  /**
   * Show save button in Chat
   * @default true
   */
  showSaveButton?: boolean;
  /**
   * Input height ratio for Chat
   * @default 0.25
   */
  inputHeightRatio?: number;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * Studio component
 */
export function Studio({
  agentx,
  sidebarWidth = 280,
  searchable = true,
  showSaveButton = true,
  inputHeightRatio = 0.25,
  className,
}: StudioProps) {
  // State
  const [currentAgentId, setCurrentAgentId] = React.useState<string | null>(null);
  const [currentImageId, setCurrentImageId] = React.useState<string | null>(null);

  // Images hook for snapshotting
  const { snapshotAgent, refresh: refreshImages } = useImages(agentx, {
    autoLoad: false,
  });

  // Handle selecting a conversation
  const handleSelect = React.useCallback(
    (agentId: string, imageId: string) => {
      setCurrentAgentId(agentId);
      setCurrentImageId(imageId);
    },
    []
  );

  // Handle creating a new conversation
  const handleNew = React.useCallback((agentId: string) => {
    setCurrentAgentId(agentId);
    setCurrentImageId(null);
  }, []);

  // Handle saving current conversation
  const handleSave = React.useCallback(async () => {
    if (!currentAgentId) return;
    try {
      const record = await snapshotAgent(currentAgentId);
      setCurrentImageId(record.imageId);
      await refreshImages();
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }, [currentAgentId, snapshotAgent, refreshImages]);

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Sidebar - AgentList */}
      <div
        style={{ width: sidebarWidth }}
        className="flex-shrink-0 border-r border-border"
      >
        <AgentList
          agentx={agentx}
          selectedId={currentImageId}
          onSelect={handleSelect}
          onNew={handleNew}
          searchable={searchable}
        />
      </div>

      {/* Main area - Chat */}
      <div className="flex-1 min-w-0">
        <Chat
          agentx={agentx}
          agentId={currentAgentId}
          onSave={handleSave}
          showSaveButton={showSaveButton}
          inputHeightRatio={inputHeightRatio}
        />
      </div>
    </div>
  );
}
