/**
 * Chat Page
 *
 * Main chat interface using Studio component.
 */

import { useState, useEffect } from "react";
import type { AgentX } from "agentxjs";
import { createAgentX } from "agentxjs";
import { Studio } from "@agentxjs/ui";
import "@agentxjs/ui/globals.css";

import { useAuth, getAuthToken } from "../hooks/useAuth";

// Server URLs
const AGENTX_INFO_URL = "/agentx/info";
// WebSocket URL will be determined from server info

/**
 * Loading screen
 */
function LoadingScreen() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse text-muted-foreground">...</div>
        <p className="text-muted-foreground">Connecting to server...</p>
      </div>
    </div>
  );
}

/**
 * Error screen
 */
function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <h2 className="text-xl font-semibold text-foreground mb-2">Connection Error</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * Header with logout button
 */
function Header({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-foreground">Portagent</span>
        <span className="text-xs text-muted-foreground">AgentX Portal</span>
      </div>
      <button
        onClick={onLogout}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

/**
 * Chat Page component
 */
export function ChatPage() {
  const { user, logout } = useAuth();
  const [agentx, setAgentx] = useState<AgentX | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);

  // Initialize AgentX connection
  useEffect(() => {
    let mounted = true;
    let agentxInstance: AgentX | null = null;

    const connect = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setError("Not authenticated");
          return;
        }

        // Get server info (includes WebSocket URL)
        const response = await fetch(AGENTX_INFO_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Server returned error");
        }

        const info = await response.json();
        if (!mounted) return;

        // Determine WebSocket URL (same host, /ws path)
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsPath = info.wsPath || "/ws";
        const wsUrl = `${wsProtocol}//${window.location.host}${wsPath}`;

        // Create AgentX instance in remote mode (WebSocket)
        agentxInstance = await createAgentX({ serverUrl: wsUrl });

        if (!mounted) {
          await agentxInstance.dispose();
          return;
        }

        setAgentx(agentxInstance);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error("Connection error:", err);
        setError("Cannot connect to server");
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      if (agentxInstance) {
        agentxInstance.dispose();
      }
    };
  }, []);

  const handleRetry = () => {
    setIsConnecting(true);
    setError(null);
    // Trigger reconnect by re-mounting
    window.location.reload();
  };

  if (isConnecting) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={handleRetry} />;
  }

  if (!agentx || !user) {
    return <ErrorScreen message="Failed to initialize" onRetry={handleRetry} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header onLogout={logout} />
      <div className="flex-1 overflow-hidden">
        <Studio agentx={agentx} containerId={user.containerId} />
      </div>
    </div>
  );
}
