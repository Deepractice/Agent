/**
 * SSEServer - Server-Sent Events implementation of AgentServer
 *
 * Handles HTTP + SSE connections for agent communication.
 * Hides better-sse and SSEReactor implementation details.
 */

import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { createSession } from "better-sse";
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

      logger.info(`POST /api/message - Session: ${sessionId}`);

      // Get or create agent for this session
      let session = this.sessions.get(sessionId);
      if (!session) {
        const agent = await this.config.createAgent(sessionId);
        await agent.initialize();
        session = { agent, pendingMessages: [] };
        this.sessions.set(sessionId, session);
        logger.info(`Created new agent for session: ${sessionId}`);
      }

      // Queue message if SSE not connected yet, otherwise send immediately
      if (!session.reactor) {
        logger.info(`Queueing message for session ${sessionId} (SSE not connected yet)`);
        session.pendingMessages.push(message);
      } else {
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
    req: IncomingMessage,
    res: ServerResponse,
    sessionId: string
  ): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Session not found" }));
        return;
      }

      logger.info(`GET /api/sse/${sessionId} - Opening SSE connection`);

      // Create SSE session with CORS headers
      const sseSession = await createSession(req, res, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });

      // Attach SSEReactor to agent using react()
      const reactor = SSEReactor.create({ session: sseSession as any });
      logger.info(`Registering SSEReactor for session: ${sessionId}`);
      const unsubscribe = session.agent.react(reactor);
      logger.debug(`SSEReactor registered`, {
        sessionId,
        unsubscribeType: typeof unsubscribe,
      });
      session.reactor = reactor;
      session.unsubscribe = unsubscribe;

      // Send any pending messages now that SSE is connected
      if (session.pendingMessages.length > 0) {
        logger.info(`Processing ${session.pendingMessages.length} pending messages`);
        for (const pendingMessage of session.pendingMessages) {
          session.agent.send(pendingMessage).catch((error) => {
            logger.error(`Agent error processing pending message`, { error });
          });
        }
        session.pendingMessages = [];
      }

      // Handle SSE disconnect
      sseSession.on("disconnected", () => {
        logger.info(`SSE disconnected: ${sessionId}`);
        unsubscribe();
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
