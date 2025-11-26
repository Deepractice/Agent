/**
 * Run command - Start an AgentX agent server
 */

import { Command } from "commander";
import { config as loadEnv } from "dotenv";
import { resolve, join, extname, dirname } from "path";
import { fileURLToPath } from "url";
import { createWebSocketServer, ClaudeAgent } from "@deepractice-ai/agentx";
import { readFile, stat, open } from "fs/promises";
import type { IncomingMessage, ServerResponse } from "http";
import { execaNode } from "execa";
import {
  saveAgentConfig,
  saveAgentPid,
  removeAgentPid,
  getAgentLogPath,
  loadAgentConfig,
  getAgentStatus,
  type AgentConfig,
} from "../utils/paths";

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface RunOptions {
  name?: string;
  workDir: string;
  port: string;
  host: string;
  detach?: boolean;
  envFile?: string;
  model?: string;
  _daemon?: boolean; // Internal flag for daemon mode
}

// MIME types for static file serving
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
async function createStaticHandler(distPath: string) {
  return async function serveStaticFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
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

      // Build full path to file
      const fullPath = join(distPath, filePath);

      // Check if file exists
      try {
        const stats = await stat(fullPath);
        if (!stats.isFile()) {
          throw new Error("Not a file");
        }
      } catch {
        // File not found, serve index.html for SPA routing
        const indexPath = join(distPath, "/index.html");
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
  };
}

/**
 * Start agent in detached mode
 */
async function startDetached(options: RunOptions, agentName: string): Promise<void> {
  const port = parseInt(options.port, 10);
  const workDir = resolve(options.workDir);
  const model = options.model || process.env.AGENTX_MODEL || "claude-sonnet-4-5-20250929";

  // Save agent config
  const config: AgentConfig = {
    name: agentName,
    port,
    host: options.host,
    workDir,
    model,
    envFile: options.envFile ? resolve(options.envFile) : undefined,
    createdAt: Date.now(),
  };
  await saveAgentConfig(config);

  // Build arguments for daemon process
  const args = [
    "run",
    "-w",
    workDir,
    "--name",
    agentName,
    "-p",
    options.port,
    "-h",
    options.host,
    "--_daemon",
  ];
  if (options.envFile) {
    args.push("--env-file", resolve(options.envFile));
  }
  if (options.model) {
    args.push("--model", options.model);
  }

  // Get log file path
  const logPath = getAgentLogPath(agentName);

  // Open log file for writing
  const logFile = await open(logPath, "a");

  // Spawn detached process
  // __dirname in bundled code points to dist/, so index.js is in same directory
  const cliPath = resolve(__dirname, "index.js");
  const subprocess = execaNode(cliPath, args, {
    detached: true,
    stdio: ["ignore", logFile.fd, logFile.fd],
    cleanup: false,
  });

  // Unref to allow parent to exit
  subprocess.unref();

  const pid = subprocess.pid;
  if (pid) {
    await saveAgentPid(agentName, pid);
    config.pid = pid;
    await saveAgentConfig(config);
  }

  console.log(`Agent started in background: ${agentName}`);
  console.log(`  PID: ${pid}`);
  console.log(`  URL: http://${options.host === "0.0.0.0" ? "localhost" : options.host}:${port}`);
  console.log(`  Log: ${logPath}`);
  console.log();
  console.log("Use 'agentx ps' to list running agents");
  console.log("Use 'agentx stop " + agentName + "' to stop this agent");

  // Close log file handle in parent
  await logFile.close();

  // Exit parent process
  process.exit(0);
}

/**
 * Start agent in foreground (daemon mode)
 */
