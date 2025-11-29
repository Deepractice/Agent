/**
 * Test World - Shared context for BDD tests
 *
 * This object holds state that is shared across Given/When/Then steps
 * within a scenario.
 */

import type {
  AgentXLocal,
  AgentXRemote,
  Agent,
  AgentDefinition,
  Session,
  ErrorHandler,
  PlatformInfo,
  HealthStatus,
  AgentError,
  ErrorMessageEvent,
  StateChange,
  Unsubscribe,
} from "@deepractice-ai/agentx-types";

/**
 * Test world interface
 *
 * Holds all state needed during a test scenario
 */
export interface TestWorld {
  // AgentX instances
  agentx?: AgentXLocal | AgentXRemote;
  agentxInstances: Map<string, AgentXLocal | AgentXRemote>;

  // Agents
  agent?: Agent;
  agents: Agent[];
  agentDefinition?: AgentDefinition;

  // Sessions
  session?: Session;
  sessions: Session[];

  // Error handling
  errorHandler?: ErrorHandler;
  errorHandlers: ErrorHandler[];
  errorCalls: Array<{ agentId: string; error: AgentError; event: ErrorMessageEvent }>;

  // Platform (remote mode)
  platformInfo?: PlatformInfo;
  healthStatus?: HealthStatus;

  // Mock server data (for remote mode testing)
  mockServerData?: {
    platformInfo?: PlatformInfo;
    healthStatus?: HealthStatus;
    sessions?: Session[];
  };

  // Errors and exceptions
  thrownError?: Error;

  // State change tracking
  stateChanges: StateChange[];
  stateChangeUnsubscribe?: Unsubscribe;

  // Batch subscription
  batchUnsubscribe?: Unsubscribe;

  // React subscription
  reactUnsubscribe?: Unsubscribe;

  // Lifecycle hooks
  lifecycleUnsubscribe?: Unsubscribe;
  onReadyCalled: boolean;
  onDestroyCalled: boolean;

  // Middleware & Interceptor
  middlewareUnsubscribe?: Unsubscribe;
  interceptorUnsubscribe?: Unsubscribe;

  // Generic result holder
  result?: unknown;
}

/**
 * Create a new test world
 */
export function createWorld(): TestWorld {
  return {
    agentxInstances: new Map(),
    agents: [],
    sessions: [],
    errorHandlers: [],
    errorCalls: [],
    stateChanges: [],
    onReadyCalled: false,
    onDestroyCalled: false,
  };
}

/**
 * Reset the world between scenarios
 */
export function resetWorld(world: TestWorld): void {
  // Destroy all agents
  for (const agent of world.agents) {
    agent.destroy().catch(() => {
      // Ignore errors during cleanup
    });
  }

  // Clear all data
  world.agentx = undefined;
  world.agentxInstances.clear();
  world.agent = undefined;
  world.agents = [];
  world.agentDefinition = undefined;
  world.session = undefined;
  world.sessions = [];
  world.errorHandler = undefined;
  world.errorHandlers = [];
  world.errorCalls = [];
  world.platformInfo = undefined;
  world.healthStatus = undefined;
  world.mockServerData = undefined;
  world.thrownError = undefined;
  world.stateChanges = [];
  world.stateChangeUnsubscribe?.();
  world.stateChangeUnsubscribe = undefined;
  world.batchUnsubscribe?.();
  world.batchUnsubscribe = undefined;
  world.reactUnsubscribe?.();
  world.reactUnsubscribe = undefined;
  world.lifecycleUnsubscribe?.();
  world.lifecycleUnsubscribe = undefined;
  world.onReadyCalled = false;
  world.onDestroyCalled = false;
  world.middlewareUnsubscribe?.();
  world.middlewareUnsubscribe = undefined;
  world.interceptorUnsubscribe?.();
  world.interceptorUnsubscribe = undefined;
  world.result = undefined;
}
