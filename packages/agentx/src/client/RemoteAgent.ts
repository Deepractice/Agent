/**
 * RemoteAgent - Client-side Agent implementation
 *
 * Connects to a remote agent via SSE and provides the same
 * interface as a local Agent.
 */

import type {
  AgentState,
  AgentLifecycle,
  AgentDefinition,
  AgentContext,
  UserMessage,
  AgentEventHandler,
  AgentOutput,
  Unsubscribe,
} from "@deepractice-ai/agentx-types";
import type {
  RemoteAgent as IRemoteAgent,
  ConnectionState,
  ReconnectOptions,
  AgentInfo,
} from "./types";
import { SSEClientTransport } from "./SSEClientTransport";

/**
 * Remote Agent implementation
 */
export class RemoteAgent implements IRemoteAgent {
  private _serverUrl: string;
  private _agentId: string;
  private _headers: Record<string, string>;
  private _transport: SSEClientTransport;
  private _eventHandlers: Set<AgentEventHandler> = new Set();
  private _info: AgentInfo;
  private _connectionState: ConnectionState = "disconnected";
  private _lifecycle: AgentLifecycle = "running";

  constructor(
    serverUrl: string,
    agentInfo: AgentInfo,
    headers: Record<string, string> = {},
    reconnectOptions: ReconnectOptions = {}
  ) {
    this._serverUrl = serverUrl;
    this._agentId = agentInfo.agentId;
    this._headers = headers;
    this._info = agentInfo;

    // Create SSE transport
    const sseUrl = `${serverUrl}/agents/${agentInfo.agentId}/sse`;
    this._transport = new SSEClientTransport(sseUrl, headers, reconnectOptions);

    // Forward events from transport
    this._transport.onEvent((event) => {
      this._emitEvent(event);
    });

    // Track connection state
    this._transport.onStateChange((state) => {
      this._connectionState = state;
    });
  }

  // ============================================================================
  // Agent Interface
  // ============================================================================

  get agentId(): string {
    return this._agentId;
  }

  get definition(): AgentDefinition {
    return {
      name: this._info.name,
      description: this._info.description,
      driver: null as any,
    };
  }

  get context(): AgentContext {
    return {
      agentId: this._agentId,
      createdAt: this._info.createdAt,
    };
  }

  get createdAt(): number {
    return this._info.createdAt;
  }

  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  get state(): AgentState {
    return this._info.state as AgentState;
  }

  async receive(message: string | UserMessage): Promise<void> {
    const url = `${this._serverUrl}/agents/${this._agentId}/messages`;
    const content = typeof message === "string" ? message : message.content;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this._headers },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message || "Failed to send message");
    }
  }

  on(handler: AgentEventHandler): Unsubscribe;
  on(type: string, handler: AgentEventHandler): Unsubscribe;
  on(types: string[], handler: AgentEventHandler): Unsubscribe;
  on(
    handlerOrType: AgentEventHandler | string | string[],
    maybeHandler?: AgentEventHandler
  ): Unsubscribe {
    let handler: AgentEventHandler;
    let typeFilter: Set<string> | null = null;

    if (typeof handlerOrType === "function") {
      handler = handlerOrType;
    } else if (typeof handlerOrType === "string") {
      typeFilter = new Set([handlerOrType]);
      handler = maybeHandler!;
    } else {
      typeFilter = new Set(handlerOrType);
      handler = maybeHandler!;
    }

    const wrappedHandler: AgentEventHandler = typeFilter
      ? (event) => {
          if (typeFilter!.has(event.type)) handler(event);
        }
      : handler;

    this._eventHandlers.add(wrappedHandler);
    return () => {
      this._eventHandlers.delete(wrappedHandler);
    };
  }

  abort(): void {
    this.interrupt();
  }

  interrupt(): void {
    fetch(`${this._serverUrl}/agents/${this._agentId}/interrupt`, {
      method: "POST",
      headers: this._headers,
    }).catch(() => {});
  }

  async destroy(): Promise<void> {
    this.disconnect();
    const response = await fetch(`${this._serverUrl}/agents/${this._agentId}`, {
      method: "DELETE",
      headers: this._headers,
    });
    if (!response.ok && response.status !== 404) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(error.error?.message || "Failed to destroy agent");
    }
    this._lifecycle = "destroyed";
  }

  // ============================================================================
  // RemoteAgent Specific
  // ============================================================================

  get serverUrl(): string {
    return this._serverUrl;
  }

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  connect(): void {
    this._transport.connect();
  }

  disconnect(): void {
    this._transport.disconnect();
  }

  async reconnect(): Promise<void> {
    await this._transport.reconnect();
  }

  private _emitEvent(event: AgentOutput): void {
    for (const handler of this._eventHandlers) {
      try {
        handler(event);
      } catch {}
    }
  }
}
