/**
 * AgentX CLI
 *
 * Container-like CLI for managing AgentX agents.
 *
 * Usage:
 *   agentx run --name my-agent -w /path/to/workspace
 *   agentx ps
 *   agentx stop my-agent
 *   agentx logs my-agent
 */

import { Command } from "commander";
import { runCommand } from "./commands/run";
import { psCommand } from "./commands/ps";
import { stopCommand } from "./commands/stop";

const program = new Command();

program.name("agentx").description("CLI tool for managing AgentX agents").version("0.1.0");

// Default domain: agent
// agentx run = agentx agent run
const agentCommand = program.command("agent").description("Agent management commands");

// Register commands under agent domain
agentCommand.addCommand(runCommand);
agentCommand.addCommand(psCommand);
agentCommand.addCommand(stopCommand);

// Shortcut: agentx run = agentx agent run
program.addCommand(runCommand.copyInheritedSettings(program));
program.addCommand(psCommand.copyInheritedSettings(program));
program.addCommand(stopCommand.copyInheritedSettings(program));

program.parse();
