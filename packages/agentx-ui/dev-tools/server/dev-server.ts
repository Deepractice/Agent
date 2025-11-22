/**
 * Development WebSocket Server for agentx-ui
 *
 * This server runs alongside Storybook for local UI development.
 * Uses the new AgentX Framework with automatic session management.
 */

import {
  configure,
  LogLevel,
  type LoggerProvider,
  type LogContext,
} from "@deepractice-ai/agentx-framework";
import { createAgentServer } from "@deepractice-ai/agentx-framework/server";
import { ClaudeAgent } from "@deepractice-ai/agentx-sdk-claude";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync, writeFileSync } from "fs";
import http from "http";
import { WebSocketServer } from "ws";

// Global references for cleanup on hot reload
let globalLogCollector: http.Server | null = null;
let globalAgentServer: Awaited<ReturnType<typeof createAgentServer>> | null = null;

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.test file in same directory
const envPath = resolve(__dirname, ".env.test");
config({ path: envPath });

/**
 * FileLogger - Outputs to both console and file
 */
class FileLogger implements LoggerProvider {
  readonly name: string;
  readonly level: LogLevel;
  private readonly logFilePath: string;

  private static initialized = false;

  constructor(name: string, logFilePath: string, level: LogLevel = LogLevel.DEBUG) {
    this.name = name;
    this.level = level;
    this.logFilePath = logFilePath;

    // Clear log file only once when first logger is created
    if (!FileLogger.initialized) {
      writeFileSync(
        logFilePath,
        `=== Backend Log Started at ${new Date().toISOString()} ===\n`,
        "utf8"
      );
      FileLogger.initialized = true;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDebugEnabled()) {
      this.log("DEBUG", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isInfoEnabled()) {
      this.log("INFO", message, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isWarnEnabled()) {
      this.log("WARN", message, context);
    }
  }

  error(message: string | Error, context?: LogContext): void {
    if (this.isErrorEnabled()) {
      if (message instanceof Error) {
        this.log("ERROR", message.message, { ...context, stack: message.stack });
      } else {
        this.log("ERROR", message, context);
      }
    }
  }

  isDebugEnabled(): boolean {
    return this.level <= LogLevel.DEBUG;
  }

  isInfoEnabled(): boolean {
    return this.level <= LogLevel.INFO;
  }

  isWarnEnabled(): boolean {
    return this.level <= LogLevel.WARN;
  }

  isErrorEnabled(): boolean {
    return this.level <= LogLevel.ERROR;
  }

  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} ${level.padEnd(5)} [${this.name}] ${message}`;

    // Console output with colors
    const colors = {
      DEBUG: "\x1b[36m",
      INFO: "\x1b[32m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
      RESET: "\x1b[0m",
    };
    const color = colors[level as keyof typeof colors] || "";
    const consoleMethod =
      level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;

    if (context && Object.keys(context).length > 0) {
      consoleMethod(`${color}${logLine}${colors.RESET}`, context);
    } else {
      consoleMethod(`${color}${logLine}${colors.RESET}`);
    }

    // File output (without colors)
    const fileLogLine =
      context && Object.keys(context).length > 0
        ? `${logLine} ${JSON.stringify(context)}\n`
        : `${logLine}\n`;

    try {
      appendFileSync(this.logFilePath, fileLogLine, "utf8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }
}

// Configure AgentX framework globally (before creating any agents)
const backendLogPath = resolve(__dirname, "logs/backend.log");
const frontendLogPath = resolve(__dirname, "logs/frontend.log");

configure({
  logger: {
    defaultLevel: LogLevel.DEBUG,
    defaultImplementation: (name) => new FileLogger(name, backendLogPath, LogLevel.DEBUG),
  },
});

/**
 * Kill process using a specific port
 */
async function killProcessOnPort(port: number): Promise<void> {
  const { execSync } = await import("child_process");
  try {
    // Find PID using the port (Linux/macOS)
    const result = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
    if (result) {
      const pids = result.split("\n");
      for (const pid of pids) {
        console.log(`[HotReload] Killing process ${pid} on port ${port}`);
        try {
          execSync(`kill -9 ${pid}`);
        } catch {
          // Process might already be dead
        }
      }
      // Wait a bit for the port to be released
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch {
    // No process found on port, which is fine
  }
}

/**
 * Ensure port is available, killing any process using it
 */
async function ensurePortAvailable(port: number): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const testServer = http.createServer();
      testServer.once("error", (err: NodeJS.ErrnoException) => {
        reject(err);
      });
      testServer.once("listening", () => {
        testServer.close(() => resolve());
      });
      testServer.listen(port, "0.0.0.0");
    });
  } catch {
    // Port in use, kill the process
    console.log(`[HotReload] Port ${port} in use, killing process...`);
    await killProcessOnPort(port);
  }
}

/**
 * Create WebSocket server for collecting frontend logs
 */
async function createLogCollectorServer(port: number, logFilePath: string): Promise<http.Server> {
  // Ensure port is available (kill any process using it)
  await ensurePortAvailable(port);

  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });

  // Initialize frontend log file
  writeFileSync(
    logFilePath,
    `=== Frontend Log Started at ${new Date().toISOString()} ===\n`,
    "utf8"
  );

  wss.on("connection", (ws) => {
    console.log("[LogCollector] Frontend logger connected");

    ws.on("message", (data) => {
      try {
        const logEntry = JSON.parse(data.toString());
        const { timestamp, level, name, message, context } = logEntry;

        // Format log line
        const logLine = context
          ? `${timestamp} ${level.padEnd(5)} [${name}] ${message} ${JSON.stringify(context)}\n`
          : `${timestamp} ${level.padEnd(5)} [${name}] ${message}\n`;

        // Write to file
        appendFileSync(logFilePath, logLine, "utf8");
      } catch (error) {
        console.error("[LogCollector] Failed to process frontend log:", error);
      }
    });

    ws.on("close", () => {
      console.log("[LogCollector] Frontend logger disconnected");
    });

    ws.on("error", (error) => {
      console.error("[LogCollector] WebSocket error:", error);
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`[LogCollector] Frontend log collector listening on ws://0.0.0.0:${port}`);
  });

  return httpServer;
}

