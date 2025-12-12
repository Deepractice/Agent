/**
 * MobileStudio - Mobile chat workspace
 *
 * Top-level mobile component following Claude App's design:
 * - Full-screen chat
 * - Left drawer for conversation list
 * - Clean, minimalist interface
 *
 * Layout:
 * ```
 * ┌──────────────────────────────┐
 * │ ≡  Title                  +  │  ← MobileHeader
 * ├──────────────────────────────┤
 * │                              │
 * │                              │
 * │       MobileMessagePane      │
 * │                              │
 * │                              │
 * ├──────────────────────────────┤
 * │  [Message...]           [>]  │  ← MobileInputPane
 * └──────────────────────────────┘
 *
 * Drawer (slides from left):
 * ┌────────────────────┐
 * │ Conversations    X │
 * ├────────────────────┤
 * │ [🔍 Search...]     │
 * ├────────────────────┤
 * │ [+ New conversation]│
 * ├────────────────────┤
 * │ 🟢 Conversation 1  │
 * │ ⚫ Conversation 2  │
 * └────────────────────┘
 * ```
 *
 * @example
 * ```tsx
 * import { MobileStudio, useAgentX } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX("ws://localhost:5200");
 *   return <MobileStudio agentx={agentx} />;
 * }
 * ```
 */

import * as React from "react";
import type { AgentX } from "agentxjs";
import { MobileDrawer } from "~/components/mobile/MobileDrawer";
import { MobileAgentList } from "~/components/mobile/MobileAgentList";
import { MobileChat } from "~/components/mobile/MobileChat";
import { ToastContainer, useToast } from "~/components/element/Toast";
import { useImages } from "~/hooks";
import { cn } from "~/utils";

export interface MobileStudioProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Container ID for user isolation
   * @default "default"
   */
  containerId?: string;
  /**
   * Enable search in drawer
   * @default true
   */
  searchable?: boolean;
  /**
   * Input placeholder
   */
  placeholder?: string;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * MobileStudio Component
 *
 * A full-screen mobile chat workspace with drawer navigation.
 */
export function MobileStudio({
  agentx,
  containerId = "default",
  searchable = true,
  placeholder,
  className,
}: MobileStudioProps) {
  // State
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [currentImageId, setCurrentImageId] = React.useState<string | null>(null);
  const [currentImageName, setCurrentImageName] = React.useState<string | undefined>(undefined);

  // Toast
  const { toasts, showToast, dismissToast } = useToast();

  // Images
  const { images, createImage, refresh } = useImages(agentx, {
    containerId,
    autoLoad: true,
  });

  // Handle select
  const handleSelect = React.useCallback(
    (imageId: string, _agentId: string | null) => {
      setCurrentImageId(imageId);
      const image = images.find((img) => img.imageId === imageId);
      setCurrentImageName(image?.name || "Conversation");
      setDrawerOpen(false);
    },
    [images]
  );

  // Handle new
  const handleNew = React.useCallback(async () => {
    if (!agentx) return;
    try {
      const image = await createImage({ name: "New Conversation" });
      await refresh();
      setCurrentImageId(image.imageId);
      setCurrentImageName("New Conversation");
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      showToast("Failed to create conversation", "error");
    }
  }, [agentx, createImage, refresh, showToast]);

  // Listen for system errors
  React.useEffect(() => {
    if (!agentx) return;

    const unsubscribe = agentx.on("system_error", (event) => {
      const errorData = event.data as {
        message: string;
        severity?: "info" | "warn" | "error" | "fatal";
      };
      showToast(errorData.message, errorData.severity || "error");
    });

    return () => unsubscribe();
  }, [agentx, showToast]);

  return (
    <div className={cn("relative h-full w-full bg-background overflow-hidden", className)}>
      {/* Main Chat */}
      <MobileChat
        agentx={agentx}
        imageId={currentImageId}
        agentName={currentImageName}
        onMenuClick={() => setDrawerOpen(true)}
        onNewConversation={handleNew}
        placeholder={placeholder}
      />

      {/* Drawer */}
      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <MobileAgentList
          agentx={agentx}
          containerId={containerId}
          selectedId={currentImageId}
          onSelect={handleSelect}
          onNew={async (imageId) => {
            setCurrentImageId(imageId);
            setCurrentImageName("New Conversation");
          }}
          onClose={() => setDrawerOpen(false)}
          searchable={searchable}
        />
      </MobileDrawer>

      {/* Toast */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="top-center" />
    </div>
  );
}
