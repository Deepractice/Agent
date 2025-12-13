import type { Meta, StoryObj } from "@storybook/react";
import { MobileInputPane } from "./MobileInputPane";

const meta: Meta<typeof MobileInputPane> = {
  title: "Mobile/MobileInputPane",
  component: MobileInputPane,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        component:
          "Mobile-optimized input area with rounded design and send button. Follows Claude App's minimalist design.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-background flex flex-col justify-end">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MobileInputPane>;

export const Default: Story = {
  args: {
    onSend: (text) => console.log("Send:", text),
    placeholder: "Message...",
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    onStop: () => console.log("Stop clicked"),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Input disabled",
  },
};

export const CustomPlaceholder: Story = {
  args: {
    placeholder: "Ask me anything...",
    onSend: (text) => console.log("Send:", text),
  },
};
