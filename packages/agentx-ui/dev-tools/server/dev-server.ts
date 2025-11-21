/**
 * Development WebSocket Server for agentx-ui
 *
 * This server runs alongside Storybook for local UI development.
 * Uses the new AgentX Framework with automatic session management.
 */

import {
  createWebSocketServer,
  ClaudeAgent,
  configure,
  LogLevel,
  type LoggerProvider,
  type LogContext,
} from "@deepractice-ai/agentx-framework";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { appendFileSync, writeFileSync, existsSync } from "fs";
import http from "http";
import { WebSocketServer } from "ws";

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
      writeFileSync(logFilePath, `=== Backend Log Started at ${new Date().toISOString()} ===\n`, "utf8");
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
    const consoleMethod = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;

    if (context && Object.keys(context).length > 0) {
      consoleMethod(`${color}${logLine}${colors.RESET}`, context);
    } else {
      consoleMethod(`${color}${logLine}${colors.RESET}`);
    }

    // File output (without colors)
    const fileLogLine = context && Object.keys(context).length > 0
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
 * Create WebSocket server for collecting frontend logs
 */
function createLogCollectorServer(port: number, logFilePath: string) {
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });

  // Initialize frontend log file
  writeFileSync(logFilePath, `=== Frontend Log Started at ${new Date().toISOString()} ===\n`, "utf8");

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

async function startDevServer() {
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
  const logCollector = createLogCollectorServer(5201, frontendLogPath);

  // Create WebSocket Server with automatic session management
  const server = createWebSocketServer({
    // Agent definition - ClaudeAgent will be instantiated for each connection
    agentDefinition: ClaudeAgent,

    // Agent config factory - called for each new connection
    createAgentConfig: () => ({
      apiKey,
      baseUrl,
      model: "claude-sonnet-4-20250514",
      systemPrompt: "You are a helpful AI assistant for UI development testing.",
    }),

    // Server configuration
    port: 5200,
    host: "0.0.0.0",
    path: "/ws",
  });

  console.log("✅ WebSocket Server Started");
  console.log(`   URL: ${server.getUrl()}\n`);
  console.log("💡 Ready for UI development!");
  console.log("   Run 'pnpm storybook' in another terminal\n");
  console.log("📦 Framework: AgentX Framework v2");
  console.log("   • Automatic session management (one Agent per connection)");
  console.log("   • Real-time event streaming");
  console.log("   • Full Claude SDK features\n");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down...");
    await server.close();
    logCollector.close();
    console.log("✅ Server stopped");
    process.exit(0);
  });
}

startDevServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
