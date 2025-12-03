/**
 * createAgentXHandler - Create framework-agnostic HTTP handler
 *
 * Based on Web Standards (Request/Response).
 * Can be adapted to Express, Fastify, Hono, Next.js, etc.
 *
 * @example
 * ```typescript
 * import { agentx } from "agentxjs";
 * import { createAgentXHandler } from "agentxjs/server";
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

import type {
  AgentX,
  Agent,
  UserMessage,
  DefinitionRecord,
  ImageRecord,
  SessionRecord,
  MessageRecord,
  ContainerRecord,
  ContainerConfig,
} from "@agentxjs/types";
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
import { SSEConnectionManager } from "./SSEServerTransport";
import { createLogger } from "@agentxjs/common";

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
    repository,
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

    // Definitions routes: /definitions, /definitions/:name
    if (method === "GET" && path === "/definitions") {
      return { type: "list_definitions" };
    }

    const definitionMatch = path.match(/^\/definitions\/([^/]+)$/);
    if (definitionMatch) {
      const definitionName = definitionMatch[1];

      if (method === "GET") {
        return { type: "get_definition", definitionName };
      }
      if (method === "PUT") {
        return { type: "save_definition", definitionName };
      }
      if (method === "DELETE") {
        return { type: "delete_definition", definitionName };
      }
      if (method === "HEAD") {
        return { type: "head_definition", definitionName };
      }
    }

    // Images routes: /images, /images/:imageId, /images/:imageId/sessions
    if (method === "GET" && path === "/images") {
      return { type: "list_images" };
    }

    const imageMatch = path.match(/^\/images\/([^/]+)(\/.*)?$/);
    if (imageMatch) {
      const imageId = imageMatch[1];
      const subPath = imageMatch[2] || "";

      if (method === "GET" && subPath === "") {
        return { type: "get_image", imageId };
      }
      if (method === "PUT" && subPath === "") {
        return { type: "save_image", imageId };
      }
      if (method === "DELETE" && subPath === "") {
        return { type: "delete_image", imageId };
      }
      if (method === "HEAD" && subPath === "") {
        return { type: "head_image", imageId };
      }
      if (method === "GET" && subPath === "/sessions") {
        return { type: "list_image_sessions", imageId };
      }
      if (method === "DELETE" && subPath === "/sessions") {
        return { type: "delete_image_sessions", imageId };
      }
      if (method === "POST" && subPath === "/run") {
        return { type: "run_image", imageId };
      }
    }

    // Sessions routes: /sessions, /sessions/:sessionId, /sessions/:sessionId/messages
    if (method === "GET" && path === "/sessions") {
      return { type: "list_sessions" };
    }

    const sessionMatch = path.match(/^\/sessions\/([^/]+)(\/.*)?$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const subPath = sessionMatch[2] || "";

      if (method === "GET" && subPath === "") {
        return { type: "get_session", sessionId };
      }
      if (method === "PUT" && subPath === "") {
        return { type: "save_session", sessionId };
      }
      if (method === "DELETE" && subPath === "") {
        return { type: "delete_session", sessionId };
      }
      if (method === "HEAD" && subPath === "") {
        return { type: "head_session", sessionId };
      }
      if (method === "GET" && subPath === "/messages") {
        return { type: "list_session_messages", sessionId };
      }
      if (method === "DELETE" && subPath === "/messages") {
        return { type: "delete_session_messages", sessionId };
      }
      if (method === "GET" && subPath === "/messages/count") {
        return { type: "count_session_messages", sessionId };
      }
      if (method === "POST" && subPath === "/resume") {
        return { type: "resume_session", sessionId };
      }
    }

    // Users routes: /users/:userId/sessions
    const userMatch = path.match(/^\/users\/([^/]+)\/sessions$/);
    if (userMatch && method === "GET") {
      return { type: "list_user_sessions", userId: userMatch[1] };
    }

    // Messages routes: /messages/:messageId
    const messageMatch = path.match(/^\/messages\/([^/]+)$/);
    if (messageMatch) {
      const messageId = messageMatch[1];
      if (method === "GET") {
        return { type: "get_message", messageId };
      }
      if (method === "PUT") {
        return { type: "save_message", messageId };
      }
      if (method === "DELETE") {
        return { type: "delete_message", messageId };
      }
    }

    // Containers routes: /containers, /containers/:containerId
    if (method === "GET" && path === "/containers") {
      return { type: "list_containers" };
    }

    if (method === "POST" && path === "/containers") {
      return { type: "create_container" };
    }

    const containerMatch = path.match(/^\/containers\/([^/]+)$/);
    if (containerMatch) {
      const containerId = containerMatch[1];
      if (method === "GET") {
        return { type: "get_container", containerId };
      }
      if (method === "PUT") {
        return { type: "save_container", containerId };
      }
      if (method === "DELETE") {
        return { type: "delete_container", containerId };
      }
      if (method === "HEAD") {
        return { type: "head_container", containerId };
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

    // Get MetaImage for the definition
    const metaImage = await agentx.images.getMetaImage(body.definition);
    if (!metaImage) {
      return errorResponse(
        "IMAGE_NOT_FOUND",
        `MetaImage for definition '${body.definition}' not found`,
        404
      );
    }

    // Create agent from image (Docker-style: docker run <image>)
    const agent = await agentx.images.run(metaImage.imageId);

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
    // TODO: Remove this delay - only for testing SSE race condition
    // Simulate network latency (500ms) to reproduce race condition bug
    await new Promise((resolve) => setTimeout(resolve, 500));

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
  // Repository Handlers (Images, Sessions, Messages)
  // ============================================================================

  function getRepository(): import("@agentxjs/types").Repository {
    if (!repository) {
      throw new Error(
        "Repository not configured. Pass 'repository' option to createAgentXHandler."
      );
    }
    return repository;
  }

  // ----- Definitions -----

  async function handleListDefinitions(): Promise<Response> {
    const repo = getRepository();
    const definitions = await repo.findAllDefinitions();
    return jsonResponse(definitions);
  }

  async function handleGetDefinition(name: string): Promise<Response> {
    const repo = getRepository();
    const definition = await repo.findDefinitionByName(name);
    if (!definition) {
      return errorResponse("INVALID_REQUEST", `Definition ${name} not found`, 404);
    }
    return jsonResponse(definition);
  }

  async function handleSaveDefinition(name: string, request: Request): Promise<Response> {
    const repo = getRepository();
    let body: DefinitionRecord;
    try {
      body = (await request.json()) as DefinitionRecord;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }
    await repo.saveDefinition({ ...body, name });
    return new Response(null, { status: 204 });
  }

  async function handleDeleteDefinition(name: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteDefinition(name);
    return new Response(null, { status: 204 });
  }

  async function handleHeadDefinition(name: string): Promise<Response> {
    const repo = getRepository();
    const exists = await repo.definitionExists(name);
    return new Response(null, { status: exists ? 200 : 404 });
  }

  // ----- Images -----

  async function handleListImages(): Promise<Response> {
    const repo = getRepository();
    const images = await repo.findAllImages();
    return jsonResponse(images);
  }

  async function handleGetImage(imageId: string): Promise<Response> {
    const repo = getRepository();
    const image = await repo.findImageById(imageId);
    if (!image) {
      return errorResponse("INVALID_REQUEST", `Image ${imageId} not found`, 404);
    }
    return jsonResponse(image);
  }

  async function handleSaveImage(imageId: string, request: Request): Promise<Response> {
    const repo = getRepository();
    let body: ImageRecord;
    try {
      body = (await request.json()) as ImageRecord;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }
    await repo.saveImage({ ...body, imageId });
    return new Response(null, { status: 204 });
  }

  async function handleDeleteImage(imageId: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteImage(imageId);
    return new Response(null, { status: 204 });
  }

  async function handleHeadImage(imageId: string): Promise<Response> {
    const repo = getRepository();
    const exists = await repo.imageExists(imageId);
    return new Response(null, { status: exists ? 200 : 404 });
  }

  async function handleListImageSessions(imageId: string): Promise<Response> {
    const repo = getRepository();
    const sessions = await repo.findSessionsByImageId(imageId);
    return jsonResponse(sessions);
  }

  async function handleDeleteImageSessions(imageId: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteSessionsByImageId(imageId);
    return new Response(null, { status: 204 });
  }

  /**
   * Run agent from image (Docker-style: docker run <image>)
   * POST /images/:imageId/run
   */
  async function handleRunImage(imageId: string, request: Request): Promise<Response> {
    // Parse optional containerId from request body
    let containerId: string | undefined;
    try {
      const body = (await request.json()) as { containerId?: string };
      containerId = body.containerId;
    } catch {
      // No body or invalid JSON - use default container
    }

    // Run agent from image via Container
    const agent = await agentx.images.run(imageId, { containerId });

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

  // ----- Sessions -----

  async function handleListSessions(): Promise<Response> {
    const repo = getRepository();
    const sessions = await repo.findAllSessions();
    return jsonResponse(sessions);
  }

  async function handleGetSession(sessionId: string): Promise<Response> {
    const repo = getRepository();
    const session = await repo.findSessionById(sessionId);
    if (!session) {
      return errorResponse("INVALID_REQUEST", `Session ${sessionId} not found`, 404);
    }
    return jsonResponse(session);
  }

  async function handleSaveSession(sessionId: string, request: Request): Promise<Response> {
    const repo = getRepository();
    let body: SessionRecord;
    try {
      body = (await request.json()) as SessionRecord;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }
    await repo.saveSession({ ...body, sessionId });
    return new Response(null, { status: 204 });
  }

  async function handleDeleteSession(sessionId: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteSession(sessionId);
    return new Response(null, { status: 204 });
  }

  async function handleHeadSession(sessionId: string): Promise<Response> {
    const repo = getRepository();
    const exists = await repo.sessionExists(sessionId);
    return new Response(null, { status: exists ? 200 : 404 });
  }

  async function handleListSessionMessages(sessionId: string): Promise<Response> {
    const repo = getRepository();
    const messages = await repo.findMessagesBySessionId(sessionId);
    return jsonResponse(messages);
  }

  async function handleDeleteSessionMessages(sessionId: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteMessagesBySessionId(sessionId);
    return new Response(null, { status: 204 });
  }

  async function handleCountSessionMessages(sessionId: string): Promise<Response> {
    const repo = getRepository();
    const count = await repo.countMessagesBySessionId(sessionId);
    return jsonResponse({ count });
  }

  /**
   * Resume agent from session
   * POST /sessions/:sessionId/resume
   */
  async function handleResumeSession(sessionId: string, request: Request): Promise<Response> {
    // Get session from repository
    const session = await agentx.sessions.get(sessionId);
    if (!session) {
      return errorResponse("INVALID_REQUEST", `Session ${sessionId} not found`, 404);
    }

    // Parse optional containerId from request body
    let containerId: string | undefined;
    try {
      const body = (await request.json()) as { containerId?: string };
      containerId = body.containerId;
    } catch {
      // No body or invalid JSON - use default container
    }

    // Resume agent via Container
    const agent = await session.resume({ containerId });

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

  // ----- Users -----

  async function handleListUserSessions(userId: string): Promise<Response> {
    const repo = getRepository();
    const sessions = await repo.findSessionsByUserId(userId);
    return jsonResponse(sessions);
  }

  // ----- Messages -----

  async function handleGetMessage(messageId: string): Promise<Response> {
    const repo = getRepository();
    const message = await repo.findMessageById(messageId);
    if (!message) {
      return errorResponse("INVALID_REQUEST", `Message ${messageId} not found`, 404);
    }
    return jsonResponse(message);
  }

  async function handleSaveMessage(messageId: string, request: Request): Promise<Response> {
    const repo = getRepository();
    let body: MessageRecord;
    try {
      body = (await request.json()) as MessageRecord;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }
    await repo.saveMessage({ ...body, messageId });
    return new Response(null, { status: 204 });
  }

  async function handleDeleteMessage(messageId: string): Promise<Response> {
    const repo = getRepository();
    await repo.deleteMessage(messageId);
    return new Response(null, { status: 204 });
  }

  // ----- Containers -----

  async function handleListContainers(): Promise<Response> {
    const repo = getRepository();
    const containers = await repo.findAllContainers();
    return jsonResponse(containers);
  }

  async function handleCreateContainer(request: Request): Promise<Response> {
    let config: ContainerConfig | undefined;
    try {
      const body = (await request.json()) as { config?: ContainerConfig };
      config = body.config;
    } catch {
      // No body or invalid JSON - create with no config
    }

    const container: ContainerRecord = await agentx.containers.create(config);
    return jsonResponse(container, 201);
  }

  async function handleGetContainer(containerId: string): Promise<Response> {
    const container = await agentx.containers.get(containerId);
    if (!container) {
      return errorResponse("INVALID_REQUEST", `Container ${containerId} not found`, 404);
    }
    return jsonResponse(container);
  }

  async function handleDeleteContainer(containerId: string): Promise<Response> {
    const deleted = await agentx.containers.delete(containerId);
    if (!deleted) {
      return errorResponse("INVALID_REQUEST", `Container ${containerId} not found`, 404);
    }
    return new Response(null, { status: 204 });
  }

  async function handleHeadContainer(containerId: string): Promise<Response> {
    const exists = await agentx.containers.exists(containerId);
    return new Response(null, { status: exists ? 200 : 404 });
  }

  async function handleSaveContainer(containerId: string, request: Request): Promise<Response> {
    const repo = getRepository();
    let body: ContainerRecord;
    try {
      body = (await request.json()) as ContainerRecord;
    } catch {
      return errorResponse("INVALID_REQUEST", "Invalid JSON body", 400);
    }
    await repo.saveContainer({ ...body, containerId });
    return new Response(null, { status: 204 });
  }

  // ============================================================================
  // Main Handler
  // ============================================================================

  const handler: AgentXHandler = async (request: Request): Promise<Response> => {
    try {
      const parsed = parseRequest(request);

      switch (parsed.type) {
        // Platform
        case "platform_info":
          return handlePlatformInfo();
        case "platform_health":
          return handleHealth();

        // Agents
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

        // Definitions
        case "list_definitions":
          return handleListDefinitions();
        case "get_definition":
          return handleGetDefinition(parsed.definitionName!);
        case "save_definition":
          return handleSaveDefinition(parsed.definitionName!, request);
        case "delete_definition":
          return handleDeleteDefinition(parsed.definitionName!);
        case "head_definition":
          return handleHeadDefinition(parsed.definitionName!);

        // Images
        case "list_images":
          return handleListImages();
        case "get_image":
          return handleGetImage(parsed.imageId!);
        case "save_image":
          return handleSaveImage(parsed.imageId!, request);
        case "delete_image":
          return handleDeleteImage(parsed.imageId!);
        case "head_image":
          return handleHeadImage(parsed.imageId!);
        case "list_image_sessions":
          return handleListImageSessions(parsed.imageId!);
        case "delete_image_sessions":
          return handleDeleteImageSessions(parsed.imageId!);
        case "run_image":
          return handleRunImage(parsed.imageId!, request);

        // Sessions
        case "list_sessions":
          return handleListSessions();
        case "get_session":
          return handleGetSession(parsed.sessionId!);
        case "save_session":
          return handleSaveSession(parsed.sessionId!, request);
        case "delete_session":
          return handleDeleteSession(parsed.sessionId!);
        case "head_session":
          return handleHeadSession(parsed.sessionId!);
        case "list_session_messages":
          return handleListSessionMessages(parsed.sessionId!);
        case "delete_session_messages":
          return handleDeleteSessionMessages(parsed.sessionId!);
        case "count_session_messages":
          return handleCountSessionMessages(parsed.sessionId!);
        case "resume_session":
          return handleResumeSession(parsed.sessionId!, request);

        // Users
        case "list_user_sessions":
          return handleListUserSessions(parsed.userId!);

        // Messages
        case "get_message":
          return handleGetMessage(parsed.messageId!);
        case "save_message":
          return handleSaveMessage(parsed.messageId!, request);
        case "delete_message":
          return handleDeleteMessage(parsed.messageId!);

        // Containers
        case "list_containers":
          return handleListContainers();
        case "create_container":
          return handleCreateContainer(request);
        case "get_container":
          return handleGetContainer(parsed.containerId!);
        case "save_container":
          return handleSaveContainer(parsed.containerId!, request);
        case "delete_container":
          return handleDeleteContainer(parsed.containerId!);
        case "head_container":
          return handleHeadContainer(parsed.containerId!);

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
