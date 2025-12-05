/**
 * @agentxjs/mirror - Browser-side AgentX implementation
 *
 * Provides:
 * - MirrorRuntime: Browser-side Runtime
 * - PeerEnvironment: Network-based Environment (Receptor + Effector)
 * - MirrorPersistence: HTTP-based Persistence
 *
 * This is a private package, bundled into agentxjs.
 * Users should use `createMirror` from agentxjs instead.
 *
 * @internal
 * @packageDocumentation
 */

// Runtime
export { MirrorRuntime, type MirrorRuntimeConfig } from "./runtime";
export { MirrorContainer } from "./runtime";
export { MirrorAgent } from "./runtime";
export { SystemBusImpl } from "./runtime";

// Environment
export {
  PeerEnvironment,
  PeerReceptor,
  PeerEffector,
  createPeerEnvironment,
  type PeerEnvironmentConfig,
} from "./environment";

// Persistence
export { MirrorPersistence, type MirrorPersistenceConfig } from "./persistence";
