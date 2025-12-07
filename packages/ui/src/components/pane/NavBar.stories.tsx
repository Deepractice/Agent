import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NavBar, type NavBarItem } from "./NavBar";
import { MessageSquare, Search, Settings, User, Bell, History, Bookmark } from "lucide-react";

const meta: Meta<typeof NavBar> = {
  title: "Pane/NavBar",
  component: NavBar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A simplified icon navigation bar. Wraps ActivityBar with a cleaner API for common use cases.",
      },
    },
  },
  argTypes: {
    position: {
      control: "select",
      options: ["left", "right"],
      description: "Position of the nav bar",
    },
  },
};

export default meta;
type Story = StoryObj<typeof NavBar>;

const defaultItems = [
  { id: "chat", icon: <MessageSquare className="w-5 h-5" />, label: "Chat" },
  { id: "search", icon: <Search className="w-5 h-5" />, label: "Search" },
  { id: "history", icon: <History className="w-5 h-5" />, label: "History" },
  { id: "bookmarks", icon: <Bookmark className="w-5 h-5" />, label: "Bookmarks" },
];

const bottomItems = [
  { id: "notifications", icon: <Bell className="w-5 h-5" />, label: "Notifications", badge: 3 },
  { id: "account", icon: <User className="w-5 h-5" />, label: "Account" },
  { id: "settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
];

// Interactive wrapper
const InteractiveWrapper = ({
  items,
  bottomItems,
  position = "left",
}: {
  items: NavBarItem[];
  bottomItems?: NavBarItem[];
  position?: "left" | "right";
}) => {
  const [activeId, setActiveId] = React.useState("chat");

  return (
    <div className="h-96 border border-border rounded-md overflow-hidden flex">
      {position === "left" && (
        <NavBar
          items={items}
          bottomItems={bottomItems}
          activeId={activeId}
          onSelect={setActiveId}
          position={position}
        />
      )}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Active view:</p>
          <p className="text-lg font-semibold capitalize">{activeId}</p>
        </div>
      </div>
      {position === "right" && (
        <NavBar
          items={items}
          bottomItems={bottomItems}
          activeId={activeId}
          onSelect={setActiveId}
          position={position}
        />
      )}
    </div>
  );
};

export const Default: Story = {
  render: () => <InteractiveWrapper items={defaultItems} />,
};

export const WithBottomItems: Story = {
  render: () => <InteractiveWrapper items={defaultItems} bottomItems={bottomItems} />,
  parameters: {
    docs: {
      description: {
        story: "Navigation bar with bottom section for settings, account, etc.",
      },
    },
  },
};

export const WithBadges: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState("chat");
    const itemsWithBadges = [
      { id: "chat", icon: <MessageSquare className="w-5 h-5" />, label: "Chat", badge: 5 },
      { id: "search", icon: <Search className="w-5 h-5" />, label: "Search" },
      { id: "history", icon: <History className="w-5 h-5" />, label: "History", badge: 12 },
      { id: "bookmarks", icon: <Bookmark className="w-5 h-5" />, label: "Bookmarks", badge: "!" },
    ];

    return (
      <div className="h-96 border border-border rounded-md overflow-hidden">
        <NavBar items={itemsWithBadges} activeId={activeId} onSelect={setActiveId} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Navigation items can display badges for notifications or counts",
      },
    },
  },
};

export const RightPosition: Story = {
  render: () => <InteractiveWrapper items={defaultItems} position="right" />,
  parameters: {
    docs: {
      description: {
        story: "Navigation bar positioned on the right side",
      },
    },
  },
};

export const MinimalItems: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState("chat");
    const minimalItems = [
      { id: "chat", icon: <MessageSquare className="w-5 h-5" />, label: "Chat" },
      { id: "settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
    ];

    return (
      <div className="h-96 border border-border rounded-md overflow-hidden">
        <NavBar items={minimalItems} activeId={activeId} onSelect={setActiveId} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal navigation with just essential items",
      },
    },
  },
};

export const FullLayout: Story = {
  render: () => {
    const [activeId, setActiveId] = React.useState("chat");

    return (
      <div className="h-screen flex border border-border rounded-md overflow-hidden">
        <NavBar
          items={defaultItems}
          bottomItems={bottomItems}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 capitalize">{activeId} View</h3>
            <p className="text-sm text-muted-foreground">Click navigation icons to switch views</p>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        story: "Full height navigation bar in a typical app layout",
      },
    },
  },
};
