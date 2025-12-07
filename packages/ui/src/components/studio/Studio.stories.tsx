import type { Meta, StoryObj } from "@storybook/react";
import { Studio } from "./Studio";
import { useAgentX } from "~/hooks";

const meta: Meta<typeof Studio> = {
  title: "Studio/Studio",
  component: Studio,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Complete chat workspace that combines AgentList and Chat. Ready-to-use interface for AI conversations.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Studio>;

/**
 * Full workspace - requires dev-server running
 */
const ConnectedWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm">
          <p className="text-lg font-medium mb-2">Connecting to server...</p>
          <p className="text-xs mt-2">Make sure dev-server is running:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">pnpm dev:server</code>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Studio agentx={agentx} />
    </div>
  );
};

export const FullWorkspace: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Complete Studio workspace. Start the server with `pnpm dev:server` before viewing.",
      },
    },
  },
};

/**
 * Custom sidebar width
 */
const CustomSidebarWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Studio agentx={agentx} sidebarWidth={350} />
    </div>
  );
};

export const WideSidebar: Story = {
  render: () => <CustomSidebarWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Studio with wider sidebar (350px)",
      },
    },
  },
};

/**
 * Narrow sidebar
 */
const NarrowSidebarWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Studio agentx={agentx} sidebarWidth={220} searchable={false} />
    </div>
  );
};

export const NarrowSidebar: Story = {
  render: () => <NarrowSidebarWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Studio with narrow sidebar (220px) and no search",
      },
    },
  },
};

/**
 * Large input area
 */
const LargeInputWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm">
          <p>Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Studio agentx={agentx} inputHeightRatio={0.35} />
    </div>
  );
};

export const LargeInputArea: Story = {
  render: () => <LargeInputWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Studio with larger input area (35% of chat height)",
      },
    },
  },
};

/**
 * Embedded in container
 */
const EmbeddedWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  return (
    <div className="p-8 bg-muted min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">My App</h1>
        <div className="h-[600px] border border-border rounded-lg overflow-hidden shadow-lg">
          <Studio agentx={agentx} />
        </div>
      </div>
    </div>
  );
};

export const Embedded: Story = {
  render: () => <EmbeddedWrapper />,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story: "Studio embedded within a larger application layout",
      },
    },
  },
};
