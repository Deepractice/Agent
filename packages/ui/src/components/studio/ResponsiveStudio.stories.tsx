import type { Meta, StoryObj } from "@storybook/react";
import { ResponsiveStudio } from "./ResponsiveStudio";
import { useAgentX } from "~/hooks";

const meta: Meta<typeof ResponsiveStudio> = {
  title: "Studio/ResponsiveStudio",
  component: ResponsiveStudio,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Automatically switches between desktop Studio and MobileStudio based on viewport width. Default breakpoint is 768px.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResponsiveStudio>;

/**
 * Responsive workspace - requires dev-server running
 */
const ConnectedWrapper = () => {
  const agentx = useAgentX("ws://localhost:5200");

  if (!agentx) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground text-sm px-8">
          <p className="text-lg font-medium mb-2">Connecting to server...</p>
          <p className="text-xs mt-2">Make sure dev-server is running:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded mt-1 block">pnpm dev:server</code>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <ResponsiveStudio agentx={agentx} />
    </div>
  );
};

export const Default: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          "Resize the viewport to see automatic switching. < 768px shows mobile layout, >= 768px shows desktop layout.",
      },
    },
  },
};

/**
 * Custom breakpoint (640px)
 */
const CustomBreakpointWrapper = () => {
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
      <ResponsiveStudio agentx={agentx} breakpoint={640} />
    </div>
  );
};

export const CustomBreakpoint: Story = {
  render: () => <CustomBreakpointWrapper />,
  parameters: {
    docs: {
      description: {
        story: "ResponsiveStudio with custom breakpoint at 640px",
      },
    },
  },
};
