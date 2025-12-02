#!/usr/bin/env node
/**
 * Portagent CLI
 *
 * Command-line interface for running the Portagent server.
 *
 * Usage:
 *   portagent                    # Start with defaults
 *   portagent --port 3000        # Custom port
 *   portagent --password mypass  # Set password
 */

import { Command } from "commander";
import { config } from "dotenv";

// Load .env files (later files override earlier ones)
config({ path: ".env" });
config({ path: ".env.local" });

const program = new Command();

program.name("portagent").description("Portagent - AgentX Portal Application").version("0.1.0");

program
  .option("-p, --port <port>", "Port to listen on", "5200")
  .option("--password <password>", "Set login password (or use PORTAGENT_PASSWORD env var)")
  .option("--api-key <key>", "LLM provider API key (or use LLM_PROVIDER_KEY env var)")
  .option("--api-url <url>", "LLM provider base URL (or use LLM_PROVIDER_URL env var)")
  .option("--model <model>", "LLM model name (or use LLM_PROVIDER_MODEL env var)")
  .action(async (options) => {
    // Set environment variables from CLI options
    if (options.port) {
      process.env.PORT = options.port;
    }
    if (options.password) {
      process.env.PORTAGENT_PASSWORD = options.password;
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
