import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AgentList } from "./AgentList";
import { useAgentX } from "~/hooks";

const meta: Meta<typeof AgentList> = {
  title: "Container/AgentList",
  component: AgentList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Business component that displays saved conversations (Images) with CRUD operations. Combines ListPane with useImages hook.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AgentList>;

/**
 * Connected story - requires dev-server running on ws://localhost:5200
 */
const ConnectedWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [currentAgentId, setCurrentAgentId] = React.useState<string | null>(null);

  const handleSelect = (agentId: string, imageId: string | null) => {
    setCurrentAgentId(agentId);
    setSelectedId(imageId);
    console.log("Selected:", { agentId, imageId });
  };

  const handleNew = (agentId: string) => {
    setCurrentAgentId(agentId);
    setSelectedId(null);
    console.log("New conversation:", agentId);
  };

  if (!agentx) {
    return (
      <div className="h-96 w-72 border border-border rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting to server...</p>
          <p className="text-xs mt-2">Make sure dev-server is running:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">pnpm dev:server</code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="h-96 w-72 border border-border rounded-lg overflow-hidden">
        <AgentList
          agentx={agentx}
          selectedId={selectedId}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>
      <div className="h-96 w-64 border border-border rounded-lg p-4 bg-muted/20">
        <h3 className="text-sm font-medium mb-2">State</h3>
        <div className="text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">Selected Image:</span> {selectedId || "none"}
          </p>
          <p>
            <span className="text-muted-foreground">Current Agent:</span> {currentAgentId || "none"}
          </p>
        </div>
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
 * Mock story - demonstrates UI without server connection
 */
export const MockedEmpty: Story = {
  render: () => (
    <div className="h-96 w-72 border border-border rounded-lg overflow-hidden">
      <AgentList agentx={null} onNew={() => console.log("New clicked")} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty state when no agentx connection (shows loading briefly then empty)",
      },
    },
  },
};

/**
 * Custom title story
 */
export const CustomTitle: Story = {
  render: () => {
    const agentx = useAgentX("ws://localhost:5200");

    return (
      <div className="h-96 w-72 border border-border rounded-lg overflow-hidden">
        <AgentList agentx={agentx} title="Chat History" searchable={false} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "AgentList with custom title and search disabled",
      },
    },
  },
};
