/**
 * UnknownMessage Stories
 *
 * Demonstrates fallback component for unrecognized message types.
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { Message } from "agentxjs";
import { UnknownMessage } from "./UnknownMessage";

const meta: Meta<typeof UnknownMessage> = {
  title: "Message/UnknownMessage",
  component: UnknownMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UnknownMessage>;

const unknownMessage = {
  id: "unknown-1",
  role: "custom" as any,
  subtype: "custom-type" as any,
  content: "This is a custom message type",
  timestamp: Date.now(),
  metadata: {
    customField: "custom value",
  },
} as Message;

/**
 * Unknown message type with custom subtype
 */
export const CustomType: Story = {
  args: {
    message: unknownMessage,
  },
};

/**
 * Unknown message with complex data
 */
export const WithComplexData: Story = {
  args: {
    message: unknownMessage,
  },
};
