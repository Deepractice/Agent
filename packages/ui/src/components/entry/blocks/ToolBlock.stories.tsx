import type { Meta, StoryObj } from "@storybook/react";
import { ToolBlock } from "./ToolBlock";
import type { ToolBlockData } from "../types";

const meta: Meta<typeof ToolBlock> = {
  title: "Entry/Blocks/ToolBlock",
  component: ToolBlock,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ToolBlock>;

const planningBlock: ToolBlockData = {
  type: "tool",
  id: "msg_000",
  toolCallId: "toolu_00PLAN",
  name: "Bash",
  input: {},
  timestamp: Date.now(),
  status: "planning",
};

const executingBlock: ToolBlockData = {
  type: "tool",
  id: "msg_001",
  toolCallId: "toolu_01ABC123",
  name: "Bash",
  input: { command: "ls -la /home/user" },
  timestamp: Date.now(),
  status: "executing",
};

const successBlock: ToolBlockData = {
  type: "tool",
  id: "msg_002",
  toolCallId: "toolu_02DEF456",
  name: "Bash",
  input: { command: "echo 'Hello World'" },
  timestamp: Date.now(),
  status: "success",
  output: "Hello World",
  duration: 0.23,
};

const errorBlock: ToolBlockData = {
  type: "tool",
  id: "msg_003",
  toolCallId: "toolu_03GHI789",
  name: "Bash",
  input: { command: "cat /nonexistent/file" },
  timestamp: Date.now(),
  status: "error",
  output: "cat: /nonexistent/file: No such file or directory",
  duration: 0.05,
};

const complexInputBlock: ToolBlockData = {
  type: "tool",
  id: "msg_004",
  toolCallId: "toolu_04JKL012",
  name: "WebSearch",
  input: {
    query: "TypeScript best practices 2025",
    maxResults: 10,
    filters: {
      language: "en",
      dateRange: "past_year",
    },
  },
  timestamp: Date.now(),
  status: "success",
  output: {
    results: [
      { title: "TypeScript Handbook", url: "https://example.com/1" },
      { title: "Advanced TypeScript Patterns", url: "https://example.com/2" },
    ],
    totalResults: 1250000,
  },
  duration: 2.45,
};

export const Planning: Story = {
  args: {
    block: planningBlock,
  },
};

export const Executing: Story = {
  args: {
    block: executingBlock,
  },
};

export const Success: Story = {
  args: {
    block: successBlock,
  },
};

export const Error: Story = {
  args: {
    block: errorBlock,
  },
};

export const ComplexInput: Story = {
  args: {
    block: complexInputBlock,
  },
};

export const DefaultExpanded: Story = {
  args: {
    block: successBlock,
    defaultExpanded: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4 max-w-2xl">
      <ToolBlock block={planningBlock} />
      <ToolBlock block={executingBlock} />
      <ToolBlock block={successBlock} />
      <ToolBlock block={errorBlock} />
    </div>
  ),
};
