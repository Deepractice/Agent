/**
 * AgentList - Conversation list component
 *
 * Business component that combines ListPane with useImages hook.
 * Displays conversations (Images) with online/offline status.
 *
 * In the Image-First model:
 * - Image is the persistent conversation entity
 * - Agent is a transient runtime instance
 * - Online (🟢) = Agent is running for this Image
 * - Offline (⚫) = Image exists but no Agent running
 *
 * @example
 * ```tsx
 * <AgentList
 *   agentx={agentx}
 *   selectedId={currentImageId}
 *   onSelect={(imageId, agentId) => {
 *     setCurrentImageId(imageId);
 *   }}
 *   onNew={(imageId) => setCurrentImageId(imageId)}
 * />
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { MessageSquare, Bot } from "lucide-react";
import { ListPane, type ListPaneItem } from "~/components/pane";
import { useImages } from "~/hooks";
import { cn } from "~/utils";

export interface AgentListProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Container ID for creating new images
   * @default "default"
   */
  containerId?: string;
  /**
   * Currently selected image ID
   */
  selectedId?: string | null;
  /**
   * Callback when a conversation is selected
   * @param imageId - The selected image ID
   * @param agentId - The agent ID (if online)
   */
  onSelect?: (imageId: string, agentId: string | null) => void;
  /**
   * Callback when a new conversation is created
   * @param imageId - The new image ID
   */
  onNew?: (imageId: string) => void;
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
   * Show collapse button in header
   * @default false
   */
  showCollapseButton?: boolean;
  /**
   * Callback when collapse button is clicked
   */
  onCollapse?: () => void;
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
  showCollapseButton = false,
  onCollapse,
  className,
}: AgentListProps) {
  const { images, isLoading, createImage, runImage, deleteImage, refresh } = useImages(agentx, {
    containerId,
  });

  // Map images to ListPaneItem[]
  const items: ListPaneItem[] = React.useMemo(() => {
    return images.map((img) => ({
      id: img.imageId,
      title: img.name || "Untitled",
      leading: <Bot className="w-4 h-4 text-muted-foreground" />,
      trailing: (
        <span
          className={cn("w-2 h-2 rounded-full", img.online ? "bg-green-500" : "bg-gray-400")}
          title={img.online ? "Online" : "Offline"}
        />
      ),
      timestamp: img.updatedAt || img.createdAt,
    }));
  }, [images]);

  // Handle selecting an image
  const handleSelect = React.useCallback(
    async (imageId: string) => {
      if (!agentx) return;
      try {
        // Find the image
        const image = images.find((img) => img.imageId === imageId);
        if (!image) return;

        // If offline, run the image first
        if (!image.online) {
          const { agentId } = await runImage(imageId);
          onSelect?.(imageId, agentId);
        } else {
          // Already online, just select
          onSelect?.(imageId, image.agentId ?? null);
        }
      } catch (error) {
        console.error("Failed to select conversation:", error);
      }
    },
    [agentx, images, runImage, onSelect]
  );

  // Handle creating a new conversation
  const handleNew = React.useCallback(async () => {
    console.log("[AgentList] handleNew called, agentx:", !!agentx);
    if (!agentx) {
      console.warn("[AgentList] agentx is null, cannot create new conversation");
      return;
    }
    try {
      console.log("[AgentList] Creating new image with containerId:", containerId);
      // Create a new image
      const image = await createImage({ name: "New Conversation" });
      console.log("[AgentList] New image created:", image.imageId);

      // Refresh list
      await refresh();
      onNew?.(image.imageId);
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  }, [agentx, containerId, createImage, refresh, onNew]);

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
      showCollapseButton={showCollapseButton}
      onCollapse={onCollapse}
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
