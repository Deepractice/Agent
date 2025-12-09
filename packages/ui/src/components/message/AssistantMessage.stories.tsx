/**
 * AssistantMessage Stories
 *
 * Demonstrates assistant message in different lifecycle states.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { AssistantMessage } from "./AssistantMessage";
import type { AssistantMessage as AssistantMessageType } from "agentxjs";

const meta: Meta<typeof AssistantMessage> = {
  title: "Message/AssistantMessage",
  component: AssistantMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AssistantMessage>;

// Mock message data
const mockMessage: AssistantMessageType = {
  id: "msg_123",
  role: "assistant",
  subtype: "assistant",
  content: "Hello! I'm Claude, an AI assistant. How can I help you today?",
  timestamp: Date.now(),
};

/**
 * Queued state - waiting to start processing
 */
export const Queued: Story = {
  args: {
    message: { ...mockMessage, content: "" },
    status: "queued",
  },
};

/**
 * Thinking state - AI is processing (extended thinking)
 */
export const Thinking: Story = {
  args: {
    message: { ...mockMessage, content: "" },
    status: "thinking",
  },
};

/**
 * Responding state - AI is streaming response
 */
export const Responding: Story = {
  args: {
    message: mockMessage,
    status: "responding",
    streamingText: "Hello! I'm Claude, an AI assistant. How can I",
  },
};

/**
 * Success state - complete message
 */
export const Success: Story = {
  args: {
    message: mockMessage,
    status: "success",
  },
};

/**
 * Long content message
 */
export const LongContent: Story = {
  args: {
    message: {
      ...mockMessage,
      content: `I can help you with a wide variety of tasks! Here are some examples:

1. **Writing & Editing**: Draft emails, articles, code, or creative content
2. **Analysis**: Review documents, analyze data, or provide insights
3. **Problem Solving**: Debug code, troubleshoot issues, or brainstorm solutions
4. **Learning**: Explain complex concepts, answer questions, or provide tutorials
5. **Planning**: Organize tasks, create outlines, or develop strategies

What would you like to work on today?`,
    },
    status: "success",
  },
};

/**
 * In conversation context
 */
export const InConversation: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      {/* User message */}
      <div className="flex gap-3 py-2 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary text-primary-foreground">
          U
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <div className="text-sm">What can you help me with?</div>
        </div>
      </div>

      {/* Queued assistant message */}
      <AssistantMessage message={{ ...mockMessage, content: "" }} status="queued" />
    </div>
  ),
};

/**
 * Lifecycle animation - shows state transitions
 */
export const LifecycleTransition: Story = {
  render: () => {
    const [status, setStatus] = React.useState<"queued" | "thinking" | "responding" | "success">(
      "queued"
    );
    const [streamText, setStreamText] = React.useState("");

    React.useEffect(() => {
      // Simulate lifecycle: queued -> thinking -> responding -> success
      const timeline = [
        { delay: 0, state: "queued" as const, text: "" },
        { delay: 2000, state: "thinking" as const, text: "" },
        { delay: 4000, state: "responding" as const, text: "Hello! I'm" },
        { delay: 4500, state: "responding" as const, text: "Hello! I'm Claude, an AI" },
        { delay: 5000, state: "responding" as const, text: "Hello! I'm Claude, an AI assistant." },
        { delay: 5500, state: "success" as const, text: "" },
      ];

      timeline.forEach(({ delay, state, text }) => {
        setTimeout(() => {
          setStatus(state);
          setStreamText(text);
        }, delay);
      });
    }, []);

    return (
      <div className="w-[600px]">
        <AssistantMessage message={mockMessage} status={status} streamingText={streamText} />
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Current state: <strong>{status}</strong>
        </div>
      </div>
    );
  },
};

// Need to import React for the lifecycle story
import * as React from "react";
