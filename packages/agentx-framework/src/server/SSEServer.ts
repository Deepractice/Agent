/**
 * SSEServer - Server-Sent Events implementation of AgentServer
 *
 * Handles HTTP + SSE connections for agent communication.
 * Uses native SSE implementation without external dependencies.
 */

import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createSSERequest } from "~/server/SSERequest";
import type { AgentServer, AgentServerConfig } from "~/server/AgentServer";
import { AgentRegistry } from "@deepractice-ai/agentx-core";
import { SSEReactor } from "~/server/SSEReactor";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("SSEServer");

interface SSEConnectionData {
  reactor: ReturnType<typeof SSEReactor.create>;
  reactorConfig: import("~/server/SSEReactor").SSEReactorConfig;
  unsubscribe: () => void;
  pendingMessages: string[];
}

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
  private registry: AgentRegistry;
  private sseConnections = new Map<string, SSEConnectionData>();

  constructor(private config: AgentServerConfig) {
    this.registry = new AgentRegistry({
      logger: createLogger("SSEServer/AgentRegistry"),
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
    // Destroy all agent sessions via registry
    const count = await this.registry.destroyAll();
    logger.info(`Destroyed ${count} agent sessions`);

    // Clear SSE connections
    this.sseConnections.clear();

    // Close HTTP server
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || "/";
    console.log(`[SSEServer] ${req.method} ${url}`);

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

      console.log(`[SSEServer DEBUG] POST /api/message - Session: ${sessionId}`);
      logger.info(`POST /api/message - Session: ${sessionId}`);

      // Get or create agent for this session via registry
      let agent = this.registry.getSession(sessionId);
      console.log(`[SSEServer DEBUG] Found existing agent: ${!!agent}`);
      if (!agent) {
        agent = await this.registry.createSession(sessionId, () =>
          this.config.createAgent(sessionId)
        );
        logger.info(`Created new agent for session: ${sessionId}`);
      }

      // Get or create SSE connection data
      let sseConnection = this.sseConnections.get(sessionId);

      // Queue message if SSE not connected yet, otherwise send immediately
      console.log(`[SSEServer DEBUG] SSE connected: ${!!sseConnection}`);
      if (!sseConnection) {
        console.log(`[SSEServer DEBUG] Queueing message (no SSE connection yet)`);
        logger.info(`Queueing message for session ${sessionId} (SSE not connected yet)`);
        // Create connection data with pending message
        this.sseConnections.set(sessionId, {
          reactor: null as any,
          reactorConfig: null as any,
          unsubscribe: null as any,
          pendingMessages: [message],
        });
      } else {
        console.log(`[SSEServer DEBUG] Sending immediately`);
        logger.info(`Sending message immediately for session ${sessionId}`);
        agent.queue(message).catch((error: any) => {
          logger.error(`Agent error in session ${sessionId}`, { error });
        });
      }

      // Return SSE URL
      const sseUrl = `/api/sse/${sessionId}`;
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ sseUrl }));
    } catch (error) {
      logger.error("POST /api/message error", { error });
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  private async handleSSE(
    _req: IncomingMessage,
    res: ServerResponse,
    sessionId: string
  ): Promise<void> {
    console.log(`[SSEServer] handleSSE called - sessionId: ${sessionId}`);
    try {
      console.log(`[SSEServer DEBUG] GET /api/sse/${sessionId}`);

      // Get agent from registry (should already exist from POST)
      let agent = this.registry.getSession(sessionId);
      console.log(`[SSEServer DEBUG] Agent found: ${!!agent}`);

      // If agent doesn't exist, this is an error - SSE should come after POST
      if (!agent) {
        logger.error(`No agent session found for ${sessionId}. POST /api/message should be called first.`);
        res.writeHead(404, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Session not found. Call POST /api/message first." }));
        return;
      }

      console.log(`[SSEServer DEBUG] Opening SSE connection`);
      logger.info(`GET /api/sse/${sessionId} - Opening SSE connection`);

      // Create SSE request with CORS headers
      const sseRequest = createSSERequest({
        res,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });

      // Get or create SSE connection data
      let sseConnection = this.sseConnections.get(sessionId);

      // Check if reactor already exists for this session
      if (sseConnection && sseConnection.reactor && sseConnection.reactorConfig) {
        // Reactor exists - update the SSE request
        console.log(`[SSEServer DEBUG] Reusing existing reactor, updating SSE request`);
        logger.info(`Reusing SSEReactor for session: ${sessionId}, updating SSE request`);

        // Update the request in the config container
        if (sseConnection.reactorConfig._requestContainer) {
          sseConnection.reactorConfig._requestContainer.current = sseRequest;
          logger.info(`SSE request updated successfully`);
        } else {
          logger.error(`Cannot update SSE request - request container not found`);
        }
      } else {
        // First connection - create new reactor
        console.log(`[SSEServer DEBUG] Creating new SSEReactor`);
        logger.info(`Creating new SSEReactor for session: ${sessionId}`);

        const reactorConfig: import("~/server/SSEReactor").SSEReactorConfig = {
          request: sseRequest,
        };

        const reactor = SSEReactor.create(reactorConfig);
        console.log(`[SSEServer DEBUG] Registering SSEReactor`);

        const unsubscribe = await agent.registerReactor(reactor);
        console.log(`[SSEServer DEBUG] SSEReactor registered, unsubscribe type: ${typeof unsubscribe}`);
        logger.info(`SSEReactor registered for session: ${sessionId}`);

        // Create or update SSE connection data
        if (!sseConnection) {
          sseConnection = {
            reactor,
            reactorConfig,
            unsubscribe,
            pendingMessages: [],
          };
          this.sseConnections.set(sessionId, sseConnection);
        } else {
          sseConnection.reactor = reactor;
          sseConnection.reactorConfig = reactorConfig;
          sseConnection.unsubscribe = unsubscribe;
        }
      }

      // Send any pending messages now that SSE is connected
      console.log(`[SSEServer DEBUG] Pending messages: ${sseConnection.pendingMessages.length}`);
      if (sseConnection.pendingMessages.length > 0) {
        console.log(`[SSEServer DEBUG] Processing pending messages`);
        logger.info(`Processing ${sseConnection.pendingMessages.length} pending messages`);
        for (const pendingMessage of sseConnection.pendingMessages) {
          agent.queue(pendingMessage).catch((error: any) => {
            logger.error(`Agent error processing pending message`, { error });
          });
        }
        sseConnection.pendingMessages = [];
      }

      // Handle SSE disconnect (when client closes connection)
      res.on("close", () => {
        logger.info(`SSE connection closed: ${sessionId}`);
        // Don't unsubscribe reactor - it will be reused for next connection
        // Just log the disconnect
        logger.debug(`Client disconnected, reactor will be reused for next connection`);
      });
    } catch (error) {
      logger.error(`GET /api/sse/${sessionId} error`, { error });
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
