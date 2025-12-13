import type { Meta, StoryObj } from "@storybook/react";
import { MobileStudio } from "./MobileStudio";
import { useAgentX } from "~/hooks";

const meta: Meta<typeof MobileStudio> = {
  title: "Studio/MobileStudio",
  component: MobileStudio,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        component:
          "Mobile-optimized chat workspace following Claude App's minimalist design. Features a left drawer for conversation list and full-screen chat interface.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobileStudio>;

/**
 * Full mobile workspace - requires dev-server running
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
      <MobileStudio agentx={agentx} />
    </div>
  );
};

export const Default: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    docs: {
      description: {
        story:
          "Mobile Studio with default settings. Start the server with `pnpm dev:server` before viewing.",
      },
    },
  },
};

/**
 * Without search
 */
const NoSearchWrapper = () => {
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
      <MobileStudio agentx={agentx} searchable={false} />
    </div>
  );
};

export const NoSearch: Story = {
  render: () => <NoSearchWrapper />,
  parameters: {
    docs: {
      description: {
        story: "Mobile Studio without search in drawer",
      },
    },
  },
};

/**
 * iPhone SE viewport
 */
export const iPhoneSE: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    viewport: {
      defaultViewport: "iphonese2",
    },
    docs: {
      description: {
        story: "Mobile Studio on iPhone SE viewport (375x667)",
      },
    },
  },
};

/**
 * iPhone 12/13 viewport
 */
export const iPhone12: Story = {
  render: () => <ConnectedWrapper />,
  parameters: {
    viewport: {
      defaultViewport: "iphone12",
    },
    docs: {
      description: {
        story: "Mobile Studio on iPhone 12/13 viewport (390x844)",
      },
    },
  },
};