/**
 * Close server and wait for it to fully close
 */
function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
    // Force close after 2 seconds if not closed gracefully
    setTimeout(resolve, 2000);
  });
}

/**
 * Cleanup previous server instances (for hot reload support)
 */
async function cleanup() {
  if (globalLogCollector) {
    console.log("[HotReload] Closing previous log collector...");
    await closeServer(globalLogCollector);
    globalLogCollector = null;
    // Give OS time to release the port
    await new Promise((r) => setTimeout(r, 500));
  }
  if (globalAgentServer) {
    console.log("[HotReload] Stopping previous agent server...");
    await globalAgentServer.stop();
    globalAgentServer = null;
    // Give OS time to release the port
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function startDevServer() {
  // Cleanup any previous instances first (hot reload support)
  await cleanup();

  // Support both AGENT_API_KEY and ANTHROPIC_API_KEY
  const apiKey = process.env.AGENT_API_KEY || process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.AGENT_BASE_URL;

  if (!apiKey) {
    console.error("❌ Error: API key is not set");
    console.log("\nPlease set your API key in one of these ways:");
    console.log("  1. Create .env.test file in agentx-node package");
    console.log("  2. export AGENT_API_KEY='your-api-key'");
    console.log("  3. export ANTHROPIC_API_KEY='your-api-key'");
    process.exit(1);
  }

  console.log("🚀 Starting AgentX Development Server...\n");
  console.log("📝 Configuration:");
  console.log(`   API Key: ${apiKey.substring(0, 10)}...`);
  if (baseUrl) {
    console.log(`   Base URL: ${baseUrl}`);
  }
  console.log(`   Backend Log: ${backendLogPath}`);
  console.log(`   Frontend Log: ${frontendLogPath}`);
  console.log();

  // Start log collector server (port 5201)
  globalLogCollector = await createLogCollectorServer(5201, frontendLogPath);

  // Ensure SSE server port is available
  await ensurePortAvailable(5200);

  // Create SSE Server with automatic session management
  globalAgentServer = createAgentServer(ClaudeAgent, {
    port: 5200,
    host: "0.0.0.0",
    config: {
      apiKey,
      baseUrl,
      model: "claude-sonnet-4-20250514",
      systemPrompt: "You are a helpful AI assistant for UI development testing.",
    },
  });

  await globalAgentServer.start();

  console.log("✅ SSE Server Started");
  console.log(`   URL: http://0.0.0.0:5200\n`);
  console.log("💡 Ready for UI development!");
  console.log("   Run 'pnpm storybook' in another terminal\n");
  console.log("📦 Framework: AgentX Framework v2");
  console.log("   • Automatic session management (one Agent per connection)");
  console.log("   • Real-time event streaming");
  console.log("   • Full Claude SDK features\n");

  // Graceful shutdown handlers
  const shutdown = async () => {
    console.log("\n\n🛑 Shutting down...");
    await cleanup();
    console.log("✅ Server stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startDevServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
