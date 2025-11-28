import type { Meta, StoryObj } from "@storybook/react";
import { AgentStatusIndicator } from "./AgentStatusIndicator";
import type { AgentState, StateChange } from "@deepractice-ai/agentx-types";

/**
 * Mock Agent for Storybook
 */
function createMockAgent(initialState: AgentState = "idle") {
  let currentState = initialState;
  const listeners = new Set<(change: StateChange) => void>();

  return {
    get state() {
      return currentState;
    },
    setState(newState: AgentState) {
      const prevState = currentState;
      currentState = newState;
      listeners.forEach((cb) => cb({ prev: prevState, current: newState }));
    },
    onStateChange(callback: (change: StateChange) => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    abort() {
      console.log("[MockAgent] abort() called");
      const prevState = currentState;
      currentState = "idle";
      listeners.forEach((cb) => cb({ prev: prevState, current: "idle" }));
    },
  } as any;
}

const meta: Meta<typeof AgentStatusIndicator> = {
  title: "Agent/AgentStatusIndicator",
  component: AgentStatusIndicator,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AgentStatusIndicator>;

/**
 * Idle state - nothing shown
 */
export const Idle: Story = {
  args: {
    agent: createMockAgent("idle"),
  },
};

/**
 * Thinking state - shows thinking indicator
 */
export const Thinking: Story = {
  args: {
    agent: createMockAgent("thinking"),
  },
};

/**
 * Responding state - shows responding indicator
 */
export const Responding: Story = {
  args: {
    agent: createMockAgent("responding"),
  },
};

/**
 * Queued state - message received, queued for processing
 */
export const Queued: Story = {
  args: {
    agent: createMockAgent("queued"),
  },
};

/**
 * Planning tool state - agent is generating tool call JSON
 */
export const PlanningTool: Story = {
  args: {
    agent: createMockAgent("planning_tool"),
  },
};

/**
 * Awaiting tool result state - agent is waiting for tool execution
 */
export const AwaitingToolResult: Story = {
  args: {
    agent: createMockAgent("awaiting_tool_result"),
  },
};

/**
 * Conversation active state
 */
export const ConversationActive: Story = {
  args: {
    agent: createMockAgent("conversation_active"),
  },
};

/**
 * Without abort button
 */
export const WithoutAbortButton: Story = {
  args: {
    agent: createMockAgent("responding"),
    showAbortButton: false,
  },
};

/**
 * Interactive demo - toggle states
 */
export const Interactive: Story = {
  render: () => {
    const agent = createMockAgent("idle");

    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => agent.setState("idle")}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Set Idle
          </button>
          <button
            onClick={() => agent.setState("queued")}
            className="px-3 py-1 bg-purple-200 rounded hover:bg-purple-300"
          >
            Set Queued
          </button>
          <button
            onClick={() => agent.setState("thinking")}
            className="px-3 py-1 bg-blue-200 rounded hover:bg-blue-300"
          >
            Set Thinking
          </button>
          <button
            onClick={() => agent.setState("responding")}
            className="px-3 py-1 bg-green-200 rounded hover:bg-green-300"
          >
            Set Responding
          </button>
          <button
            onClick={() => agent.setState("planning_tool")}
            className="px-3 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
          >
            Set Planning Tool
          </button>
          <button
            onClick={() => agent.setState("awaiting_tool_result")}
            className="px-3 py-1 bg-orange-200 rounded hover:bg-orange-300"
          >
            Set Awaiting Tool Result
          </button>
        </div>
        <div className="border-t pt-4">
          <AgentStatusIndicator agent={agent} />
        </div>
        <p className="text-sm text-gray-500">
          Note: Due to Storybook limitations, you may need to click a button and wait for the
          polling interval to see the change.
        </p>
      </div>
    );
  },
};
