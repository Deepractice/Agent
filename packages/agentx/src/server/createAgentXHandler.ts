/**
 * createAgentXHandler - Create framework-agnostic HTTP handler
 *
 * Based on Web Standards (Request/Response).
 * Can be adapted to Express, Fastify, Hono, Next.js, etc.
 *
 * @example
 * ```typescript
 * import { agentx } from "@deepractice-ai/agentx";
 * import { createAgentXHandler } from "@deepractice-ai/agentx/server";
 *
 * const handler = createAgentXHandler(agentx);
 *
 * // Express
 * app.use("/agentx", expressAdapter(handler));
 *
 * // Hono
 * app.use("/agentx/*", honoAdapter(handler));
 * ```
 */

import type { AgentX, Agent, UserMessage } from "@deepractice-ai/agentx-types";
import type {
  AgentXHandler,
  AgentXHandlerOptions,
  ParsedRequest,
  PlatformInfoResponse,
  HealthResponse,
  AgentListResponse,
  AgentInfoResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  SendMessageRequest,
  SendMessageResponse,
  InterruptResponse,
  ErrorResponse,
  ErrorCode,
} from "./types";
import { SSEConnectionManager } from "./SSETransport";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/AgentXHandler");

const VERSION = "0.1.0";

/**
 * Create an AgentX HTTP handler
 */
