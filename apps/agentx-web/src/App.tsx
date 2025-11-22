import { useEffect, useState } from "react";
import { SSEAgent } from "./agent";
import type { AgentService } from "@deepractice-ai/agentx-framework";
import { Chat } from "@deepractice-ai/agentx-ui";

export default function App() {
  const [agent, setAgent] = useState<AgentService | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create agent with SSE connection
    // In development, connect to localhost:5200
    // In production, use same host
    const isDev = import.meta.env.DEV;
    const serverUrl = isDev ? "http://localhost:5200" : window.location.origin;

    // Create SSE browser agent
    const sessionId = `session-${Date.now()}`;

    const agentInstance = SSEAgent.create({
      serverUrl,
      sessionId,
    } as any);

    // Initialize agent
    agentInstance
      .initialize()
      .then(() => {
        console.log("✅ Agent connected");
        setAgent(agentInstance);
      })
      .catch((err) => {
        console.error("❌ Failed to initialize agent:", err);
        setError("Failed to connect to agent server");
      });

    // Cleanup on unmount
    return () => {
      if (agent) {
        agent.destroy();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <h2>Connection Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner" />
          <p>Connecting to agent...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Chat area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-7xl h-full">
          <Chat agent={agent} />
        </div>
      </div>
    </div>
  );
}
