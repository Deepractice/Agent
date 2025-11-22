/**
 * SSEServer - Server-Sent Events implementation of AgentServer
 *
 * Handles HTTP + SSE connections for agent communication.
 * Uses native SSE implementation without external dependencies.
 */

import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createSimpleSSESession } from "~/server/SimpleSSESession";
import type { AgentServer, AgentServerConfig } from "~/server/AgentServer";
import type { AgentService } from "@deepractice-ai/agentx-core";
import { SSEReactor } from "~/server/SSEReactor";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("SSEServer");

interface SessionData {
  agent: AgentService;
  reactor?: ReturnType<typeof SSEReactor.create>;
  unsubscribe?: () => void;
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
  private sessions = new Map<string, SessionData>();

  constructor(private config: AgentServerConfig) {}

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
    // Destroy all agent sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      logger.info(`Destroying session: ${sessionId}`);
      await session.agent.destroy();
    }
    this.sessions.clear();

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

      // Get or create agent for this session
      let session = this.sessions.get(sessionId);
      console.log(`[SSEServer DEBUG] Found existing session: ${!!session}`);
      if (!session) {
        const agent = await this.config.createAgent(sessionId);
        await agent.initialize();
        session = { agent, pendingMessages: [] };
        this.sessions.set(sessionId, session);
        logger.info(`Created new agent for session: ${sessionId}`);
      }

      // Queue message if SSE not connected yet, otherwise send immediately
      console.log(`[SSEServer DEBUG] Reactor exists: ${!!session.reactor}`);
      if (!session.reactor) {
        console.log(`[SSEServer DEBUG] Queueing message`);
        logger.info(`Queueing message for session ${sessionId} (SSE not connected yet)`);
        session.pendingMessages.push(message);
      } else {
        console.log(`[SSEServer DEBUG] Sending immediately`);
        logger.info(`Sending message immediately for session ${sessionId}`);
        session.agent.send(message).catch((error) => {
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
      const session = this.sessions.get(sessionId);
      console.log(`[SSEServer DEBUG] Session found: ${!!session}`);
      if (!session) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }

      console.log(`[SSEServer DEBUG] Opening SSE connection`);
      logger.info(`GET /api/sse/${sessionId} - Opening SSE connection`);

      // Create SSE session with CORS headers
      const sseSession = createSimpleSSESession({
        res,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });

      // Attach SSEReactor to agent using registerReactor()
      console.log(`[SSEServer DEBUG] Creating SSEReactor`);
      const reactor = SSEReactor.create({ session: sseSession });
      console.log(`[SSEServer DEBUG] Registering SSEReactor`);
      logger.info(`Registering SSEReactor for session: ${sessionId}`);
      const unsubscribe = await session.agent.registerReactor(reactor);
      console.log(`[SSEServer DEBUG] SSEReactor registered, unsubscribe type: ${typeof unsubscribe}`);
      logger.debug(`SSEReactor registered`, {
        sessionId,
        unsubscribeType: typeof unsubscribe,
      });
      session.reactor = reactor;
      session.unsubscribe = unsubscribe;

      // Send any pending messages now that SSE is connected
      console.log(`[SSEServer DEBUG] Pending messages: ${session.pendingMessages.length}`);
      if (session.pendingMessages.length > 0) {
        console.log(`[SSEServer DEBUG] Processing pending messages`);
        logger.info(`Processing ${session.pendingMessages.length} pending messages`);
        for (const pendingMessage of session.pendingMessages) {
          session.agent.send(pendingMessage).catch((error) => {
            logger.error(`Agent error processing pending message`, { error });
          });
        }
        session.pendingMessages = [];
      }

      // Handle SSE disconnect (when client closes connection)
      res.on("close", () => {
        logger.info(`SSE disconnected: ${sessionId}`);
        // unsubscribe returns Promise, handle it properly
        (async () => {
          try {
            await unsubscribe();
          } catch (error) {
            logger.error(`Error unsubscribing reactor`, { error });
          }
        })();
        session.reactor = undefined;
        session.unsubscribe = undefined;
      });
    } catch (error) {
      logger.error(`GET /api/sse/${sessionId} error`, { error });
      res.writeHead(500, { "Content-Type": "application/json" });
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