async function startForeground(options: RunOptions, agentName: string): Promise<void> {
  // Load environment variables
  if (options.envFile) {
    loadEnv({ path: resolve(options.envFile) });
  } else {
    // Try default locations
    loadEnv({ path: resolve(".env.local") });
    loadEnv({ path: resolve(".env") });
  }

  // Get configuration from environment and options
  const apiKey = process.env.AGENTX_API_KEY;
  const baseUrl = process.env.AGENTX_BASE_URL;
  const model = options.model || process.env.AGENTX_MODEL || "claude-sonnet-4-5-20250929";
  const workDir = resolve(options.workDir);
  const port = parseInt(options.port, 10);
  const host = options.host;

  // Agent runtime configuration
  const systemPrompt = process.env.AGENT_SYSTEM_PROMPT || "You are a helpful AI assistant.";
  const maxTurns = process.env.AGENT_MAX_TURNS
    ? parseInt(process.env.AGENT_MAX_TURNS, 10)
    : undefined;
  const permissionMode =
    (process.env.AGENT_PERMISSION_MODE as
      | "default"
      | "acceptEdits"
      | "bypassPermissions"
      | "plan") || "bypassPermissions";

  // Validate required configuration
  if (!apiKey) {
    console.error("Error: AGENTX_API_KEY is required");
    console.log("\nSet via environment variable or --env-file option");
    process.exit(1);
  }

  if (!baseUrl) {
    console.error("Error: AGENTX_BASE_URL is required");
    console.log("\nSet via environment variable or --env-file option");
    process.exit(1);
  }

  // Save PID if running as daemon
  if (options._daemon) {
    await saveAgentPid(agentName, process.pid);
  }

  // Print startup info
  console.log(`Starting agent: ${agentName}`);
  console.log();
  console.log("Configuration:");
  console.log(`  Name: ${agentName}`);
  console.log(`  Port: ${port}`);
  console.log(`  Host: ${host}`);
  console.log(`  Work Directory: ${workDir}`);
  console.log(`  Model: ${model}`);
  console.log(`  Permission Mode: ${permissionMode}`);
  console.log();

  // Get static files path (from agentx-web dist)
  const staticPath = resolve(__dirname, "../../agentx-web/dist");

  // Create WebSocket Server
  const wsServer = createWebSocketServer({
    agentDefinition: ClaudeAgent,
    createAgentConfig: () => ({
      apiKey,
      baseUrl,
      model,
      cwd: workDir,
      systemPrompt,
      maxTurns,
      permissionMode,
    }),
    port,
    host,
    path: "/ws",
    onRequest: await createStaticHandler(staticPath),
  });

  console.log(`Agent started: ${agentName}`);
  console.log(`  URL: http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  console.log(`  WebSocket: ws://${host}:${port}/ws`);
  console.log();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nStopping agent...");
    await wsServer.close();
    if (options._daemon) {
      await removeAgentPid(agentName);
    }
    console.log("Agent stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function runAction(options: RunOptions) {
  const agentName = options.name || `agent_${Date.now()}`;

  // Check if agent with same name already exists (only for detached mode)
  if (options.detach && !options._daemon) {
    const existingConfig = await loadAgentConfig(agentName);
    if (existingConfig) {
      const status = await getAgentStatus(agentName);
      if (status === "running") {
        console.error(`Error: Agent '${agentName}' is already running`);
        console.log("\nUse 'agentx stop " + agentName + "' to stop it first");
        console.log("Or use a different name with --name option");
        process.exit(1);
      } else {
        console.error(`Error: Agent '${agentName}' already exists but is stopped`);
        console.log("\nUse 'agentx stop " + agentName + " --rm' to remove it first");
        console.log("Or use a different name with --name option");
        process.exit(1);
      }
    }
  }

  if (options.detach && !options._daemon) {
    // Start in detached mode
    await startDetached(options, agentName);
  } else {
    // Start in foreground
    await startForeground(options, agentName);
  }
}

export const runCommand = new Command("run")
  .description("Start an AgentX agent server")
  .requiredOption("-w, --work-dir <dir>", "Working directory for agent file operations")
  .option("--name <name>", "Agent name")
  .option("-p, --port <port>", "Port to listen on", "5200")
  .option("-h, --host <host>", "Host to bind to", "0.0.0.0")
  .option("-d, --detach", "Run in background (detached mode)")
  .option("--env-file <file>", "Environment file path")
  .option("--model <model>", "Model name")
  .option("--_daemon", { hidden: true }) // Internal flag
  .action(runAction);
