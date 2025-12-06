/**
 * AgentList - Conversation list component
 *
 * Business component that combines ListPane with useImages hook.
 * Displays saved conversations (Images) and handles CRUD operations.
 *
 * @example
 * ```tsx
 * <AgentList
 *   agentx={agentx}
 *   selectedId={currentImageId}
 *   onSelect={(agentId, imageId) => {
 *     setCurrentAgentId(agentId);
 *     setCurrentImageId(imageId);
 *   }}
 *   onNew={(agentId) => setCurrentAgentId(agentId)}
 * />
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { MessageSquare } from "lucide-react";
import { ListPane, type ListPaneItem } from "~/components/pane";
import { useImages } from "~/hooks";
import { AgentLogo } from "~/components/element/AgentLogo";
import { Badge } from "~/components/element/Badge";

export interface AgentListProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Container ID for creating new agents
   * @default "default"
   */
  containerId?: string;
  /**
   * Currently selected image ID
   */
  selectedId?: string | null;
  /**
   * Callback when a conversation is selected
   * @param agentId - The new agent ID (from resume)
   * @param imageId - The selected image ID
   */
  onSelect?: (agentId: string, imageId: string) => void;
  /**
   * Callback when a new conversation is created
   * @param agentId - The new agent ID
   */
  onNew?: (agentId: string) => void;
  /**
   * Title displayed in header
   * @default "Conversations"
   */
  title?: string;
  /**
   * Enable search functionality
   * @default true
   */
  searchable?: boolean;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * AgentList component
 */
export function AgentList({
  agentx,
  containerId = "default",
  selectedId,
  onSelect,
  onNew,
  title = "Conversations",
  searchable = true,
  className,
}: AgentListProps) {
  const {
    images,
    isLoading,
    resumeImage,
    deleteImage,
  } = useImages(agentx);

  // Map ImageRecord[] to ListPaneItem[]
  const items: ListPaneItem[] = React.useMemo(() => {
    if (!images) return [];
    return images.map((img) => ({
      id: img.imageId,
      title: img.name || "Untitled",
      leading: <AgentLogo className="w-3 h-3" />,
      trailing: img.messages?.length > 0 ? (
        <Badge variant="secondary" className="text-xs px-1 py-0">
          {img.messages.length}
        </Badge>
      ) : undefined,
      timestamp: img.createdAt,
    }));
  }, [images]);

  // Handle selecting an image (resume conversation)
  const handleSelect = React.useCallback(
    async (imageId: string) => {
      if (!agentx) return;
      try {
        const { agentId } = await resumeImage(imageId);
        onSelect?.(agentId, imageId);
      } catch (error) {
        console.error("Failed to resume conversation:", error);
      }
    },
    [agentx, resumeImage, onSelect]
  );

  // Handle creating a new conversation
  const handleNew = React.useCallback(async () => {
    if (!agentx) return;
    try {
      // Create a new agent
      const response = await agentx.request("agent_run_request", {
        containerId,
        config: { name: "New Conversation" },
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const { agentId } = response.data;
      if (agentId) {
        onNew?.(agentId);
      }
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  }, [agentx, containerId, onNew]);

  // Handle deleting an image
  const handleDelete = React.useCallback(
    async (imageId: string) => {
      try {
        await deleteImage(imageId);
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    },
    [deleteImage]
  );

  return (
    <ListPane
      title={title}
      items={items}
      selectedId={selectedId}
      isLoading={isLoading}
      searchable={searchable}
      searchPlaceholder="Search conversations..."
      showNewButton
      newButtonLabel="New conversation"
      emptyState={{
        icon: <MessageSquare className="w-6 h-6" />,
        title: "No conversations yet",
        description: "Start a new conversation to begin",
        actionLabel: "New conversation",
      }}
      onSelect={handleSelect}
      onDelete={handleDelete}
      onNew={handleNew}
      className={className}
    />
  );
}
