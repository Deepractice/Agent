/**
 * ClaudeProvider
 *
 * Adapts @anthropic-ai/claude-agent-sdk to AgentEvent standard.
 * This is the Node.js-specific implementation.
 */

import { query, type SDKMessage, type Query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentProvider } from "@deepractice-ai/agentx-core";
import type { AgentConfig, AgentEvent } from "@deepractice-ai/agentx-api";
import { AgentConfigError } from "@deepractice-ai/agentx-api";
import type { Message } from "@deepractice-ai/agentx-types";

export class ClaudeProvider implements AgentProvider {
  readonly sessionId: string;
  private abortController: AbortController;
  private config: AgentConfig;
  private currentQuery: Query | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.abortController = new AbortController();
  }

  async *send(message: string, _messages: ReadonlyArray<Message>): AsyncGenerator<AgentEvent> {
    try {
      // Create Claude SDK query
      this.currentQuery = query({
        prompt: message,
        options: {
          model: this.config.model,
          systemPrompt: this.config.systemPrompt,
          maxThinkingTokens: this.config.maxThinkingTokens,
          abortController: this.abortController,
          mcpServers: this.transformMcpConfig(this.config.mcp),
        },
      });

      // Stream SDK messages and transform to AgentEvent
      for await (const sdkMessage of this.currentQuery) {
        const agentEvent = this.transformToAgentEvent(sdkMessage);
        if (agentEvent) {
          yield agentEvent;
        }
      }
    } finally {
      this.currentQuery = null;
    }
  }

  validateConfig(config: AgentConfig): void {
    if (!config.apiKey) {
      throw new AgentConfigError("apiKey is required", "apiKey");
    }
    if (!config.model) {
      throw new AgentConfigError("model is required", "model");
    }
  }

  abort(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
  }

  async destroy(): Promise<void> {
    this.abort();
  }

  /**
   * Transform Claude SDK message to AgentEvent
   * This is where the adaptation happens - from SDK format to our standard
   */
  private transformToAgentEvent(sdkMessage: SDKMessage): AgentEvent | null {
    const uuid = sdkMessage.uuid ?? `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();

    switch (sdkMessage.type) {
      case "user":
        return {
          type: "user",
          uuid,
          sessionId: this.sessionId,
          message: {
            id: uuid,
            role: "user",
            content: typeof sdkMessage.message === "string" ? sdkMessage.message : "",
            timestamp,
          },
          timestamp,
        };

      case "assistant":
        return {
          type: "assistant",
          uuid,
          sessionId: this.sessionId,
          message: {
            id: uuid,
            role: "assistant",
            content: (sdkMessage.message as any).content ?? [],
            timestamp,
          },
          timestamp,
        };

      case "stream_event":
        // Map SDK stream event to our format
        const streamEvent = sdkMessage.event;
        return {
          type: "stream_event",
          uuid,
          sessionId: this.sessionId,
          streamEventType: streamEvent.type as any, // TODO: proper type mapping
          delta: streamEvent.type === "content_block_delta" ? streamEvent.delta : undefined,
          index: streamEvent.type === "content_block_start" ? streamEvent.index : undefined,
          timestamp,
        };

      case "result":
        if (sdkMessage.subtype === "success") {
          return {
            type: "result",
            subtype: "success",
            uuid,
            sessionId: this.sessionId,
            durationMs: sdkMessage.duration_ms,
            durationApiMs: sdkMessage.duration_api_ms,
            numTurns: sdkMessage.num_turns,
            result: (sdkMessage as any).result ?? "",
            totalCostUsd: sdkMessage.total_cost_usd,
            usage: {
              input: sdkMessage.usage.input_tokens,
              output: sdkMessage.usage.output_tokens,
              cacheWrite: sdkMessage.usage.cache_creation_input_tokens ?? 0,
              cacheRead: sdkMessage.usage.cache_read_input_tokens ?? 0,
            },
            timestamp,
          };
        } else {
          // Filter to only allowed error subtypes
          const subtype = sdkMessage.subtype === "error_max_turns" ? "error_max_turns" : "error_during_execution";
          return {
            type: "result",
            subtype,
            uuid,
            sessionId: this.sessionId,
            durationMs: sdkMessage.duration_ms,
            durationApiMs: sdkMessage.duration_api_ms,
            numTurns: sdkMessage.num_turns,
            totalCostUsd: sdkMessage.total_cost_usd,
            usage: {
              input: sdkMessage.usage.input_tokens,
              output: sdkMessage.usage.output_tokens,
              cacheWrite: sdkMessage.usage.cache_creation_input_tokens ?? 0,
              cacheRead: sdkMessage.usage.cache_read_input_tokens ?? 0,
            },
            error: new Error(`Agent error: ${sdkMessage.subtype}`),
            timestamp,
          };
        }

      case "system":
        if (sdkMessage.subtype === "init") {
          return {
            type: "system",
            subtype: "init",
            uuid,
            sessionId: this.sessionId,
            model: sdkMessage.model,
            tools: sdkMessage.tools,
            cwd: sdkMessage.cwd,
            timestamp,
          };
        }
        // Ignore other system messages (e.g., compact_boundary)
        return null;

      default:
        // Unknown message type
        return null;
    }
  }

  private transformMcpConfig(mcp?: AgentConfig["mcp"]) {
    if (!mcp || !mcp.servers) {
      return undefined;
    }

    const result: Record<string, any> = {};
    for (const [name, serverConfig] of Object.entries(mcp.servers)) {
      result[name] = serverConfig;
    }
    return result;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
