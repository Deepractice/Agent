/**
 * PeerEnvironment - Browser-side Environment using Peer for network communication
 *
 * This is the mirror counterpart to ClaudeEnvironment (Node.js).
 * Instead of Claude SDK, it uses Peer (WebSocket) for communication.
 *
 * Architecture:
 * ```
 *   Server (Runtime + ClaudeEnvironment)
 *        ▲
 *        │ WebSocket
 *        ▼
 *   ┌─────────────────────────┐
 *   │    PeerEnvironment      │
 *   │                         │
 *   │  ┌───────────────────┐  │
 *   │  │   PeerReceptor    │──┼──► emit to bus (upstream events)
 *   │  └───────────────────┘  │
 *   │                         │
 *   │  ┌───────────────────┐  │
 *   │  │   PeerEffector    │◄─┼── subscribe from bus (broadcast/forward)
 *   │  └───────────────────┘  │
 *   └─────────────────────────┘
 *        │
 *        ▼
 *   Browser (MirrorRuntime)
 * ```
 *
 * Event Flow:
 * 1. Server sends events via WebSocket
 * 2. PeerReceptor receives via peer.onUpstreamEvent
 * 3. PeerReceptor emits to SystemBus
 * 4. MirrorAgent/MirrorContainer subscribes to bus
 * 5. Browser code handles events
 */

import type { Environment, Peer, Receptor, Effector } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { PeerReceptor } from "./PeerReceptor";
import { PeerEffector } from "./PeerEffector";

const logger = createLogger("mirror/PeerEnvironment");

/**
 * PeerEnvironment configuration
 */
export interface PeerEnvironmentConfig {
  /**
   * Peer instance for network communication
   */
  peer: Peer;

  /**
   * Environment name
   * @default "peer"
   */
  name?: string;
}

/**
 * PeerEnvironment - Network-based Environment for browser clients
 */
export class PeerEnvironment implements Environment {
  readonly name: string;
  readonly receptor: Receptor;
  readonly effector: Effector;

  private readonly peerReceptor: PeerReceptor;
  private readonly peerEffector: PeerEffector;

  constructor(config: PeerEnvironmentConfig) {
    this.name = config.name ?? "peer";
    this.peerReceptor = new PeerReceptor(config.peer);
    this.peerEffector = new PeerEffector(config.peer);
    this.receptor = this.peerReceptor;
    this.effector = this.peerEffector;

    logger.debug("PeerEnvironment created", { name: this.name });
  }

  /**
   * Dispose environment and clean up resources
   */
  dispose(): void {
    this.peerReceptor.dispose();
    this.peerEffector.dispose();
    logger.debug("PeerEnvironment disposed");
  }
}

/**
 * Create a PeerEnvironment
 */
export function createPeerEnvironment(config: PeerEnvironmentConfig): PeerEnvironment {
  return new PeerEnvironment(config);
}
