import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ListPane } from "./ListPane";
import { MessageSquare, File, Folder, User, Clock, Star } from "lucide-react";
import { Badge } from "~/components/element/Badge";
import { AgentLogo } from "~/components/element/AgentLogo";

const meta: Meta<typeof ListPane> = {
  title: "Pane/ListPane",
  component: ListPane,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A generic list panel component for displaying items with search, selection, and actions. Pure UI with no business logic.",
      },
    },
  },
  argTypes: {
    title: {
      control: "text",
      description: "Panel title displayed in header",
    },
    searchable: {
      control: "boolean",
      description: "Enable search functionality",
    },
    showNewButton: {
      control: "boolean",
      description: "Show new item button in header",
    },
    isLoading: {
      control: "boolean",
      description: "Loading state",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ListPane>;

// Sample conversation items
const conversationItems = [
  {
    id: "1",
    title: "Project Planning Session",
    leading: <AgentLogo className="w-3 h-3" />,
    trailing: (
      <Badge variant="secondary" className="text-xs px-1 py-0">
        12
      </Badge>
    ),
    timestamp: Date.now() - 5 * 60 * 1000,
    active: true,
  },
  {
    id: "2",
    title: "Code Review Discussion",
    leading: <AgentLogo className="w-3 h-3" />,
    trailing: (
      <Badge variant="secondary" className="text-xs px-1 py-0">
        8
      </Badge>
    ),
    timestamp: Date.now() - 30 * 60 * 1000,
  },
  {
    id: "3",
    title: "API Design Meeting",
    leading: <AgentLogo className="w-3 h-3" />,
    trailing: (
      <Badge variant="secondary" className="text-xs px-1 py-0">
        5
      </Badge>
    ),
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: "4",
    title: "Bug Investigation",
    leading: <AgentLogo className="w-3 h-3" />,
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
  },
];

// Sample file items
const fileItems = [
  {
    id: "folder-1",
    title: "Documents",
    leading: <Folder className="w-4 h-4 text-blue-500" />,
    subtitle: <span className="text-xs text-muted-foreground">48 items</span>,
    trailing: <Star className="w-3 h-3 text-yellow-500" />,
  },
  {
    id: "folder-2",
    title: "Projects",
    leading: <Folder className="w-4 h-4 text-blue-500" />,
    subtitle: <span className="text-xs text-muted-foreground">12 items</span>,
  },
  {
    id: "file-1",
    title: "README.md",
    leading: <File className="w-4 h-4 text-muted-foreground" />,
    subtitle: <span className="text-xs text-muted-foreground">8.2 KB</span>,
  },
  {
    id: "file-2",
    title: "package.json",
    leading: <File className="w-4 h-4 text-muted-foreground" />,
    subtitle: <span className="text-xs text-muted-foreground">1.5 KB</span>,
  },
];

// Sample user items
const userItems = [
  {
    id: "user-1",
    title: "John Doe",
    leading: (
      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
        JD
      </div>
    ),
    subtitle: <span className="text-xs text-muted-foreground">Online</span>,
    trailing: (
      <Badge variant="success" className="text-xs">
        Active
      </Badge>
    ),
  },
  {
    id: "user-2",
    title: "Sarah Chen",
    leading: (
      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
        SC
      </div>
    ),
    subtitle: <span className="text-xs text-muted-foreground">Away</span>,
    trailing: (
      <Badge variant="warning" className="text-xs">
        Away
      </Badge>
    ),
  },
  {
    id: "user-3",
    title: "Mike Brown",
    leading: (
      <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
        MB
      </div>
    ),
    subtitle: <span className="text-xs text-muted-foreground">Offline</span>,
  },
];

// Interactive wrapper for stateful stories
const InteractiveWrapper = ({ items, ...props }: React.ComponentProps<typeof ListPane>) => {
  const [selectedId, setSelectedId] = React.useState<string | null>("1");
  const [listItems, setListItems] = React.useState(items);

  const handleDelete = (id: string) => {
    setListItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleNew = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      title: `New Item ${listItems.length + 1}`,
      leading: <MessageSquare className="w-4 h-4" />,
      timestamp: Date.now(),
    };
    setListItems((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
  };

  return (
    <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
      <ListPane
        {...props}
        items={listItems}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onDelete={handleDelete}
        onNew={handleNew}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      title="Conversations"
      items={conversationItems}
      emptyState={{
        icon: <MessageSquare className="w-6 h-6" />,
        title: "No conversations",
        description: "Start a new conversation to begin",
        actionLabel: "New conversation",
      }}
    />
  ),
};

export const WithSearch: Story = {
  render: () => (
    <InteractiveWrapper
      title="Conversations"
      items={conversationItems}
      searchable
      searchPlaceholder="Search conversations..."
      emptyState={{
        icon: <MessageSquare className="w-6 h-6" />,
        title: "No conversations",
        description: "Start a new conversation to begin",
        actionLabel: "New conversation",
      }}
    />
  ),
};

export const FileExplorer: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("file-1");

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          title="Files"
          items={fileItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showNewButton={false}
          searchable
          searchPlaceholder="Search files..."
          emptyState={{
            icon: <Folder className="w-6 h-6" />,
            title: "No files",
            description: "This folder is empty",
          }}
        />
      </div>
    );
  },
};

export const UserList: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("user-1");

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          title="Team Members"
          items={userItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showNewButton={false}
          newButtonLabel="Invite member"
          emptyState={{
            icon: <User className="w-6 h-6" />,
            title: "No members",
            description: "Invite team members to collaborate",
            actionLabel: "Invite",
          }}
        />
      </div>
    );
  },
};

