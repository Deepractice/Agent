/**
 * ToolMessage Stories
 *
 * Demonstrates tool call messages with different statuses.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { ToolMessage } from "./ToolMessage";
import type { ToolCallMessage, ToolResultMessage } from "agentxjs";

const meta: Meta<typeof ToolMessage> = {
  title: "Message/ToolMessage",
  component: ToolMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ToolMessage>;

// Mock tool call message
const mockToolCall: ToolCallMessage = {
  id: "msg_tool_123",
  role: "assistant",
  subtype: "tool-call",
  timestamp: Date.now() - 5000,
  toolCall: {
    type: "tool-call",
    id: "tool_call_abc",
    name: "bash",
    input: {
      command: "ls -la",
      description: "List files in current directory",
    },
  },
};

// Mock successful tool result
const mockSuccessResult: ToolResultMessage = {
  id: "msg_result_123",
  role: "tool",
  subtype: "tool-result",
  timestamp: Date.now(),
  toolCallId: "tool_call_abc",
  toolResult: {
    type: "tool-result",
    id: "tool_call_abc",
    name: "bash",
    output: {
      type: "text",
      value: `total 48
drwxr-xr-x  12 user  staff   384 Dec  9 09:00 .
drwxr-xr-x   8 user  staff   256 Dec  8 15:30 ..
-rw-r--r--   1 user  staff  1234 Dec  9 08:45 README.md
drwxr-xr-x   5 user  staff   160 Dec  9 09:00 src
-rw-r--r--   1 user  staff   567 Dec  8 10:20 package.json`,
    },
  },
};

// Mock error result
const mockErrorResult: ToolResultMessage = {
  id: "msg_result_456",
  role: "tool",
  subtype: "tool-result",
  timestamp: Date.now(),
  toolCallId: "tool_call_abc",
  toolResult: {
    type: "tool-result",
    id: "tool_call_abc",
    name: "bash",
    output: {
      type: "error-text",
      value: "bash: command not found: xyz",
    },
  },
};

/**
 * Tool call executing (no result yet)
 */
export const Executing: Story = {
  args: {
    toolCall: mockToolCall,
  },
};

/**
 * Tool call succeeded with result
 */
export const Success: Story = {
  args: {
    toolCall: mockToolCall,
    toolResult: mockSuccessResult,
  },
};

/**
 * Tool call failed with error
 */
export const Error: Story = {
  args: {
    toolCall: {
      ...mockToolCall,
      toolCall: {
        type: "tool-call",
        id: "tool_call_error",
        name: "bash",
        input: {
          command: "xyz --invalid",
          description: "Run invalid command",
        },
      },
    },
    toolResult: mockErrorResult,
  },
};

/**
 * Read file tool
 */
export const ReadFile: Story = {
  args: {
    toolCall: {
      id: "msg_tool_read",
      role: "assistant",
      subtype: "tool-call",
      timestamp: Date.now() - 2000,
      toolCall: {
        type: "tool-call",
        id: "tool_call_read",
        name: "read",
        input: {
          file_path: "/Users/sean/project/src/index.ts",
        },
      },
    },
    toolResult: {
      id: "msg_result_read",
      role: "tool",
      subtype: "tool-result",
      timestamp: Date.now(),
      toolCallId: "tool_call_read",
      toolResult: {
        type: "tool-result",
        id: "tool_call_read",
        name: "read",
        output: {
          type: "text",
          value: `import { createApp } from "./app";
import { logger } from "./logger";

const PORT = process.env.PORT || 3000;

async function main() {
  const app = createApp();
  app.listen(PORT, () => {
    logger.info(\`Server running on port \${PORT}\`);
  });
}

main();`,
        },
      },
    },
  },
};

/**
 * Write file tool
 */
export const WriteFile: Story = {
  args: {
    toolCall: {
      id: "msg_tool_write",
      role: "assistant",
      subtype: "tool-call",
      timestamp: Date.now() - 1000,
      toolCall: {
        type: "tool-call",
        id: "tool_call_write",
        name: "write",
        input: {
          file_path: "/Users/sean/project/test.txt",
          content: "Hello, World!",
        },
      },
    },
    toolResult: {
      id: "msg_result_write",
      role: "tool",
      subtype: "tool-result",
      timestamp: Date.now(),
      toolCallId: "tool_call_write",
      toolResult: {
        type: "tool-result",
        id: "tool_call_write",
        name: "write",
        output: {
          type: "text",
          value: "File written successfully",
        },
      },
    },
  },
};

/**
 * Glob search tool
 */
export const GlobSearch: Story = {
  args: {
    toolCall: {
      id: "msg_tool_glob",
      role: "assistant",
      subtype: "tool-call",
      timestamp: Date.now() - 3000,
      toolCall: {
        type: "tool-call",
        id: "tool_call_glob",
        name: "glob",
        input: {
          pattern: "**/*.tsx",
          path: "/Users/sean/project/src",
        },
      },
    },
    toolResult: {
      id: "msg_result_glob",
      role: "tool",
      subtype: "tool-result",
      timestamp: Date.now(),
      toolCallId: "tool_call_glob",
      toolResult: {
        type: "tool-result",
        id: "tool_call_glob",
        name: "glob",
        output: {
          type: "text",
          value: `Found 12 files:
- src/components/App.tsx
- src/components/Header.tsx
- src/components/Footer.tsx
- src/pages/Home.tsx
- src/pages/About.tsx
- src/utils/helpers.tsx`,
        },
      },
    },
  },
};

/**
 * In conversation context
 */
export const InConversation: Story = {
  render: () => (
    <div className="space-y-4 w-[800px]">
      {/* User message */}
      <div className="flex gap-3 py-2 flex-row-reverse">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-primary text-primary-foreground">
          U
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <div className="text-sm">List all TypeScript files in the project</div>
        </div>
      </div>

      {/* Tool call - executing */}
      <ToolMessage
        toolCall={{
          id: "msg_tool_ctx",
          role: "assistant",
          subtype: "tool-call",
          timestamp: Date.now() - 2000,
          toolCall: {
            type: "tool-call",
            id: "tool_call_ctx",
            name: "glob",
            input: {
              pattern: "**/*.ts",
            },
          },
        }}
      />

      {/* Tool call - with result */}
      <ToolMessage
        toolCall={{
          id: "msg_tool_ctx2",
          role: "assistant",
          subtype: "tool-call",
          timestamp: Date.now() - 5000,
          toolCall: {
            type: "tool-call",
            id: "tool_call_ctx2",
            name: "glob",
            input: {
              pattern: "**/*.tsx",
            },
          },
        }}
        toolResult={{
          id: "msg_result_ctx2",
          role: "tool",
          subtype: "tool-result",
          timestamp: Date.now() - 2000,
          toolCallId: "tool_call_ctx2",
          toolResult: {
            type: "tool-result",
            id: "tool_call_ctx2",
            name: "glob",
            output: {
              type: "text",
              value: "Found 15 files matching **/*.tsx",
            },
          },
        }}
      />

      {/* Assistant response */}
      <div className="flex gap-3 py-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 bg-muted">
          A
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
          <div className="text-sm">
            I found 15 TypeScript React files (.tsx) in your project. Would you like me to search
            for regular TypeScript files (.ts) as well?
          </div>
        </div>
      </div>
    </div>
  ),
};