export function createAgentXHandler(
  agentx: AgentX,
  options: AgentXHandlerOptions = {}
): AgentXHandler {
  const {
    basePath = "",
    allowDynamicCreation = false,
    allowedDefinitions = [],
    hooks = {},
  } = options;

  const sseManager = new SSEConnectionManager();

  // Definition registry for dynamic creation
  const definitions = new Map<
    string,
    { definition: unknown; defaultConfig?: Record<string, unknown> }
  >();

  /**
   * Register a definition for dynamic creation
   */
  function registerDefinition(
    name: string,
    definition: unknown,
    defaultConfig?: Record<string, unknown>
  ): void {
    definitions.set(name, { definition, defaultConfig });
  }

  /**
   * Parse incoming request
   */
  function parseRequest(request: Request): ParsedRequest {
    const url = new URL(request.url);
    const method = request.method;

    // Remove basePath from pathname
    let path = url.pathname;
    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length);
    }

    // Normalize path (remove trailing slash, ensure leading slash)
    path = "/" + path.replace(/^\/+|\/+$/g, "");

    // Route matching
    if (method === "GET" && path === "/info") {
      return { type: "platform_info" };
    }

    if (method === "GET" && path === "/health") {
      return { type: "platform_health" };
    }

    if (method === "GET" && path === "/agents") {
      return { type: "list_agents" };
    }

    if (method === "POST" && path === "/agents") {
      return { type: "create_agent" };
    }

    // Agent-specific routes: /agents/:agentId/...
    const agentMatch = path.match(/^\/agents\/([^/]+)(\/.*)?$/);
    if (agentMatch) {
      const agentId = agentMatch[1];
      const subPath = agentMatch[2] || "";

      if (method === "GET" && subPath === "") {
        return { type: "get_agent", agentId };
      }

      if (method === "DELETE" && subPath === "") {
        return { type: "delete_agent", agentId };
      }

      if (method === "GET" && subPath === "/sse") {
        return { type: "connect_sse", agentId };
      }

      if (method === "POST" && subPath === "/messages") {
        return { type: "send_message", agentId };
      }

      if (method === "POST" && subPath === "/interrupt") {
        return { type: "interrupt", agentId };
      }
    }

    return { type: "not_found" };
  }

  /**
   * Create JSON response
   */
  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create error response
   */
  function errorResponse(code: ErrorCode, message: string, status: number): Response {
    const body: ErrorResponse = {
      error: { code, message },
    };
    return jsonResponse(body, status);
  }

  /**
   * Get agent or return error response
   */
  function getAgentOrError(agentId: string): Agent | Response {
    const agent = agentx.agents.get(agentId);
    if (!agent) {
      return errorResponse("AGENT_NOT_FOUND", `Agent ${agentId} not found`, 404);
    }
    if (agent.lifecycle === "destroyed") {
      return errorResponse("AGENT_DESTROYED", `Agent ${agentId} has been destroyed`, 410);
    }
    return agent;
  }

  /**
   * Build agent info response
   */
  function buildAgentInfo(agent: Agent): AgentInfoResponse {
    return {
      agentId: agent.agentId,
      name: agent.definition.name,
      description: agent.definition.description,
      lifecycle: agent.lifecycle,
      state: agent.state,
      createdAt: agent.createdAt,
    };
  }

  // ============================================================================
  // Route Handlers
  // ============================================================================

  async function handlePlatformInfo(): Promise<Response> {
    const response: PlatformInfoResponse = {
      platform: "AgentX",
      version: VERSION,
      agentCount: agentx.agents.list().length,
    };
    return jsonResponse(response);
  }

  async function handleHealth(): Promise<Response> {
    const response: HealthResponse = {
      status: "healthy",
      timestamp: Date.now(),
      agentCount: agentx.agents.list().length,
    };
    return jsonResponse(response);
  }

  async function handleListAgents(): Promise<Response> {
    const allAgents = agentx.agents.list();
    const agents: AgentInfoResponse[] = allAgents.map((agent) => buildAgentInfo(agent));

    const response: AgentListResponse = { agents };
    return jsonResponse(response);
  }

  async function handleCreateAgent(request: Request): Promise<Response> {
    if (!allowDynamicCreation) {
      return errorResponse("DYNAMIC_CREATION_DISABLED", "Dynamic agent creation is disabled", 403);
    }

    let body: CreateAgentRequest;
    try {
      body = (await request.json()) as CreateAgentRequest;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }

    if (!body.definition) {
      return errorResponse("INVALID_REQUEST", "Missing 'definition' field", 400);
    }

    // Check if definition is allowed
    if (allowedDefinitions.length > 0 && !allowedDefinitions.includes(body.definition)) {
      return errorResponse(
        "DEFINITION_NOT_FOUND",
        `Definition '${body.definition}' is not allowed`,
        403
      );
    }

    // Get registered definition
    const registered = definitions.get(body.definition);
    if (!registered) {
      return errorResponse(
        "DEFINITION_NOT_FOUND",
        `Definition '${body.definition}' not found`,
        404
      );
    }

    // Merge config
    const config = { ...registered.defaultConfig, ...body.config };

    // Create agent
    // Note: This assumes the definition is compatible with agents.create
    // In a real implementation, we'd need proper type handling
    const agent = agentx.agents.create(registered.definition as any, config);

    const response: CreateAgentResponse = {
      agentId: agent.agentId,
      name: agent.definition.name,
      lifecycle: agent.lifecycle,
      state: agent.state,
      createdAt: agent.createdAt,
      endpoints: {
        sse: `${basePath}/agents/${agent.agentId}/sse`,
        messages: `${basePath}/agents/${agent.agentId}/messages`,
        interrupt: `${basePath}/agents/${agent.agentId}/interrupt`,
      },
    };

    return jsonResponse(response, 201);
  }

  async function handleGetAgent(agentId: string): Promise<Response> {
    const result = getAgentOrError(agentId);
    if (result instanceof Response) return result;

    return jsonResponse(buildAgentInfo(result));
  }

  async function handleDeleteAgent(agentId: string): Promise<Response> {
    const result = getAgentOrError(agentId);
    if (result instanceof Response) return result;

    // Close any SSE connections
    sseManager.closeConnectionsForAgent(agentId);

    await agentx.agents.destroy(agentId);
    return new Response(null, { status: 204 });
  }

  async function handleConnectSSE(agentId: string): Promise<Response> {
    const result = getAgentOrError(agentId);
    if (result instanceof Response) return result;

    const agent = result;
    const { connection, response } = sseManager.createConnection(agent);

    // Call hook
    if (hooks.onConnect) {
      try {
        await hooks.onConnect(agentId, connection.connectionId);
      } catch {
        // Ignore hook errors
      }
    }

    // Register disconnect hook
    connection.onClose(() => {
      if (hooks.onDisconnect) {
        const result = hooks.onDisconnect(agentId, connection.connectionId);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
      }
    });

    return response;
  }

  async function handleSendMessage(agentId: string, request: Request): Promise<Response> {
    const result = getAgentOrError(agentId);
    if (result instanceof Response) return result;

    const agent = result;

    // Check if agent is busy
    if (agent.state !== "idle") {
      return errorResponse("AGENT_BUSY", `Agent is currently ${agent.state}`, 409);
    }

    let body: SendMessageRequest;
    try {
      body = (await request.json()) as SendMessageRequest;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }

    if (!body.content) {
      return errorResponse("INVALID_REQUEST", "Missing 'content' field", 400);
    }

    // Build UserMessage
    const message: UserMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      role: "user",
      subtype: "user",
      content: typeof body.content === "string" ? body.content : body.content,
      timestamp: Date.now(),
    };

    // Call hook
    if (hooks.onMessage) {
      try {
        await hooks.onMessage(agentId, message);
      } catch {
        // Ignore hook errors
      }
    }

    // Send message (non-blocking, response goes through SSE)
    agent.receive(message).catch((error) => {
      if (hooks.onError) {
        const result = hooks.onError(agentId, error);
        if (result instanceof Promise) {
          result.catch(() => {});
        }
      }
    });

    const response: SendMessageResponse = {
      status: "processing",
    };
    return jsonResponse(response, 202);
  }

  async function handleInterrupt(agentId: string): Promise<Response> {
    const result = getAgentOrError(agentId);
    if (result instanceof Response) return result;

    const agent = result;
    agent.interrupt();

    const response: InterruptResponse = {
      interrupted: true,
    };
    return jsonResponse(response);
  }

  // ============================================================================
  // Main Handler
  // ============================================================================

  const handler: AgentXHandler = async (request: Request): Promise<Response> => {
    try {
      const parsed = parseRequest(request);

      switch (parsed.type) {
        case "platform_info":
          return handlePlatformInfo();

        case "platform_health":
          return handleHealth();

        case "list_agents":
          return handleListAgents();

        case "create_agent":
          return handleCreateAgent(request);

        case "get_agent":
          return handleGetAgent(parsed.agentId!);

        case "delete_agent":
          return handleDeleteAgent(parsed.agentId!);

        case "connect_sse":
          return handleConnectSSE(parsed.agentId!);

        case "send_message":
          return handleSendMessage(parsed.agentId!, request);

        case "interrupt":
          return handleInterrupt(parsed.agentId!);

        case "not_found":
        default:
          return errorResponse("INVALID_REQUEST", "Not found", 404);
      }
    } catch (error) {
      logger.error("Unhandled error in request handler", { error });
      return errorResponse(
        "INTERNAL_ERROR",
        error instanceof Error ? error.message : "Internal server error",
        500
      );
    }
  };

  // Attach utilities to handler
  (handler as any).registerDefinition = registerDefinition;
  (handler as any).sseManager = sseManager;

  return handler;
}

/**
 * Extended handler with utilities
 */
export interface AgentXHandlerWithUtils extends AgentXHandler {
  /**
   * Register a definition for dynamic creation
   */
  registerDefinition(
    name: string,
    definition: unknown,
    defaultConfig?: Record<string, unknown>
  ): void;

  /**
   * SSE connection manager
   */
  sseManager: SSEConnectionManager;
}
