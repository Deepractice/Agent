#!/usr/bin/env node
/**
 * Portagent CLI
 *
 * Command-line interface for running the Portagent server.
 *
 * Usage:
 *   portagent                       # Start with defaults
 *   portagent -p 3000               # Custom port
 *   portagent --env-file .env.prod  # Load custom env file
 *   portagent --data-dir /path/to   # Custom data directory
 *
 * Directory structure (default: ~/.agentx):
 *   data-dir/
 *   ├── data/           # Database files
 *   │   ├── agentx.db   # AgentX data (containers, images, sessions)
 *   │   └── portagent.db # User authentication data
 *   └── logs/           # Log files
 *       └── portagent.log
 */

import { Command } from "commander";
import { config } from "dotenv";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const program = new Command();

program
  .name("portagent")
  .description("Portagent - AgentX Portal Application")
  .version("0.0.1")
  .option("-p, --port <port>", "Port to listen on", "5200")
  .option("-d, --data-dir <path>", "Data directory (default: ~/.agentx)")
  .option("-e, --env-file <path>", "Path to environment file")
  .option("--jwt-secret <secret>", "JWT secret for token signing (or use JWT_SECRET env var)")
  .option("--api-key <key>", "LLM provider API key (or use LLM_PROVIDER_KEY env var)")
  .option("--api-url <url>", "LLM provider base URL (or use LLM_PROVIDER_URL env var)")
  .option("--model <model>", "LLM model name (or use LLM_PROVIDER_MODEL env var)")
  .action(async (options) => {
    // Load env file (CLI option takes priority, then defaults)
    if (options.envFile) {
      const envPath = resolve(process.cwd(), options.envFile);
      if (!existsSync(envPath)) {
        console.error(`Error: Environment file not found: ${envPath}`);
        process.exit(1);
      }
      config({ path: envPath });
    } else {
      // Default: load .env and .env.local from current directory
      config({ path: resolve(process.cwd(), ".env") });
      config({ path: resolve(process.cwd(), ".env.local") });
    }

    // Set data directory (CLI > env > default)
    const dataDir = options.dataDir || process.env.AGENTX_DIR || resolve(homedir(), ".agentx");
    process.env.AGENTX_DIR = dataDir;

    // Ensure directories exist
    const dataDirPath = resolve(dataDir, "data");
    const logsDirPath = resolve(dataDir, "logs");
    mkdirSync(dataDirPath, { recursive: true });
    mkdirSync(logsDirPath, { recursive: true });

    // Set environment variables from CLI options (override env file)
    if (options.port) {
      process.env.PORT = options.port;
    }
    if (options.jwtSecret) {
      process.env.JWT_SECRET = options.jwtSecret;
    }
    if (options.apiKey) {
      process.env.LLM_PROVIDER_KEY = options.apiKey;
    }
    if (options.apiUrl) {
      process.env.LLM_PROVIDER_URL = options.apiUrl;
    }
    if (options.model) {
      process.env.LLM_PROVIDER_MODEL = options.model;
    }

    // Import and start server
    const { startServer } = await import("../server/index.js");
    await startServer();
  });

program.parse();