export const Loading: Story = {
  render: () => (
    <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
      <ListPane title="Conversations" items={[]} isLoading />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
      <ListPane
        title="Conversations"
        items={[]}
        onNew={() => console.log("New clicked")}
        emptyState={{
          icon: <MessageSquare className="w-6 h-6" />,
          title: "No conversations yet",
          description: "Start a new conversation to begin chatting",
          actionLabel: "Start new conversation",
        }}
      />
    </div>
  ),
};

export const WithActiveItem: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("1");
    const itemsWithActive = conversationItems.map((item, index) => ({
      ...item,
      active: index === 0,
    }));

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          title="Conversations"
          items={itemsWithActive}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={(id) => console.log("Delete:", id)}
          onNew={() => console.log("New clicked")}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "List with an active item showing green pulsing indicator",
      },
    },
  },
};

export const CustomActions: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("1");

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          title="Conversations"
          items={conversationItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNew={() => console.log("New clicked")}
          renderItemActions={(item) => (
            <div className="flex items-center gap-1">
              <button
                className="w-6 h-6 hover:bg-accent rounded flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Star:", item.id);
                }}
                title="Star"
              >
                <Star className="w-3 h-3" />
              </button>
              <button
                className="w-6 h-6 hover:bg-accent rounded flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Archive:", item.id);
                }}
                title="Archive"
              >
                <Clock className="w-3 h-3" />
              </button>
            </div>
          )}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "List with custom action buttons rendered via renderItemActions prop",
      },
    },
  },
};

export const ManyItems: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("1");
    const manyItems = Array.from({ length: 50 }, (_, i) => ({
      id: String(i + 1),
      title: `Conversation ${i + 1}`,
      leading: <AgentLogo className="w-3 h-3" />,
      timestamp: Date.now() - i * 60 * 60 * 1000,
    }));

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          title="Conversations"
          items={manyItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDelete={(id) => console.log("Delete:", id)}
          onNew={() => console.log("New clicked")}
          searchable
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Scrollable list with many items",
      },
    },
  },
};

export const NoHeader: Story = {
  render: () => {
    const [selectedId, setSelectedId] = React.useState<string | null>("1");

    return (
      <div className="h-96 w-72 border border-border rounded-md overflow-hidden">
        <ListPane
          items={conversationItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showNewButton={false}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "List without new button, minimal header",
      },
    },
  },
};
