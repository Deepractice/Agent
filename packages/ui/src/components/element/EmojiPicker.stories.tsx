import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { EmojiPicker, type Emoji } from "./EmojiPicker";

const meta: Meta<typeof EmojiPicker> = {
  title: "Element/EmojiPicker",
  component: EmojiPicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Emoji picker component using emoji-mart. Supports search, categories, skin tone selection, and frequently used emojis.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmojiPicker>;

export const Default: Story = {
  render: () => (
    <div className="p-4">
      <EmojiPicker onEmojiSelect={(emoji) => console.log("Selected:", emoji)} />
    </div>
  ),
};

export const LightTheme: Story = {
  render: () => (
    <div className="p-4 bg-white">
      <EmojiPicker onEmojiSelect={(emoji) => console.log("Selected:", emoji)} theme="light" />
    </div>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <div className="p-4 bg-gray-900">
      <EmojiPicker onEmojiSelect={(emoji) => console.log("Selected:", emoji)} theme="dark" />
    </div>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="p-4">
      <EmojiPicker
        onEmojiSelect={(emoji) => console.log("Selected:", emoji)}
        perLine={6}
        maxFrequentRows={2}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Compact version with fewer emojis per row",
      },
    },
  },
};

export const WithSelection: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<Emoji | null>(null);

    return (
      <div className="p-4 space-y-4">
        <div className="text-sm">
          {selected ? (
            <span>
              Selected: {selected.native} ({selected.name})
            </span>
          ) : (
            <span className="text-muted-foreground">Click an emoji to select</span>
          )}
        </div>
        <EmojiPicker onEmojiSelect={setSelected} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive demo showing selected emoji information",
      },
    },
  },
};
