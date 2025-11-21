import type { Meta, StoryObj } from "@storybook/react";
import { ToolResultContent } from "./ToolResultContent";

const meta = {
  title: "Chat/Parts/ToolResultContent",
  component: ToolResultContent,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ToolResultContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextResult: Story = {
  args: {
    id: "call_abc123",
    name: "get_weather",
    output: {
      type: "text",
      value: "The weather in San Francisco is currently 72°F (22°C) with clear skies.",
    },
  },
};

export const JSONResult: Story = {
  args: {
    id: "call_def456",
    name: "search_database",
    output: {
      type: "json",
      value: {
        users: [
          { id: 1, name: "Alice", email: "alice@example.com" },
          { id: 2, name: "Bob", email: "bob@example.com" },
          { id: 3, name: "Charlie", email: "charlie@example.com" },
        ],
        total: 3,
        page: 1,
      },
    },
  },
};

export const ErrorText: Story = {
  args: {
    id: "call_ghi789",
    name: "write_file",
    output: {
      type: "error-text",
      value: "Failed to write file: Permission denied. The file is read-only.",
    },
  },
};

export const ErrorJSON: Story = {
  args: {
    id: "call_jkl012",
    name: "fetch_api",
    output: {
      type: "error-json",
      value: {
        error: "API_ERROR",
        message: "Failed to fetch data from API",
        statusCode: 500,
        details: {
          endpoint: "/api/users",
          timestamp: "2024-01-15T10:30:00Z",
        },
      },
    },
  },
};

export const ExecutionDenied: Story = {
  args: {
    id: "call_mno345",
    name: "delete_database",
    output: {
      type: "execution-denied",
      reason: "User denied permission to delete database",
    },
  },
};

export const ExecutionDeniedNoReason: Story = {
  args: {
    id: "call_pqr678",
    name: "dangerous_operation",
    output: {
      type: "execution-denied",
    },
  },
};

export const ContentWithMultipleParts: Story = {
  args: {
    id: "call_stu901",
    name: "generate_report",
    output: {
      type: "content",
      value: [
        {
          type: "text",
          text: "# Monthly Report\n\nHere is your monthly report with charts:",
        },
        {
          type: "image",
          data: "https://picsum.photos/400/300",
          mediaType: "image/jpeg",
          name: "chart.jpg",
        },
        {
          type: "text",
          text: "## Summary\n\nTotal revenue: $50,000\nTotal expenses: $30,000\nNet profit: $20,000",
        },
      ],
    },
  },
};

export const Collapsed: Story = {
  args: {
    id: "call_vwx234",
    name: "process_data",
    output: {
      type: "json",
      value: {
        processed: 1000,
        skipped: 50,
        errors: 2,
        duration: "5.2s",
      },
    },
    defaultCollapsed: true,
  },
};

export const MultipleResults: Story = {
  args: {
    id: "call_1",
    name: "get_weather",
    output: { type: "text", value: "Temperature: 72°F, Sunny" },
  },
  render: () => (
    <div className="space-y-3">
      <ToolResultContent
        id="call_1"
        name="get_weather"
        output={{ type: "text", value: "Temperature: 72°F, Sunny" }}
      />
      <ToolResultContent
        id="call_2"
        name="search_database"
        output={{
          type: "json",
          value: { users: [{ id: 1, name: "Alice" }], total: 1 },
        }}
      />
      <ToolResultContent
        id="call_3"
        name="write_file"
        output={{
          type: "error-text",
          value: "Permission denied: Cannot write to /etc/config",
        }}
      />
      <ToolResultContent
        id="call_4"
        name="delete_user"
        output={{
          type: "execution-denied",
          reason: "User denied confirmation prompt",
        }}
      />
    </div>
  ),
};
