import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Chat } from "./Chat";
import { useAgentX, useImages } from "~/hooks";

const meta: Meta<typeof Chat> = {
  title: "Container/Chat",
  component: Chat,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Business component that provides a complete chat interface. Combines MessagePane + InputPane with useAgent hook. Supports Image-First model where imageId is used for conversation identity.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Chat>;

/**
 * Connected story - requires dev-server running on ws://localhost:5200
 * Uses Image-First model: creates an Image first, then uses imageId for chat
 */
const ConnectedWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");
  const [imageId, setImageId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("disconnected");
  const { createImage } = useImages(agentx, { autoLoad: false });

  // Create a new image on mount
  React.useEffect(() => {
    if (!agentx) return;
    setStatus("connected");

    const createConversation = async () => {
      try {
        setStatus("creating conversation...");
        const image = await createImage({ name: "Test Conversation" });
        setImageId(image.imageId);
        setStatus("ready");
      } catch (error) {
        console.error("Failed to create conversation:", error);
        setStatus("error");
      }
    };

    createConversation();
  }, [agentx, createImage]);

  if (!agentx) {
    return (
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting to server...</p>
          <p className="text-xs mt-2">Make sure dev-server is running:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">pnpm dev:server</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Status: {status} | Image: {imageId || "none"}
      </div>
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <Chat agentx={agentx} imageId={imageId} />
      </div>
    </div>
  );
};

export const Connected: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          "Live connection to dev-server using Image-First model. Start the server with `pnpm dev:server` before viewing this story.",
      },
    },
  },
};

/**
 * No conversation selected state
 */
export const NoConversationSelected: Story = {
  render: () => (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat agentx={null} imageId={null} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty state when no conversation is selected",
      },
    },
  },
};

/**
 * Custom input height
 */
const CustomHeightWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");
  const [imageId, setImageId] = React.useState<string | null>(null);
  const { createImage } = useImages(agentx, { autoLoad: false });

  React.useEffect(() => {
    if (!agentx) return;
    const createConversation = async () => {
      const image = await createImage({ name: "Test Conversation" });
      setImageId(image.imageId);
    };
    createConversation();
  }, [agentx, createImage]);

  return (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat
        agentx={agentx}
        imageId={imageId}
        inputHeightRatio={0.35}
        placeholder="Type your message here..."
      />
    </div>
  );
};

export const CustomInputHeight: Story = {
  render: () => <CustomHeightWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Chat with larger input area (35% of height)",
      },
    },
  },
};

/**
 * Without save button (not needed in Image-First model - auto-saved)
 */
const NoSaveWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");
  const [imageId, setImageId] = React.useState<string | null>(null);
  const { createImage } = useImages(agentx, { autoLoad: false });

  React.useEffect(() => {
    if (!agentx) return;
    const createConversation = async () => {
      const image = await createImage({ name: "Test Conversation" });
      setImageId(image.imageId);
    };
    createConversation();
  }, [agentx, createImage]);

  return (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat agentx={agentx} imageId={imageId} showSaveButton={false} />
    </div>
  );
};

export const WithoutSaveButton: Story = {
  render: () => <NoSaveWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          "Chat without the save button in toolbar (messages are auto-saved in Image-First model)",
      },
    },
  },
};
