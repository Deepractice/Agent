import type { Meta, StoryObj } from "@storybook/react";
import { ToolCallContent } from "./ToolCallContent";

const meta = {
  title: "Chat/Parts/ToolCallContent",
  component: ToolCallContent,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ToolCallContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "call_abc123",
    name: "get_weather",
    input: {
      location: "San Francisco",
      unit: "celsius",
    },
  },
};

export const ComplexInput: Story = {
  args: {
    id: "call_def456",
    name: "search_database",
    input: {
      query: "SELECT * FROM users WHERE age > 18",
      database: "production",
      options: {
        limit: 100,
        offset: 0,
        orderBy: "created_at",
        direction: "desc",
      },
    },
  },
};

export const FileOperation: Story = {
  args: {
    id: "call_ghi789",
    name: "write_file",
    input: {
      path: "/Users/sean/document.txt",
      content: "Hello, world!",
      encoding: "utf-8",
      createDirectories: true,
    },
  },
};

export const APICall: Story = {
  args: {
    id: "call_jkl012",
    name: "fetch_api",
    input: {
      url: "https://api.example.com/users",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_abc123",
      },
      body: {
        name: "John Doe",
        email: "john@example.com",
      },
    },
  },
};

export const Collapsed: Story = {
  args: {
    id: "call_mno345",
    name: "calculate_statistics",
    input: {
      dataset: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      metrics: ["mean", "median", "std", "variance"],
    },
    defaultCollapsed: true,
  },
};

export const EmptyInput: Story = {
  args: {
    id: "call_pqr678",
    name: "get_current_time",
    input: {},
  },
};

export const NestedObjects: Story = {
  args: {
    id: "call_stu901",
    name: "create_user",
    input: {
      user: {
        profile: {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        preferences: {
          theme: "dark",
          notifications: {
            email: true,
            push: false,
            sms: false,
          },
        },
      },
      metadata: {
        source: "web",
        timestamp: "2024-01-15T10:30:00Z",
      },
    },
  },
};

export const MultipleCalls: Story = {
  args: {
    id: "call_1",
    name: "get_weather",
    input: { location: "San Francisco" },
  },
  render: () => (
    <div className="space-y-3">
      <ToolCallContent id="call_1" name="get_weather" input={{ location: "San Francisco" }} />
      <ToolCallContent id="call_2" name="search_database" input={{ query: "users", limit: 10 }} />
      <ToolCallContent
        id="call_3"
        name="send_email"
        input={{
          to: "user@example.com",
          subject: "Hello",
          body: "Test message",
        }}
      />
    </div>
  ),
};
