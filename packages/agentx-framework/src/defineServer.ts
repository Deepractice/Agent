/**
 * createAgentServer - High-level API for creating agent servers
 *
 * @example Basic usage
 * ```typescript
 * import { createAgentServer } from "@deepractice-ai/agentx-framework/server";
 * import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";
 *
 * const server = createAgentServer(ClaudeAgent, {
 *   port: 5200,
 *   config: {
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     model: "claude-sonnet-4-5-20250929",
 *   },
 * });
 *
 * await server.start();
 * ```
 */

import { createSSEServer } from "./server/SSEServer";
import type { DefinedAgent } from "~/defineAgent";
import type { ConfigSchema, InferConfig } from "~/defineConfig";

// Re-export types for advanced usage
export {
  type AgentServer,
  type AgentServerConfig,
  type AgentFactory,
  type RequestHandler,
} from "./server/AgentServer";

/**
 * Server configuration (extends base AgentServerConfig)
 */
export interface CreateAgentServerOptions<TConfig extends ConfigSchema = any> {
  /**
   * Port to listen on
   * @default 5200
   */
  port?: number;

  /**
   * Host to bind to
   * @default "0.0.0.0"
   */
  host?: string;

  /**
   * Agent configuration (passed to agent.create())
   */
  config: Omit<Partial<InferConfig<TConfig>>, "sessionId">;

  /**
   * Fallback handler for non-API routes (e.g., static files)
   */
  fallbackHandler?: (req: any, res: any) => Promise<void> | void;
}

/**
 * Create an agent server with SSE transport
 *
 * @param definedAgent - The defined agent (from defineAgent)
 * @param options - Server configuration
 * @returns AgentServer instance
 */
export function createAgentServer<TConfig extends ConfigSchema = any>(
  definedAgent: DefinedAgent<TConfig>,
  options: CreateAgentServerOptions<TConfig>
) {
  const { port, host, config, fallbackHandler } = options;

  return createSSEServer({
    port,
    host,
    createAgent: (sessionId: string) => {
      return definedAgent.create({
        ...config,
        sessionId,
      } as any);
    },
    fallbackHandler,
  });
}

// Re-export low-level APIs for advanced usage
export { SSEServer } from "./server/SSEServer";
export { SSEReactor, type SSEReactorConfig } from "./server/SSEReactor";
export { SSERequest, createSSERequest, type SSERequestConfig } from "./server/SSERequest";
