/**
 * useAgentX - React hook for AgentX instance management
 *
 * Manages an AgentX instance lifecycle and provides methods
 * to create and destroy agents.
 *
 * @example
 * ```tsx
 * import { useAgentX } from "@deepractice-ai/agentx-ui";
 * import { MyAgentDefinition } from "./agents";
 *
 * function App() {
 *   const agentx = useAgentX();
 *   const [agent, setAgent] = useState(null);
 *
 *   const handleCreateAgent = () => {
 *     const newAgent = agentx.agents.create(MyAgentDefinition, {
 *       apiKey: "xxx",
 *     });
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
import type { AgentX, AgentXOptions } from "@deepractice-ai/agentx-types";

// Lazy import to avoid bundling issues
let createAgentXFn: ((options?: AgentXOptions) => AgentX) | null = null;

async function getCreateAgentX(): Promise<(options?: AgentXOptions) => AgentX> {
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
 * @param options - Optional AgentX configuration
 * @returns The AgentX instance (null during initialization)
 */
export function useAgentX(options?: AgentXOptions): AgentX | null {
  const [agentx, setAgentx] = useState<AgentX | null>(null);

  useEffect(() => {
    let instance: AgentX | null = null;
    let mounted = true;

    getCreateAgentX()
      .then((createAgentX) => {
        if (!mounted) return;
        instance = createAgentX(options);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return agentx;
}
