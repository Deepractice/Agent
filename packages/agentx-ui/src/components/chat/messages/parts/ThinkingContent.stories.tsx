import type { Meta, StoryObj } from "@storybook/react";
import { ThinkingContent } from "./ThinkingContent";

const meta = {
  title: "Chat/Parts/ThinkingContent",
  component: ThinkingContent,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ThinkingContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    reasoning: `Let me analyze this problem step by step:

1. First, I need to understand the requirements
2. Then, I'll break down the solution into components
3. Finally, I'll implement the logic

This approach ensures we cover all edge cases.`,
    tokenCount: 150,
    defaultCollapsed: false,
  },
};

export const WithTokenCount: Story = {
  args: {
    reasoning: "Analyzing the codebase structure and identifying patterns...",
    tokenCount: 230,
    defaultCollapsed: false,
  },
};

export const Collapsed: Story = {
  args: {
    reasoning: `This is a long thinking process that should be collapsed by default.

It contains multiple paragraphs of reasoning and analysis that the user can expand if they want to see the details.`,
    tokenCount: 180,
    defaultCollapsed: true,
  },
};

export const Streaming: Story = {
  args: {
    reasoning: "I'm currently thinking about this problem...",
    isStreaming: true,
    defaultCollapsed: false,
  },
};

export const LongReasoning: Story = {
  args: {
    reasoning: `# Deep Analysis

## Problem Statement
The user is asking about implementing a complex feature.

## Approach
1. **Architecture Design**
   - Component structure
   - Data flow
   - State management

2. **Implementation Plan**
   - Start with core functionality
   - Add error handling
   - Write tests

## Considerations
- Performance implications
- Browser compatibility
- User experience

## Conclusion
We should proceed with approach A because it offers better scalability.`,
    tokenCount: 520,
    defaultCollapsed: false,
  },
};
