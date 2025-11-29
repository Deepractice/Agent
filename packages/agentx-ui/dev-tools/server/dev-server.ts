/**
 * Development Server for agentx-ui
 *
 * Runs alongside Storybook for local UI development.
 * Uses the new AgentX API.
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import http from "http";

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.test file
const envPath = resolve(__dirname, ".env.test");
config({ path: envPath });

// Logs directory (relative to where the server is run)
const logsDir = resolve(process.cwd(), "logs");
const logFilePath = resolve(logsDir, "dev-server.log");

/**
 * FileLogger - Writes logs to file and console
 */
function createFileLogger(name: string, logFile: string) {
  const formatLog = (level: string, message: string, context?: unknown) => {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `${timestamp} ${level.padEnd(5)} [${name}] ${message}${contextStr}`;
  };

  const write = (level: string, message: string, context?: unknown) => {
    const line = formatLog(level, message, context);

    // Console output with colors
    const colors: Record<string, string> = {
      DEBUG: "\x1b[36m",
      INFO: "\x1b[32m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
    };
    const reset = "\x1b[0m";
    console.log(`${colors[level] || ""}${line}${reset}`);

    // File output
    try {
      appendFileSync(logFile, line + "\n", "utf8");
    } catch {
      // Ignore file write errors
    }
  };

  return {
    name,
    level: 0, // DEBUG
    debug: (msg: string, ctx?: unknown) => write("DEBUG", msg, ctx),
    info: (msg: string, ctx?: unknown) => write("INFO", msg, ctx),
    warn: (msg: string, ctx?: unknown) => write("WARN", msg, ctx),
    error: (msg: string | Error, ctx?: unknown) => {
      if (msg instanceof Error) {
        write("ERROR", msg.message, { ...((ctx as object) || {}), stack: msg.stack });
      } else {
        write("ERROR", msg, ctx);
      }
    },
    isDebugEnabled: () => true,
    isInfoEnabled: () => true,
    isWarnEnabled: () => true,
    isErrorEnabled: () => true,
  };
}

async function startDevServer() {
  // Support both AGENT_API_KEY and ANTHROPIC_API_KEY
  const apiKey = process.env.AGENT_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.AGENT_BASE_URL;

  if (!apiKey) {
    console.error("Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create .env.test file in dev-tools/server/");
    console.log("  2. export AGENT_API_KEY='your-api-key'");
    console.log("  3. export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  // Ensure logs directory exists
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }

  // Initialize log file
  writeFileSync(logFilePath, `=== Dev Server Started at ${new Date().toISOString()} ===\n`, "utf8");

  console.log("Starting AgentX Development Server...\n");
  console.log("Configuration:");
  console.log(`  API Key: ${apiKey.substring(0, 10)}...`);
  if (baseUrl) {
    console.log(`  Base URL: ${baseUrl}`);
  }
  console.log(`  Log File: ${logFilePath}`);
  console.log();

  // Import AgentX modules
  const { createAgentX } = await import("@deepractice-ai/agentx");
  const { createAgentXHandler } = await import("@deepractice-ai/agentx/server");
  const { LoggerFactoryKey } = await import("@deepractice-ai/agentx-types");

  // Import agent definition
  const { ClaudeAgent, defaultAgentConfig } = await import("./agent.js");

  // Create AgentX instance
  const agentx = createAgentX();

  // Provide custom LoggerFactory
  agentx.provide(LoggerFactoryKey, {
    getLogger: (name: string) => createFileLogger(name, logFilePath),
  });

  // Create handler with dynamic agent creation enabled
  const handler = createAgentXHandler(agentx, {
    basePath: "/agentx",
    allowDynamicCreation: true,
    allowedDefinitions: ["ClaudeAgent"],
  });

  // Register definition for dynamic creation
  (handler as any).registerDefinition("ClaudeAgent", ClaudeAgent, {
    apiKey,
    baseUrl,
    ...defaultAgentConfig,
  });

  // Create HTTP server
  const PORT = 5200;
  const server = http.createServer(async (req, res) => {
    // Handle CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Convert Node.js request to Web Request
      const url = `http://localhost:${PORT}${req.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          headers.set(key, Array.isArray(value) ? value[0] : value);
        }
      }

      let body: string | undefined;
      if (req.method === "POST") {
        body = await new Promise<string>((resolve) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => resolve(data));
        });
      }

      const webRequest = new Request(url, {
        method: req.method,
        headers,
        body: body || undefined,
      });

      // Call handler
      const webResponse = await handler(webRequest);

      // Check if SSE response
      const contentType = webResponse.headers.get("Content-Type");
      if (contentType === "text/event-stream") {
        // SSE response - pipe the stream
        res.writeHead(webResponse.status, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        const reader = webResponse.body?.getReader();
        if (reader) {
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          };
          pump().catch(() => res.end());
        }
      } else {
        // Regular response
        res.writeHead(webResponse.status, {
          "Content-Type": contentType || "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        const text = await webResponse.text();
        res.end(text);
      }
    } catch (error) {
      console.error("Request error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Internal server error" } }));
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /agentx/info          - Platform info`);
    console.log(`  GET  /agentx/health        - Health check`);
    console.log(`  GET  /agentx/agents        - List agents`);
    console.log(`  POST /agentx/agents        - Create agent`);
    console.log(`  GET  /agentx/agents/:id    - Get agent`);
    console.log(`  DEL  /agentx/agents/:id    - Delete agent`);
    console.log(`  GET  /agentx/agents/:id/sse      - SSE stream`);
    console.log(`  POST /agentx/agents/:id/messages - Send message`);
    console.log(`\nReady for Storybook development!`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    server.close();
    await agentx.agents.destroyAll();
    console.log("Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDevServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
