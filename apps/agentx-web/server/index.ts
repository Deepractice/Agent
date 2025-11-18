/**
 * AgentX Web Server
 *
 * Simple HTTP + WebSocket server:
 * - WebSocket server for AI agent communication (using agentx-framework)
 * - Static file serving (production only)
 */

import { createWebSocketServer, ClaudeAgent } from "@deepractice-ai/agentx-framework";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";
import { readFile, stat } from "fs/promises";
import type { IncomingMessage, ServerResponse } from "http";
import { mcpServers } from "./mcp.js";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT || "5200", 10);
const HOST = process.env.HOST || "0.0.0.0";

// MIME types for common file extensions
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/**
 * Static file server for production builds
 */
async function serveStaticFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Get the requested path
    let filePath = req.url || "/";

    // Remove query string
    const queryIndex = filePath.indexOf("?");
    if (queryIndex !== -1) {
      filePath = filePath.substring(0, queryIndex);
    }

    // Security: prevent directory traversal
    if (filePath.includes("..")) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    // Default to index.html for root or directory paths
    if (filePath === "/" || filePath.endsWith("/")) {
      filePath = "/index.html";
    }

    // Build full path to file in dist/
    const fullPath = join(__dirname, "..", filePath);

    // Check if file exists
    try {
      const stats = await stat(fullPath);
      if (!stats.isFile()) {
        throw new Error("Not a file");
      }
    } catch {
      // File not found, serve index.html for SPA routing
      const indexPath = join(__dirname, "../index.html");
      const indexContent = await readFile(indexPath);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(indexContent);
      return;
    }

    // Read and serve the file
    const content = await readFile(fullPath);
    const ext = extname(filePath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
  } catch (error) {
    console.error("[Static Server] Error serving file:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

async function startServer() {
  // Platform configuration (AGENTX_*)
  const apiKey = process.env.AGENTX_API_KEY;
  const baseUrl = process.env.AGENTX_BASE_URL;
  const model = process.env.AGENTX_MODEL || "claude-sonnet-4-5-20250929";

  // Agent runtime configuration (AGENT_*)
  const workDir = process.env.AGENT_WORK_DIR;
  const systemPrompt = process.env.AGENT_SYSTEM_PROMPT || "You are a helpful AI assistant.";
  const maxTurns = process.env.AGENT_MAX_TURNS ? parseInt(process.env.AGENT_MAX_TURNS, 10) : undefined;
  const permissionMode = (process.env.AGENT_PERMISSION_MODE as "default" | "acceptEdits" | "bypassPermissions" | "plan") || "bypassPermissions";

  // Validate required environment variables
  if (!apiKey) {
    console.error("❌ AGENTX_API_KEY environment variable is required");
    console.log("\nPlease create .env.local file with:");
    console.log("  AGENTX_API_KEY=your-api-key");
    console.log("  AGENTX_BASE_URL=https://api.anthropic.com");
    console.log("  AGENT_WORK_DIR=/path/to/your/workspace");
    process.exit(1);
  }

  if (!baseUrl) {
    console.error("❌ AGENTX_BASE_URL environment variable is required");
    console.log("\nPlease create .env.local file with:");
    console.log("  AGENTX_API_KEY=your-api-key");
    console.log("  AGENTX_BASE_URL=https://api.anthropic.com");
    console.log("  AGENT_WORK_DIR=/path/to/your/workspace");
    process.exit(1);
  }

  if (!workDir) {
    console.error("❌ AGENT_WORK_DIR environment variable is required");
    console.log("\nPlease create .env.local file with:");
    console.log("  AGENTX_API_KEY=your-api-key");
    console.log("  AGENTX_BASE_URL=https://api.anthropic.com");
    console.log("  AGENT_WORK_DIR=/path/to/your/workspace");
    process.exit(1);
  }

  console.log("🚀 Starting AgentX Web Server...\n");
  console.log("📝 Configuration:");
  console.log(`   Mode: ${isDev ? "development" : "production"}`);
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Model: ${model}`);
  console.log(`   Working Directory: ${workDir}`);
  console.log(`   Permission Mode: ${permissionMode}`);
  if (systemPrompt !== "You are a helpful AI assistant.") {
    console.log(`   System Prompt: ${systemPrompt.substring(0, 50)}${systemPrompt.length > 50 ? "..." : ""}`);
  }
  if (maxTurns !== undefined) {
    console.log(`   Max Turns: ${maxTurns}`);
  }
  console.log();

  // Create WebSocket Server using agentx-framework
  const wsServer = createWebSocketServer({
    // Agent definition
    agentDefinition: ClaudeAgent,

    // Agent config factory
    createAgentConfig: () => ({
      apiKey,
      baseUrl,
      model,
      cwd: workDir,
      systemPrompt,
      maxTurns,
      permissionMode,
      mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
    }),

    // Server configuration
    port: PORT,
    host: HOST,
    path: "/ws",

    // Static file serving (production only)
    onRequest: isDev ? undefined : serveStaticFile,
  });

  console.log(`✅ WebSocket Server: ws://${HOST}:${PORT}/ws`);
  console.log();
  console.log("💡 Ready!");
  if (isDev) {
    console.log("   Frontend: http://localhost:5173 (Vite dev server)");
    console.log("   Backend:  ws://localhost:5200/ws (WebSocket only)");
  } else {
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
  }
  console.log();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\n\n🛑 Shutting down...");
    await wsServer.close();
    console.log("✅ Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
