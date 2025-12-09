/**
 * Dev entry point - loads env and starts server directly
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root for dev mode
const projectRoot = resolve(__dirname, "../..");

// Load .env files for dev
config({ path: resolve(projectRoot, ".env.local") });
config({ path: resolve(projectRoot, ".env") });

// Set data directory to project root/.agentx for dev
process.env.AGENTX_DIR = resolve(projectRoot, ".agentx");

import { startServer } from "./index.js";

startServer();
