/**
 * WebSocket Server for AgentX Framework
 *
 * Creates a WebSocket server that manages multiple Agent sessions.
 * Each WebSocket connection gets its own Agent instance with WebSocketReactor.
 *
 * TODO: This is a temporary implementation. Will be replaced by proper Session abstraction.
 * See: /issues/001-session-abstraction-design.md
 */

import http from "http";
import { WebSocketServer as WsServer, WebSocket } from "ws";
import type { AgentService } from "@deepractice-ai/agentx-core";
import { WebSocketReactor } from "../reactors/WebSocketReactor";
import { defineAgent } from "../defineAgent";
import type { DefinedAgent } from "../defineAgent";

/**
 * WebSocket Server configuration
 */
export interface WebSocketServerConfig {
  /**
   * Base Agent definition to create for each connection
   */
  agentDefinition: DefinedAgent<any>;

  /**
   * Agent config factory - creates config for each new connection
   */
  createAgentConfig: () => any;

  /**
   * Port to listen on
   */
  port: number;

  /**
   * Host to bind to
   * @default "0.0.0.0"
   */
  host?: string;

  /**
   * WebSocket path
   * @default "/ws"
   */
  path?: string;
}

/**
 * Client message from browser
 */
interface ClientMessage {
  type: "user" | "clear" | "destroy";
  message?: {
    content: string | any[];
  };
}

/**
 * Session manager for one WebSocket connection
 */
class AgentSession {
  private agent: AgentService;
  private ws: WebSocket;
  private sessionId: string;

  constructor(agentDefinition: DefinedAgent<any>, config: any, ws: WebSocket) {
    this.ws = ws;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create Agent with WebSocketReactor
    const agentWithReactor = defineAgent({
      name: `${agentDefinition.name}_Session`,
      driver: agentDefinition,
      reactors: [WebSocketReactor],
    });

    this.agent = agentWithReactor.create({
      ...config,
      ws: ws,
    });

    console.log(`[AgentSession] Created session: ${this.sessionId}`);
  }

  async initialize(): Promise<void> {
    await this.agent.initialize();
    console.log(`[AgentSession] Initialized session: ${this.sessionId}`);
  }

  async handleMessage(data: string): Promise<void> {
    console.log("[AgentSession.handleMessage] ========== RECEIVED WS MESSAGE ==========");
    console.log("[AgentSession.handleMessage] Raw data:", data);
    // console.trace("[AgentSession.handleMessage] WebSocket message received");

    try {
      const message: ClientMessage = JSON.parse(data);
      console.log("[AgentSession.handleMessage] Parsed message type:", message.type);
      console.log("[AgentSession.handleMessage] Message content:", message.message?.content);

      switch (message.type) {
        case "user":
          if (!message.message) {
            throw new Error("Missing message content");
          }

          const content = message.message.content;
          let textContent: string;

          if (typeof content === "string") {
            textContent = content;
          } else if (Array.isArray(content)) {
            const firstPart = content[0];
            textContent = firstPart && "text" in firstPart ? firstPart.text : "";
          } else {
            throw new Error("Invalid message content format");
          }

          await this.agent.send(textContent);
          break;

        case "clear":
          this.agent.clear();
          break;

        case "destroy":
          await this.agent.destroy();
          break;

        default:
          throw new Error(`Unknown message type: ${(message as any).type}`);
      }
    } catch (error) {
      console.error("[AgentSession] Error handling message:", error);

      // Send error to client
      const errorEvent = {
        type: "error",
        subtype: "system",
        severity: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        code: "SESSION_MESSAGE_ERROR",
        recoverable: true,
        uuid: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        sessionId: this.sessionId,
        timestamp: Date.now(),
      };

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(errorEvent));
      }
    }
  }

  async destroy(): Promise<void> {
    console.log(`[AgentSession] Destroying session: ${this.sessionId}`);
    await this.agent.destroy();
  }
}

/**
 * WebSocket Server for AgentX
 */
export class WebSocketServer {
  private httpServer: http.Server;
  private wss: WsServer;
  private sessions: Map<WebSocket, AgentSession> = new Map();
  private config: WebSocketServerConfig;
  private url: string;

  constructor(config: WebSocketServerConfig) {
    this.config = config;

    const { port, host = "0.0.0.0", path = "/ws" } = config;

    // Create HTTP server
    this.httpServer = http.createServer();

    // Create WebSocket server
    this.wss = new WsServer({
      server: this.httpServer,
      path,
      perMessageDeflate: false,
    });

    this.url = `ws://${host}:${port}${path}`;

    // Handle connections
    this.wss.on("connection", (ws) => this.handleConnection(ws));

    // Start HTTP server
    this.httpServer.listen(port, host, () => {
      console.log(`[WebSocketServer] Listening on ${this.url}`);
    });
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    console.log(`[WebSocketServer] New connection (total: ${this.sessions.size + 1})`);

    try {
      // Create agent config for this session
      const agentConfig = this.config.createAgentConfig();

      // Create session
      const session = new AgentSession(this.config.agentDefinition, agentConfig, ws);
      this.sessions.set(ws, session);

      // Initialize session
      await session.initialize();

      // Handle messages
      ws.on("message", (data) => {
        const session = this.sessions.get(ws);
        if (session) {
          session.handleMessage(data.toString());
        }
      });

      // Handle disconnect
      ws.on("close", async () => {
        console.log(`[WebSocketServer] Connection closed (total: ${this.sessions.size - 1})`);

        const session = this.sessions.get(ws);
        if (session) {
          await session.destroy();
          this.sessions.delete(ws);
        }
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("[WebSocketServer] WebSocket error:", error);
      });
    } catch (error) {
      console.error("[WebSocketServer] Error handling connection:", error);
      ws.close();
    }
  }

  getUrl(): string {
    return this.url;
  }

  getInfo() {
    return {
      url: this.url,
      path: this.config.path || "/ws",
      port: this.config.port,
      activeSessions: this.sessions.size,
    };
  }

  async close(): Promise<void> {
    console.log("[WebSocketServer] Closing server...");

    // Destroy all sessions
    const destroyPromises = Array.from(this.sessions.values()).map((session) =>
      session.destroy()
    );
    await Promise.all(destroyPromises);
    this.sessions.clear();

    // Close WebSocket server
    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log("[WebSocketServer] Server closed");
  }
}

/**
 * Create WebSocket Server
 *
 * @example
 * ```typescript
 * import { createWebSocketServer } from "@deepractice-ai/agentx-framework/server";
 * import { ClaudeAgent } from "@deepractice-ai/agentx-framework/agents";
 *
 * const server = createWebSocketServer({
 *   agentDefinition: ClaudeAgent,
 *   createAgentConfig: () => ({
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     model: "claude-sonnet-4-20250514",
 *   }),
 *   port: 5200,
 * });
 *
 * // Graceful shutdown
 * process.on("SIGINT", async () => {
 *   await server.close();
 *   process.exit(0);
 * });
 * ```
 */
export function createWebSocketServer(config: WebSocketServerConfig): WebSocketServer {
  return new WebSocketServer(config);
}
