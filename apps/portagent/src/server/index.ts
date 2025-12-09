/**
 * Portagent Server
 *
 * Hono-based server that combines:
 * - AgentX API (via WebSocket on /ws)
 * - Authentication (JWT)
 * - Static file serving (Vite build output)
 *
 * Single port architecture:
 * - HTTP requests handled by Hono
 * - WebSocket upgrade on /ws path handled by AgentX
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync, readFileSync } from "fs";

import { createAgentX } from "agentxjs";
import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

import { createAuthMiddleware, authRoutes } from "./auth";
import { SQLiteUserRepository } from "./database";
import { PinoLoggerFactory } from "./logger";

/**
 * Get data directory paths
 * Uses AGENTX_DIR env var, or defaults to ~/.agentx
 *
 * Directory structure:
 *   agentx-dir/
 *   ├── data/           # Database files
 *   │   ├── agentx.db
 *   │   └── portagent.db
 *   └── logs/           # Log files
 *       └── portagent.log
 */
function getDataPaths() {
  const dataDir = process.env.AGENTX_DIR || join(homedir(), ".agentx");
  const dataDirPath = join(dataDir, "data");
  const logsDirPath = join(dataDir, "logs");

  // Ensure directories exist
  mkdirSync(dataDirPath, { recursive: true });
  mkdirSync(logsDirPath, { recursive: true });

  return {
    dataDir,
    dataDirPath,
    logsDirPath,
    userDbPath: join(dataDirPath, "portagent.db"),
    agentxDbPath: join(dataDirPath, "agentx.db"),
    logFilePath: join(logsDirPath, "portagent.log"),
  };
}

// Configuration from environment
const PORT = parseInt(process.env.PORT || "5200", 10);
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomUUID();
const INVITE_CODE_REQUIRED = process.env.INVITE_CODE_REQUIRED === "true"; // default: false

/**
 * Create and configure the Hono app
 */
async function createApp() {
  const paths = getDataPaths();
  const app = new Hono();

  // CORS
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Check API key
  const apiKey = process.env.LLM_PROVIDER_KEY;
  if (!apiKey) {
    console.error("Error: LLM_PROVIDER_KEY is required");
    console.log("\nSet it via environment variable:");
    console.log("  export LLM_PROVIDER_KEY=sk-ant-xxx");
    process.exit(1);
  }

  // Create HTTP server using @hono/node-server's serve function internally
  // We need to create the server ourselves to pass it to AgentX
  const { getRequestListener } = await import("@hono/node-server");
  const listener = getRequestListener(app.fetch);
  const server = createServer(listener);

  // Create logger factory
  const logLevel = (process.env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error";
  const loggerFactory = new PinoLoggerFactory({
    level: logLevel,
    logDir: paths.logsDirPath,
    pretty: process.env.NODE_ENV !== "production",
  });

  // Create AgentX instance attached to HTTP server
  // WebSocket upgrade will be handled on /ws path
  // Storage is auto-configured: SQLite at {agentxDir}/data/agentx.db
  const agentx = await createAgentX({
    llm: {
      apiKey,
      baseUrl: process.env.LLM_PROVIDER_URL,
      model: process.env.LLM_PROVIDER_MODEL,
    },
    logger: {
      level: logLevel,
      factory: loggerFactory,
    },
    agentxDir: paths.dataDir, // Auto-configures storage at {dataDir}/data/agentx.db
    server, // Attach to existing HTTP server
  });

  // Initialize user repository (separate database)
  const userRepository = new SQLiteUserRepository(paths.userDbPath);

  // Auth middleware
  const authMiddleware = createAuthMiddleware(JWT_SECRET);

  // ============================================================
  // Routes
  // ============================================================

  // Health check (no auth)
  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

  // Auth routes (register, login)
  app.route(
    "/api/auth",
    authRoutes(userRepository, JWT_SECRET, agentx, { inviteCodeRequired: INVITE_CODE_REQUIRED })
  );

  // AgentX info endpoint (protected)
  app.use("/agentx/*", authMiddleware);
  app.get("/agentx/info", (c) => {
    return c.json({
      version: "0.1.0",
      wsPath: "/ws",
    });
  });

  // Static files
  const publicDir = resolve(__dirname, "../public");
  const isDev = process.env.NODE_ENV !== "production";

  if (existsSync(publicDir)) {
    // Serve static files
    app.use("/*", serveStatic({ root: publicDir }));

    // SPA fallback - serve index.html for all unmatched routes
    app.get("*", (c) => {
      const indexPath = resolve(publicDir, "index.html");
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, "utf-8");
        return c.html(html);
      }
      return c.text("Not Found", 404);
    });
  } else if (isDev) {
    app.get("*", (c) => {
      return c.text(
        "Static files not found. Run 'pnpm build:client' first, or use 'pnpm dev' for development.",
        404
      );
    });
  }

  return { app, server, agentx, userRepository, paths };
}

/**
 * Start the server
 */
async function startServer() {
  const { server, agentx, userRepository, paths } = await createApp();

  console.log(`
  ____            _                         _
 |  _ \\ ___  _ __| |_ __ _  __ _  ___ _ __ | |_
 | |_) / _ \\| '__| __/ _\` |/ _\` |/ _ \\ '_ \\| __|
 |  __/ (_) | |  | || (_| | (_| |  __/ | | | |_
 |_|   \\___/|_|   \\__\\__,_|\\__, |\\___|_| |_|\\__|
                           |___/

  AgentX Portal - Your AI Agent Gateway (Multi-User Mode)
`);

  console.log("Configuration:");
  console.log(`  Port: ${PORT}`);
  console.log(`  Data Dir: ${paths.dataDir}`);
  console.log(`  API Key: ${process.env.LLM_PROVIDER_KEY!.substring(0, 15)}...`);
  console.log(`  User DB: ${paths.userDbPath}`);
  console.log(`  AgentX DB: ${paths.agentxDbPath}`);
  console.log(`  Logs: ${paths.logsDirPath}`);
  console.log(`  Invite Code: ${INVITE_CODE_REQUIRED ? "required" : "disabled"}`);

  console.log(`\nEndpoints:`);
  console.log(`  GET  /health                    - Health check`);
  console.log(`  POST /api/auth/register         - Register new user`);
  console.log(`  POST /api/auth/login            - Login`);
  console.log(`  GET  /api/auth/verify           - Verify token`);
  console.log(`  GET  /agentx/info               - Platform info`);
  console.log(`  WS   /ws                        - WebSocket connection`);

  // Start HTTP server (WebSocket is already attached)
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    await agentx.dispose();
    userRepository.close();
    server.close();
    console.log("Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export { createApp, startServer };
