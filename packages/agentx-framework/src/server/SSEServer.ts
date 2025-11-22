/**
 * SSEServer - Server-Sent Events implementation of AgentServer
 *
 * Handles HTTP + SSE connections for agent communication.
 * Uses dual-manager architecture:
 * - AgentRegistry: Manages Agent lifecycle (sessionId -> AgentService)
 * - SSEConnectionManager: Manages SSE connection lifecycle (sessionId -> SSEConnection)
 *
 * API Endpoints:
 * - POST /api/session: Create a new session (returns sessionId and sseUrl)
 * - GET /api/sse/:sessionId: Establish SSE connection
 * - POST /api/message: Send message to agent
 *
 * Lifecycle:
 * - 1 Session : 1 Agent : N SSE Connections (supports reconnect)
 * - POST /api/session: Creates Agent, returns sessionId
 * - GET /api/sse/:sessionId: Establishes SSE connection
 * - POST /api/message: Sends message (requires existing session)
 * - Agent destruction triggers SSE connection cleanup
 */

import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createSSERequest } from "~/server/SSERequest";
import type { AgentServer, AgentServerConfig } from "~/server/AgentServer";
import { AgentRegistry } from "@deepractice-ai/agentx-core";
import { SSEConnectionManager } from "~/server/SSEConnectionManager";
import { SSEReactor } from "~/server/SSEReactor";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("framework/SSEServer");

/**
 * Parse JSON body from request
 */
async function parseJSONBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * SSEServer implementation
 */
export class SSEServer implements AgentServer {
  private server?: http.Server;
  private readonly registry: AgentRegistry;
  private readonly connectionManager: SSEConnectionManager;

  constructor(private config: AgentServerConfig) {
    // Create AgentRegistry with cleanup callback
    this.registry = new AgentRegistry({
      logger: createLogger("framework/SSEServer/AgentRegistry"),
      onSessionDestroy: async (sessionId) => {
        // When Agent is destroyed, also destroy SSE connection
        await this.connectionManager.destroy(sessionId);
      },
    });

    // Create SSEConnectionManager
    this.connectionManager = new SSEConnectionManager({
      logger: createLogger("framework/SSEServer/SSEConnectionManager"),
    });
  }

  async start(): Promise<void> {
    const port = this.config.port || 5200;
    const host = this.config.host || "0.0.0.0";

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch((error) => {
        logger.error("Request handler error", { error });
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(port, host, () => {
        logger.info(`SSEServer listening on http://${host}:${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    logger.info("Stopping SSEServer");

    // Destroy all agent sessions (this will trigger SSE cleanup via callback)
    const agentCount = await this.registry.destroyAll();
    logger.info(`Destroyed ${agentCount} agent sessions`);

    // Close HTTP server
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      });
    }
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || "/";

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      });
      res.end();
      return;
    }

    // POST /api/session - Create new session
    if (req.method === "POST" && url === "/api/session") {
      return this.handleCreateSession(req, res);
    }

    // POST /api/message - Send message to agent
    if (req.method === "POST" && url === "/api/message") {
      return this.handlePostMessage(req, res);
    }

    // GET /api/sse/:sessionId - SSE stream
    if (req.method === "GET" && url.startsWith("/api/sse/")) {
      const sessionId = url.substring("/api/sse/".length);
      return this.handleSSE(req, res, sessionId);
    }

    // Fallback to custom handler if provided
    if (this.config.fallbackHandler) {
      return this.config.fallbackHandler(req, res);
    }

    // 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }

  /**
   * Handle POST /api/session
   *
   * Creates a new session (Agent) and returns sessionId and sseUrl.
   * This should be called before establishing SSE connection.
   */
  private async handleCreateSession(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      logger.info("POST /api/session - Creating new session", { sessionId });

      // Create agent via registry
      await this.registry.createSession(sessionId, () => this.config.createAgent(sessionId));

      logger.info("Session created", { sessionId });

      // Return session info
      const sseUrl = `/api/sse/${sessionId}`;
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ sessionId, sseUrl }));
    } catch (error) {
      logger.error("POST /api/session error", { error });
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  /**
   * Handle POST /api/message
   *
   * Sends message to existing session. Session must be created first via POST /api/session.
   */
  private async handlePostMessage(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const { sessionId, message } = await parseJSONBody(req);

      if (!sessionId || !message) {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Missing sessionId or message" }));
        return;
      }

      logger.info("POST /api/message", { sessionId });

      // Get agent (must exist - created via POST /api/session)
      const agent = this.registry.getSession(sessionId);
      if (!agent) {
        logger.error("Session not found", { sessionId });
        res.writeHead(404, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Session not found. Call POST /api/session first." }));
        return;
      }

      // Get SSE connection
      const connection = this.connectionManager.get(sessionId);

      if (connection?.isConnected) {
        // SSE connected - send immediately
        logger.debug("Sending message immediately", { sessionId });
        agent.queue(message).catch((error: any) => {
          logger.error("Agent queue error", { sessionId, error: error.message });
        });
      } else {
        // SSE not connected - queue message
        logger.debug("Queueing message (SSE not connected)", { sessionId });
        this.connectionManager.queueMessage(sessionId, message);
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      logger.error("POST /api/message error", { error });
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  /**
   * Handle GET /api/sse/:sessionId
   *
   * Establishes SSE connection, flushes pending messages
   */
  private async handleSSE(
    _req: IncomingMessage,
    res: ServerResponse,
    sessionId: string
  ): Promise<void> {
    try {
      logger.info("GET /api/sse", { sessionId });

      // Get agent from registry (should exist from POST)
      const agent = this.registry.getSession(sessionId);

      if (!agent) {
        logger.error("No agent session found", { sessionId });
        res.writeHead(404, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Session not found. Call POST /api/session first." }));
        return;
      }

      // Create SSE request
      const sseRequest = createSSERequest({
        res,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });

      // Get existing connection
      const existingConnection = this.connectionManager.get(sessionId);

      if (existingConnection?.reactor) {
        // Reconnect - update SSE request in existing reactor
        logger.info("SSE reconnect - updating request", { sessionId });
        this.connectionManager.updateRequest(sessionId, sseRequest);
      } else {
        // First connection - create reactor
        logger.info("Creating new SSEReactor", { sessionId });

        const reactorConfig = { request: sseRequest };
        const reactor = SSEReactor.create(reactorConfig);
        const unsubscribe = await agent.registerReactor(reactor);

        // Upgrade or create connection
        this.connectionManager.upgrade(sessionId, reactor, reactorConfig, unsubscribe);
      }

      // Flush pending messages
      const pendingMessages = this.connectionManager.flushPendingMessages(sessionId);
      for (const message of pendingMessages) {
        agent.queue(message).catch((error: any) => {
          logger.error("Agent queue error (pending)", { sessionId, error: error.message });
        });
      }

      // Handle SSE disconnect
      res.on("close", () => {
        logger.info("SSE connection closed", { sessionId });
        this.connectionManager.markDisconnected(sessionId);
      });
    } catch (error) {
      logger.error("GET /api/sse error", { sessionId, error });
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}

/**
 * Create an SSE server
 */
export function createSSEServer(config: AgentServerConfig): AgentServer {
  return new SSEServer(config);
}
