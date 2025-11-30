/**
 * RuntimeDriver - Driver with Sandbox (Runtime layer)
 *
 * Extends AgentDriver with Sandbox for resource access.
 * Created by Runtime, used by Agent (as AgentDriver).
 *
 * - Agent sees: AgentDriver (pure event source)
 * - Runtime creates: RuntimeDriver (Driver + Sandbox)
 */

import type { AgentDriver } from "~/agent/AgentDriver";
import type { Sandbox } from "./sandbox";

/**
 * RuntimeDriver - Driver with Sandbox
 *
 * Runtime creates RuntimeDriver, Agent uses it as AgentDriver.
 * Driver can access Sandbox for resources (LLM credentials, OS, etc.).
 */
export interface RuntimeDriver extends AgentDriver {
  /**
   * Sandbox providing resources for this Driver
   */
  readonly sandbox: Sandbox;
}
