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

interface SessionData {
  agent: AgentService;
  reactor?: ReturnType<typeof SSEReactor.create>;
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
        console.error("[SSEServer] Request handler error:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });
    });

    return new Promise((resolve) => {
      this.server!.listen(port, host, () => {
        console.log(`✅ SSEServer listening on http://${host}:${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Destroy all agent sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      console.log(`[SSEServer] Destroying session: ${sessionId}`);
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
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing sessionId or message" }));
        return;
      }

      console.log(`[SSEServer] POST /api/message - Session: ${sessionId}`);

      // Get or create agent for this session
      let session = this.sessions.get(sessionId);
      if (!session) {
        const agent = await this.config.createAgent(sessionId);
        await agent.initialize();
        session = { agent };
        this.sessions.set(sessionId, session);
        console.log(`[SSEServer] Created new agent for session: ${sessionId}`);
      }

      // Send message to agent (async, don't wait)
      session.agent.send(message).catch((error) => {
        console.error(`[SSEServer] Agent error in session ${sessionId}:`, error);
      });

      // Return SSE URL
      const sseUrl = `/api/sse/${sessionId}`;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ sseUrl }));
    } catch (error) {
      console.error("[SSEServer] POST /api/message error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
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

      console.log(`[SSEServer] GET /api/sse/${sessionId} - Opening SSE connection`);

      // Create SSE session
      const sseSession = await createSession(req, res);

      // Attach SSEReactor to agent
      const reactor = SSEReactor.create({ session: sseSession as any });
      (session.agent as any).addReactor(reactor);
      session.reactor = reactor;

      // Handle SSE disconnect
      sseSession.on("disconnected", () => {
        console.log(`[SSEServer] SSE disconnected: ${sessionId}`);
        (session.agent as any).removeReactor(reactor);
      });
    } catch (error) {
      console.error(`[SSEServer] GET /api/sse/${sessionId} error:`, error);
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
