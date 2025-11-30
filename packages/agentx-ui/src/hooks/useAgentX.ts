/**
 * useAgentX - React hook for AgentX instance management
 *
 * Manages an AgentX instance lifecycle and provides methods
 * to create and destroy agents.
 *
 * @example
 * ```tsx
 * import { useAgentX } from "@deepractice-ai/agentx-ui";
 * import { BrowserRuntime } from "@deepractice-ai/agentx";
 * import { MyAgentDefinition } from "./agents";
 *
 * function App() {
 *   const runtime = useMemo(() => new BrowserRuntime({ serverUrl: "..." }), []);
 *   const agentx = useAgentX(runtime);
 *   const [agent, setAgent] = useState(null);
 *
 *   const handleCreateAgent = () => {
 *     if (!agentx) return;
 *     const newAgent = agentx.agents.create(MyAgentDefinition, {});
 *     setAgent(newAgent);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreateAgent}>Create Agent</button>
 *       {agent && <Chat agent={agent} />}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from "react";
import type { AgentX, Runtime } from "@deepractice-ai/agentx-types";

// Lazy import to avoid bundling issues
let createAgentXFn: ((runtime: Runtime) => AgentX) | null = null;

async function getCreateAgentX(): Promise<(runtime: Runtime) => AgentX> {
  if (!createAgentXFn) {
    const module = await import("@deepractice-ai/agentx");
    createAgentXFn = module.createAgentX;
  }
  return createAgentXFn;
}

/**
 * React hook for AgentX instance management
 *
 * Creates an AgentX instance on mount and destroys all agents on unmount.
 *
 * @param runtime - Runtime instance (required)
 * @returns The AgentX instance (null during initialization)
 */
export function useAgentX(runtime: Runtime): AgentX | null {
  const [agentx, setAgentx] = useState<AgentX | null>(null);

  useEffect(() => {
    let instance: AgentX | null = null;
    let mounted = true;

    getCreateAgentX()
      .then((createAgentX) => {
        if (!mounted) return;
        instance = createAgentX(runtime);
        setAgentx(instance);
      })
      .catch((error) => {
        console.error("[useAgentX] Failed to initialize AgentX:", error);
      });

    return () => {
      mounted = false;
      if (instance) {
        instance.agents.destroyAll().catch((error) => {
          console.error("[useAgentX] Failed to destroy agents:", error);
        });
      }
    };
  }, [runtime]); // Re-run if runtime changes

  return agentx;
}
