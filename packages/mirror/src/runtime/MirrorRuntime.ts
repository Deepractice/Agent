/**
 * MirrorRuntime - Browser-side Runtime implementation
 *
 * Implements Runtime interface for browser clients.
 * Communicates with server via PeerEnvironment (WebSocket).
 *
 * Architecture:
 * ```
 *   Server (Runtime + ClaudeEnvironment)
 *        ▲
 *        │ WebSocket (Peer)
 *        ▼
 *   ┌─────────────────────────────┐
 *   │       MirrorRuntime         │
 *   │                             │
 *   │  ┌───────────────────────┐  │
 *   │  │   PeerEnvironment     │  │
 *   │  │  (Receptor+Effector)  │  │
 *   │  └───────────┬───────────┘  │
 *   │              │              │
 *   │  ┌───────────▼───────────┐  │
 *   │  │     SystemBus         │  │
 *   │  └───────────┬───────────┘  │
 *   │              │              │
 *   │  ┌───────────▼───────────┐  │
 *   │  │   MirrorContainers    │  │
 *   │  │   MirrorAgents        │  │
 *   │  └───────────────────────┘  │
 *   └─────────────────────────────┘
 * ```
 *
 * @example
 * ```typescript
 * const peer = createWebSocketPeer();
 * await peer.connectUpstream({ url: "ws://localhost:5200" });
 *
 * const runtime = new MirrorRuntime({ peer });
 *
 * runtime.on((event) => {
 *   console.log("Event:", event);
 * });
 *
 * const container = runtime.createContainer("my-container");
 * const agent = await container.run(definition);
 * ```
 */

import type { Runtime, Unsubscribe, RuntimeEventHandler, Container, Peer, Environment } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { MirrorContainer } from "./MirrorContainer";
import { PeerEnvironment } from "../environment";

const logger = createLogger("mirror/MirrorRuntime");

/**
 * MirrorRuntime configuration
 */
export interface MirrorRuntimeConfig {
  /**
   * WebSocket server URL (used with connect())
   * @example "ws://localhost:5200"
   */
  serverUrl?: string;

  /**
   * WebSocket peer for network communication
   */
  peer?: Peer;

  /**
   * Custom environment (for testing)
   * If not provided, PeerEnvironment is created from peer.
   */
  environment?: Environment;
}

/**
 * MirrorRuntime - Browser-side Runtime implementation
 *
 * Uses PeerEnvironment for bidirectional communication with server.
 */
export class MirrorRuntime implements Runtime {
  private readonly bus: SystemBusImpl;
  private readonly config: MirrorRuntimeConfig;
  private readonly containers = new Map<string, MirrorContainer>();
  private peer: Peer | null = null;
  private environment: Environment | null = null;
  private peerEnvironment: PeerEnvironment | null = null;

  constructor(config: MirrorRuntimeConfig = {}) {
    this.config = config;
    this.bus = new SystemBusImpl();
    this.peer = config.peer ?? null;

    // Setup environment
    if (config.environment) {
      this.environment = config.environment;
      this.connectEnvironment(this.environment);
    } else if (config.peer) {
      this.setupPeerEnvironment(config.peer);
    }

    logger.debug("MirrorRuntime created", { serverUrl: config.serverUrl });
  }

  /**
   * Setup PeerEnvironment from Peer
   */
  private setupPeerEnvironment(peer: Peer): void {
    this.peerEnvironment = new PeerEnvironment({ peer });
    this.environment = this.peerEnvironment;
    this.connectEnvironment(this.environment);
  }

  /**
   * Connect environment to bus
   */
  private connectEnvironment(env: Environment): void {
    // Receptor emits events to bus
    env.receptor.emit(this.bus);

    // Effector subscribes to bus events
    env.effector.subscribe(this.bus);

    logger.debug("Environment connected to bus", { name: env.name });
  }

  /**
   * Connect to the server via WebSocket
   *
   * Must be called before createContainer() if not using custom peer.
   */
  async connect(): Promise<void> {
    if (this.peer) {
      // Already have a peer
      if (this.peer.upstreamState === "connected") {
        return;
      }
      if (this.config.serverUrl) {
        await this.peer.connectUpstream({ url: this.config.serverUrl });
      }
      return;
    }

    if (!this.config.serverUrl) {
      throw new Error("serverUrl is required for connect()");
    }

    // In browser, we'd use a browser WebSocket peer
    // For now, throw an error - the caller should provide a peer
    throw new Error(
      "No peer provided. Pass a Peer instance via config.peer or use createWebSocketPeer() from @agentxjs/network"
    );
  }

  /**
   * Set the WebSocket peer (for dependency injection)
   *
   * Creates PeerEnvironment and connects it to the bus.
   */
  setPeer(peer: Peer): void {
    this.peer = peer;

    // Dispose existing PeerEnvironment if any
    if (this.peerEnvironment) {
      this.peerEnvironment.dispose();
    }

    // Create and connect new PeerEnvironment
    this.setupPeerEnvironment(peer);
  }

  /**
   * Subscribe to all runtime events
   */
  on(handler: RuntimeEventHandler): Unsubscribe {
    return this.bus.onAny((event) => {
      handler(event);
    });
  }

  /**
   * Emit an event to the runtime
   *
   * Events are emitted to local bus and sent upstream via peer.
   */
  emit(event: unknown): void {
    this.bus.emit(event as { type: string });

    // Also send upstream if connected
    if (this.peer?.upstreamState === "connected") {
      this.peer.sendUpstream(event as any);
    }
  }

  /**
   * Create a Container for managing Agent instances
   *
   * Returns a MirrorContainer that proxies operations to server.
   */
  createContainer(containerId: string): Container {
    // Check cache
    const existing = this.containers.get(containerId);
    if (existing) {
      return existing;
    }

    if (!this.peer) {
      throw new Error("No peer connected. Call connect() or setPeer() first.");
    }

    // Create proxy container
    const container = new MirrorContainer(containerId, this.peer);
    this.containers.set(containerId, container);

    // Send create_container request event to server
    this.bus.emit({
      type: "create_container_request",
      timestamp: Date.now(),
      source: "container",
      category: "lifecycle",
      intent: "request",
      data: { containerId },
      context: { containerId },
    });

    logger.debug("Container created", { containerId });
    return container;
  }

  /**
   * Dispose the runtime and clean up resources
   */
  dispose(): void {
    logger.info("Disposing MirrorRuntime");

    // Dispose all containers
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();

    // Dispose environment
    if (this.peerEnvironment) {
      this.peerEnvironment.dispose();
      this.peerEnvironment = null;
    }

    // Disconnect peer
    if (this.peer) {
      this.peer.disconnectUpstream();
    }

    this.bus.destroy();
  }

  /**
   * Get the underlying SystemBus (for advanced use)
   */
  getBus(): SystemBusImpl {
    return this.bus;
  }

  /**
   * Get the WebSocket peer
   */
  getPeer(): Peer | null {
    return this.peer;
  }

  /**
   * Get the environment
   */
  getEnvironment(): Environment | null {
    return this.environment;
  }

  /**
   * Get configuration
   */
  getConfig(): MirrorRuntimeConfig {
    return this.config;
  }
}
