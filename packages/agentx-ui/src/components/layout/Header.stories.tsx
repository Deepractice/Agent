import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Header } from "./Header";
import { Button } from "../elements/Button";
import { SearchInput } from "../elements/SearchInput";
import { AgentLogo } from "../elements/AgentLogo";
import { Bell, Settings, User, Menu } from "lucide-react";

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Application-level top header bar. Fixed height, spans full width, typically contains logo, navigation, search, and user controls.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  render: () => (
    <Header
      left={
        <div className="flex items-center gap-2">
          <AgentLogo className="w-5 h-5" />
          <span className="font-semibold">Deepractice Agent</span>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </div>
      }
    />
  ),
};

export const WithSearch: Story = {
  render: () => {
    const [search, setSearch] = useState("");
    return (
      <Header
        left={
          <div className="flex items-center gap-2">
            <AgentLogo className="w-5 h-5" />
            <span className="font-semibold">Deepractice Agent</span>
          </div>
        }
        center={
          <div className="max-w-xl w-full">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search sessions, messages..."
            />
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <User className="w-4 h-4" />
            </Button>
          </div>
        }
      />
    );
  },
};

export const WithTabs: Story = {
  render: () => (
    <Header
      left={
        <div className="flex items-center gap-2">
          <AgentLogo className="w-5 h-5" />
          <span className="font-semibold">Deepractice</span>
        </div>
      }
      center={
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-primary">
            Dashboard
          </Button>
          <Button variant="ghost" size="sm">
            Sessions
          </Button>
          <Button variant="ghost" size="sm">
            Analytics
          </Button>
          <Button variant="ghost" size="sm">
            Settings
          </Button>
        </nav>
      }
      right={
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm">
            New Session
          </Button>
          <Button variant="ghost" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </div>
      }
    />
  ),
};

export const Minimal: Story = {
  render: () => (
    <Header
      left={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Agent</span>
        </div>
      }
      right={
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      }
    />
  ),
};

export const WithUserInfo: Story = {
  render: () => (
    <Header
      left={
        <div className="flex items-center gap-2">
          <AgentLogo className="w-5 h-5" />
          <span className="font-semibold">Deepractice Agent</span>
        </div>
      }
      right={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <Bell className="w-4 h-4" />
            <span className="ml-2 text-xs">3</span>
          </Button>
          <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              JD
            </div>
            <div className="text-sm">
              <div className="font-medium">John Doe</div>
              <div className="text-xs text-muted-foreground">john@example.com</div>
            </div>
          </div>
        </div>
      }
    />
  ),
};

export const CustomHeight: Story = {
  render: () => (
    <Header
      height={72}
      left={
        <div className="flex items-center gap-3">
          <AgentLogo className="w-8 h-8" />
          <div>
            <div className="font-bold text-lg">Deepractice Agent</div>
            <div className="text-xs text-muted-foreground">AI-Powered Development</div>
          </div>
        </div>
      }
      right={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Documentation
          </Button>
          <Button variant="default" size="sm">
            Get Started
          </Button>
        </div>
      }
    />
  ),
};

export const InLayout: Story = {
  render: () => {
    const [search, setSearch] = useState("");
    return (
      <div className="h-screen flex flex-col">
        <Header
          left={
            <div className="flex items-center gap-2">
              <AgentLogo className="w-5 h-5" />
              <span className="font-semibold">Deepractice Agent</span>
            </div>
          }
          center={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search..."
              className="max-w-md"
            />
          }
          right={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4" />
              </Button>
            </div>
          }
        />
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Application Content</h2>
            <p className="text-muted-foreground">Header is fixed at the top</p>
          </div>
        </div>
      </div>
    );
  },
};
