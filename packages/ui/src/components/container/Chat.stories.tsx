import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Chat } from "./Chat";
import { useAgentX } from "~/hooks";

const meta: Meta<typeof Chat> = {
  title: "Container/Chat",
  component: Chat,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Business component that provides a complete chat interface. Combines MessagePane + InputPane with useAgent hook.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Chat>;

/**
 * Connected story - requires dev-server running on ws://localhost:5200
 */
const ConnectedWrapper = () => {
  const agentx = useAgentX({ server: "ws://localhost:5200" });
  const [agentId, setAgentId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>("disconnected");

  // Create a new agent on mount
  React.useEffect(() => {
    if (!agentx) return;
    setStatus("connected");

    const createAgent = async () => {
      try {
        setStatus("creating agent...");
        const response = await agentx.request("agent_run_request", {
          containerId: "default",
          config: { name: "Test Agent" },
        });
        if (response.data.agentId) {
          setAgentId(response.data.agentId);
          setStatus("ready");
        }
      } catch (error) {
        console.error("Failed to create agent:", error);
        setStatus("error");
      }
    };

    createAgent();
  }, [agentx]);

  if (!agentx) {
    return (
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting to server...</p>
          <p className="text-xs mt-2">Make sure dev-server is running:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">
            pnpm dev:server
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        Status: {status} | Agent: {agentId || "none"}
      </div>
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <Chat
          agentx={agentx}
          agentId={agentId}
          onSave={() => console.log("Save clicked")}
        />
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
          "Live connection to dev-server. Start the server with `pnpm dev:server` before viewing this story.",
      },
    },
  },
};

/**
 * No agent selected state
 */
export const NoAgentSelected: Story = {
  render: () => (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat
        agentx={null}
        agentId={null}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty state when no agent is selected",
      },
    },
  },
};

/**
 * Custom input height
 */
const CustomHeightWrapper = () => {
  const agentx = useAgentX({ server: "ws://localhost:5200" });
  const [agentId, setAgentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!agentx) return;
    const createAgent = async () => {
      const response = await agentx.request("agent_run_request", {
        containerId: "default",
        config: { name: "Test Agent" },
      });
      if (response.data.agentId) {
        setAgentId(response.data.agentId);
      }
    };
    createAgent();
  }, [agentx]);

  return (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat
        agentx={agentx}
        agentId={agentId}
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
 * Without save button
 */
const NoSaveWrapper = () => {
  const agentx = useAgentX({ server: "ws://localhost:5200" });
  const [agentId, setAgentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!agentx) return;
    const createAgent = async () => {
      const response = await agentx.request("agent_run_request", {
        containerId: "default",
        config: { name: "Test Agent" },
      });
      if (response.data.agentId) {
        setAgentId(response.data.agentId);
      }
    };
    createAgent();
  }, [agentx]);

  return (
    <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <Chat
        agentx={agentx}
        agentId={agentId}
        showSaveButton={false}
      />
    </div>
  );
};

export const WithoutSaveButton: Story = {
  render: () => <NoSaveWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Chat without the save button in toolbar",
      },
    },
  },
};
