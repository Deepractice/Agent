/**
 * Agent - Runtime instance
 *
 * Like Spring's Bean instance, this is the runtime object.
 * Created from AgentDefinition + AgentConfig.
 *
 * Lifecycle:
 * - running: Active, can receive messages
 * - destroyed: Removed from memory, cannot be used
 *
 * API:
 * - receive(message): Send message to agent
 * - on(handler): Subscribe to events
 * - abort(): System/error forced stop
 * - interrupt(): User-initiated stop
 * - destroy(): Clean up resources
 */

import type { UserMessage, AgentState } from "@deepractice-ai/agentx-types";
import type { AgentEngine, Presenter, AgentOutput } from "@deepractice-ai/agentx-engine";
import type { AgentDefinition } from "./AgentDefinition";
import type { AgentConfig } from "./AgentConfig";
import { generateAgentId } from "./AgentConfig";

/**
 * Agent lifecycle states
 */
export type AgentLifecycle = "running" | "destroyed";

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Event handler type
 */
export type AgentEventHandler = (event: AgentOutput) => void;

/**
 * Agent - Runtime instance
 */
export class Agent {
  readonly agentId: string;
  readonly definition: AgentDefinition;
  readonly config: AgentConfig;
  readonly createdAt: Date;

  private _lifecycle: AgentLifecycle = "running";
  private _state: AgentState = "idle";
  private readonly engine: AgentEngine;
  private readonly handlers: Set<AgentEventHandler> = new Set();
  private readonly presenter: Presenter;

  constructor(
    definition: AgentDefinition,
    config: AgentConfig,
    engine: AgentEngine
  ) {
    this.agentId = config.agentId ?? generateAgentId();
    this.definition = definition;
    this.config = config;
    this.engine = engine;
    this.createdAt = new Date();

    // Create presenter to forward events to handlers
    this.presenter = (id: string, event: AgentOutput) => {
      if (id === this.agentId) {
        this.notifyHandlers(event);
        this.updateStateFromEvent(event);
      }
    };

    // Register presenter to engine
    this.engine.addPresenter(this.presenter);
  }

  /**
   * Current lifecycle state
   */
  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  /**
   * Current conversation state
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Receive a message from user
   */
  async receive(message: string | UserMessage): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("[Agent] Agent has been destroyed");
    }

    const userMessage: UserMessage =
      typeof message === "string"
        ? {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: "user",
            content: message,
            timestamp: Date.now(),
          }
        : message;

    this._state = "responding";

    try {
      await this.engine.receive(this.agentId, userMessage);
    } finally {
      // Check lifecycle again - might have been destroyed during receive
      if ((this._lifecycle as AgentLifecycle) !== "destroyed") {
        this._state = "idle";
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(handler: AgentEventHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Abort - System/error forced stop
   */
  abort(): void {
    this._state = "idle";
    // TODO: Signal driver to stop
  }

  /**
   * Interrupt - User-initiated stop
   */
  interrupt(): void {
    this._state = "idle";
    // TODO: Signal driver to stop gracefully
  }

  /**
   * Destroy - Clean up resources
   */
  async destroy(): Promise<void> {
    this._lifecycle = "destroyed";
    this._state = "idle";
    this.handlers.clear();
    // Note: Engine doesn't support removePresenter yet
    // The presenter filters by agentId, so it's safe to leave it
  }

  /**
   * Notify all registered handlers
   */
  private notifyHandlers(event: AgentOutput): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("[Agent] Handler error:", error);
      }
    }
  }

  /**
   * Update state from event
   */
  private updateStateFromEvent(event: AgentOutput): void {
    if ("type" in event) {
      switch (event.type) {
        case "message_start":
          this._state = "responding";
          break;
        case "message_stop":
          this._state = "idle";
          break;
        case "tool_call":
          this._state = "awaiting_tool_result";
          break;
        case "tool_result":
          this._state = "responding";
          break;
        case "error_message":
          this._state = "idle";
          break;
      }
    }
  }
}
