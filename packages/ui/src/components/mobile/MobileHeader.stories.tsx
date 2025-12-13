import type { Meta, StoryObj } from "@storybook/react";
import { MobileHeader } from "./MobileHeader";

const meta: Meta<typeof MobileHeader> = {
  title: "Mobile/MobileHeader",
  component: MobileHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        component:
          "Minimalist mobile header with hamburger menu and optional action button. Follows Claude App design principles.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobileHeader>;

export const Default: Story = {
  args: {
    onMenuClick: () => console.log("Menu clicked"),
    onActionClick: () => console.log("Action clicked"),
  },
};

export const WithTitle: Story = {
  args: {
    title: "Conversation",
    onMenuClick: () => console.log("Menu clicked"),
    onActionClick: () => console.log("Action clicked"),
  },
};

export const LongTitle: Story = {
  args: {
    title: "This is a very long conversation title that should be truncated",
    onMenuClick: () => console.log("Menu clicked"),
    onActionClick: () => console.log("Action clicked"),
  },
};

export const NoAction: Story = {
  args: {
    title: "Read Only",
    onMenuClick: () => console.log("Menu clicked"),
    showAction: false,
  },
};
