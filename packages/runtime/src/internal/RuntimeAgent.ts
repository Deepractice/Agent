/**
 * RuntimeAgent - Full Agent implementation
 *
 * Combines:
 * - Engine: Event processing (from @agentxjs/agent)
 * - Driver: Bus communication
 * - Sandbox: Workdir, MCP
 * - Session: Message persistence
 */

import type { Agent as RuntimeAgentInterface, AgentLifecycle, AgentConfig } from "@agentxjs/types/runtime";
import type { AgentEngine, AgentPresenter, AgentOutput, Message } from "@agentxjs/types/agent";
import type { SystemBus, Sandbox, Session } from "@agentxjs/types/runtime/internal";
import { createAgent } from "@agentxjs/agent";
import { BusDriver } from "./BusDriver";

/**
 * RuntimeAgent configuration
 */
export interface RuntimeAgentConfig {
  agentId: string;
  containerId: string;
  config: AgentConfig;
  bus: SystemBus;
  sandbox: Sandbox;
  session: Session;
}

/**
 * BusPresenter - Forwards AgentOutput to SystemBus and collects messages
 */
class BusPresenter implements AgentPresenter {
  readonly name = "BusPresenter";
  readonly description = "Forwards AgentOutput to SystemBus and collects messages";

  constructor(
    private readonly bus: SystemBus,
    private readonly session: Session,
    private readonly agentId: string,
    private readonly containerId: string
  ) {}

  present(_agentId: string, output: AgentOutput): void {
    // Add runtime context and emit to bus
    this.bus.emit({
      ...output,
      agentId: this.agentId,
      containerId: this.containerId,
    } as never);

    // Collect message events to session
    if (this.isMessageEvent(output)) {
      this.session.addMessage(output.data as Message);
    }
  }

  private isMessageEvent(output: AgentOutput): boolean {
    return (
      output.type === "user_message" ||
      output.type === "assistant_message" ||
      output.type === "tool_call_message" ||
      output.type === "tool_result_message"
    );
  }
}

/**
 * RuntimeAgent - Full Agent with Engine + Sandbox + Session
 */
export class RuntimeAgent implements RuntimeAgentInterface {
  readonly agentId: string;
  readonly name: string;
  readonly containerId: string;
  readonly createdAt: number;

  private _lifecycle: AgentLifecycle = "running";
  private readonly engine: AgentEngine;
  private readonly driver: BusDriver;
  private readonly bus: SystemBus;
  readonly session: Session;
  readonly config: AgentConfig;

  constructor(config: RuntimeAgentConfig) {
    this.agentId = config.agentId;
    this.name = config.config.name ?? `agent-${config.agentId}`;
    this.containerId = config.containerId;
    this.createdAt = Date.now();
    this.bus = config.bus;
    this.session = config.session;
    this.config = config.config;
    // Note: sandbox is stored in config but not directly on this instance
    // It's used during agent creation but not needed after

    // Create Driver
    this.driver = new BusDriver(config.bus, { agentId: this.agentId });

    // Create Presenter (forwards to bus + collects to session)
    const presenter = new BusPresenter(
      config.bus,
      config.session,
      this.agentId,
      this.containerId
    );

    // Create Engine (from @agentxjs/agent)
    this.engine = createAgent({
      driver: this.driver,
      presenter,
    });
  }

  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  async receive(message: string): Promise<void> {
    if (this._lifecycle !== "running") {
      throw new Error(`Cannot send message to ${this._lifecycle} agent`);
    }
    await this.engine.receive(message);
  }

  interrupt(): void {
    this.engine.interrupt();

    // Emit interrupted event
    this.bus.emit({
      type: "interrupted",
      timestamp: Date.now(),
      source: "agent",
      category: "lifecycle",
      intent: "notification",
      data: {
        agentId: this.agentId,
        containerId: this.containerId,
      },
      context: {
        containerId: this.containerId,
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    });
  }

  async stop(): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Cannot stop destroyed agent");
    }
    this._lifecycle = "stopped";
  }

  async resume(): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Cannot resume destroyed agent");
    }
    this._lifecycle = "running";

    // Emit session_resumed event
    this.bus.emit({
      type: "session_resumed",
      timestamp: Date.now(),
      source: "session",
      category: "lifecycle",
      intent: "notification",
      data: {
        sessionId: this.session.sessionId,
        agentId: this.agentId,
        containerId: this.containerId,
      },
      context: {
        containerId: this.containerId,
        agentId: this.agentId,
        sessionId: this.session.sessionId,
      },
    });
  }

  async destroy(): Promise<void> {
    if (this._lifecycle !== "destroyed") {
      await this.engine.destroy();
      this._lifecycle = "destroyed";

      // Emit session_destroyed event
      this.bus.emit({
        type: "session_destroyed",
        timestamp: Date.now(),
        source: "session",
        category: "lifecycle",
        intent: "notification",
        data: {
          sessionId: this.session.sessionId,
          agentId: this.agentId,
          containerId: this.containerId,
        },
        context: {
          containerId: this.containerId,
          agentId: this.agentId,
          sessionId: this.session.sessionId,
        },
      });
    }
  }
}
