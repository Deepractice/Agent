/**
 * createAgentX - Factory function for creating AgentX instances
 */

import type { AgentX, SourceConfig } from "@agentxjs/types/agentx";

/**
 * Create AgentX instance
 *
 * Dynamically imports @agentxjs/runtime to avoid bundling Claude SDK in browser.
 */
async function createAgentXFromConfig(config: SourceConfig): Promise<AgentX> {
  // Dynamic import to avoid bundling runtime in browser
  const { createRuntime } = await import("@agentxjs/runtime");
  const { createPersistence } = await import("@agentxjs/persistence");

  const persistence = config.persistence ?? createPersistence();

  const runtime = createRuntime({
    persistence,
    llmProvider: {
      name: "claude",
      provide: () => ({
        apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
        baseUrl: config.baseUrl,
        model: config.model,
      }),
    },
  });

  return createAgentXFromRuntime(runtime);
}

/**
 * Create AgentX wrapper from Runtime
 */
function createAgentXFromRuntime(runtime: unknown): AgentX {
  const rt = runtime as {
    containers: { create: (id: string) => Promise<unknown>; get: (id: string) => unknown; list: () => unknown[] };
    agents: { run: (cid: string, cfg: unknown) => Promise<unknown>; get: (id: string) => unknown; list: (cid?: string) => unknown[]; destroy: (id: string) => Promise<boolean>; destroyAll: (cid: string) => Promise<void> };
    images: { snapshot: (agent: unknown) => Promise<unknown>; get: (id: string) => Promise<unknown>; list: () => Promise<unknown[]>; delete: (id: string) => Promise<void> };
    events: { on: (type: string, handler: (e: unknown) => void) => () => void; onAll: (handler: (e: unknown) => void) => () => void };
    dispose: () => Promise<void>;
  };

  let containerCounter = 0;

  return {
    containers: {
      async create() {
        const id = `container_${Date.now()}_${++containerCounter}`;
        const container = await rt.containers.create(id);
        return { id, ...(container as object) } as { id: string };
      },
      get(containerId: string) {
        const container = rt.containers.get(containerId);
        return container ? { id: containerId, ...(container as object) } as { id: string } : undefined;
      },
      list() {
        return rt.containers.list() as { id: string }[];
      },
    },
    agents: {
      async run(containerId, config) {
        return rt.agents.run(containerId, config) as Promise<{ id: string; containerId: string; receive: (msg: string) => Promise<void>; on: (type: string, handler: (e: unknown) => void) => () => void; onAll: (handler: (e: unknown) => void) => () => void }>;
      },
      get(agentId) {
        return rt.agents.get(agentId) as { id: string; containerId: string; receive: (msg: string) => Promise<void>; on: (type: string, handler: (e: unknown) => void) => () => void; onAll: (handler: (e: unknown) => void) => () => void } | undefined;
      },
      list(containerId?: string) {
        return rt.agents.list(containerId) as { id: string; containerId: string; receive: (msg: string) => Promise<void>; on: (type: string, handler: (e: unknown) => void) => () => void; onAll: (handler: (e: unknown) => void) => () => void }[];
      },
      async destroy(agentId) {
        return rt.agents.destroy(agentId);
      },
    },
    images: {
      async snapshot(agentId) {
        const agent = rt.agents.get(agentId);
        if (!agent) throw new Error(`Agent not found: ${agentId}`);
        return rt.images.snapshot(agent) as Promise<{ id: string; agentId: string; containerId: string; name: string; createdAt: number; resume: () => Promise<unknown> }>;
      },
      async get(imageId) {
        return rt.images.get(imageId) as Promise<{ id: string; agentId: string; containerId: string; name: string; createdAt: number; resume: () => Promise<unknown> } | null>;
      },
      async list() {
        return rt.images.list() as Promise<{ id: string; agentId: string; containerId: string; name: string; createdAt: number; resume: () => Promise<unknown> }[]>;
      },
      async delete(imageId) {
        return rt.images.delete(imageId);
      },
    },
    on(type, handler) {
      return rt.events.on(type, handler as (e: unknown) => void);
    },
    onAll(handler) {
      return rt.events.onAll(handler as (e: unknown) => void);
    },
    async dispose() {
      return rt.dispose();
    },
  } as AgentX;
}

/**
 * Create AgentX instance
 *
 * @param config - Optional configuration
 * @returns Promise of AgentX instance
 */
export function createAgentX(): Promise<AgentX>;
export function createAgentX(config: SourceConfig): Promise<AgentX>;
export function createAgentX(config?: SourceConfig): Promise<AgentX> {
  return createAgentXFromConfig(config ?? {});
}
