/**
 * PS command - List running agents
 */

import { Command } from "commander";
import { listAgents, getAgentStatus, loadAgentPid } from "../utils/paths";

async function psAction() {
  const agents = await listAgents();

  if (agents.length === 0) {
    console.log("No agents found");
    return;
  }

  console.log("NAME\t\t\tPORT\tSTATUS\t\tPID\tWORK_DIR");
  console.log("----\t\t\t----\t------\t\t---\t--------");

  for (const agent of agents) {
    const status = await getAgentStatus(agent.name);
    const pid = await loadAgentPid(agent.name);
    const pidStr = pid ? String(pid) : "-";

    // Format name with padding
    const name =
      agent.name.length > 16 ? agent.name.substring(0, 13) + "..." : agent.name.padEnd(16);

    const statusColor = status === "running" ? "running" : "stopped";

    console.log(`${name}\t${agent.port}\t${statusColor}\t\t${pidStr}\t${agent.workDir}`);
  }
}

export const psCommand = new Command("ps").description("List running agents").action(psAction);
