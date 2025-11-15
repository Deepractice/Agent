/**
 * Agent
 *
 * Core Agent implementation - provider-agnostic.
 * Provider is injected and handles all platform-specific logic.
 */

import type {
  Agent as IAgent,
  AgentConfig,
  AgentProvider,
  EventType,
  EventPayload,
  AgentEvent,
} from "@deepractice-ai/agentx-api";
import { AgentConfigError, AgentAbortError } from "@deepractice-ai/agentx-api";
import type { Message } from "@deepractice-ai/agentx-types";

export class Agent implements IAgent {
  readonly id: string;
  readonly sessionId: string;

  private _messages: Message[] = [];
  private eventHandlers: Map<EventType, Set<(payload: any) => void>> = new Map();
  private provider: AgentProvider;

  constructor(config: AgentConfig, provider: AgentProvider) {
    // Validate config
    provider.validateConfig(config);

    this.provider = provider;
    this.id = this.generateId();
    this.sessionId = provider.sessionId;
  }

  get messages(): ReadonlyArray<Message> {
    return this._messages;
  }

  async send(message: string): Promise<void> {
    // Add user message to history
    const userMessage: Message = {
      role: "user",
      content: message,
    };
    this._messages.push(userMessage);

    // Emit user message event
    this.emitEvent({
      type: "user_message",
      sessionId: this.sessionId,
      message: { role: "user", content: message },
      timestamp: new Date(),
    });

    try {
      // Provider yields AgentEvent directly (already transformed)
      for await (const agentEvent of this.provider.send(message, this._messages)) {
        this.emitEvent(agentEvent);

        // Update messages on assistant response
        if (agentEvent.type === "assistant") {
          this._messages.push({
            role: "assistant",
            content: agentEvent.message.content,
          });
        }
      }
    } catch (error) {
      // Handle errors
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new AgentAbortError(error.message);
        }

        // Emit error result event
        this.emitEvent({
          type: "result",
          subtype: "error_during_execution",
          sessionId: this.sessionId,
          durationMs: 0,
          totalCostUsd: 0,
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationInputTokens: 0,
            cacheReadInputTokens: 0,
          },
          error,
          timestamp: new Date(),
        });
      }
      throw error;
    }
  }

  on<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unregister function
    return () => {
      this.off(event, handler);
    };
  }

  off<T extends EventType>(event: T, handler: (payload: EventPayload<T>) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  clear(): void {
    this._messages = [];
    this.provider.abort();
  }

  destroy(): void {
    this.clear();
    this.eventHandlers.clear();
    this.provider.destroy();
  }

  private emitEvent(event: AgentEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      });
    }
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
