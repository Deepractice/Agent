/**
 * Shared Test Context
 *
 * Global context shared across all step definition files.
 * This allows different step files to access the same agent instance and events.
 */

import type {
  Agent,
  AgentEvent,
  AgentConfig,
  AssistantMessageEvent,
  ResultEvent,
  StreamDeltaEvent,
  UserMessageEvent,
} from "@deepractice-ai/agentx-api";

export interface SharedTestContext {
  // Agent instances
  agent?: Agent;
  createdAgents: Agent[];

  // Configuration
  agentConfig?: Partial<AgentConfig>;

  // Events
  events: AgentEvent[];
  userEvents: UserMessageEvent[];
  assistantEvents: AssistantMessageEvent[];
  streamEvents: StreamDeltaEvent[];
  resultEvents: ResultEvent[];

  // Event handlers
  unregisterHandlers?: Map<string, () => void>;

  // Results
  lastResult?: any;

  // Errors
  error?: Error;

  // Counters
  messagesSent: number;
}

// Global shared context instance
export const sharedContext: SharedTestContext = {
  createdAgents: [],
  events: [],
  userEvents: [],
  assistantEvents: [],
  streamEvents: [],
  resultEvents: [],
  messagesSent: 0,
};

/**
 * Reset shared context
 * Call this in After hooks to clean up between scenarios
 */
export function resetSharedContext() {
  // Unregister all handlers
  if (sharedContext.unregisterHandlers) {
    sharedContext.unregisterHandlers.forEach((unregister) => {
      if (typeof unregister === "function") {
        unregister();
      }
    });
    sharedContext.unregisterHandlers.clear();
  }

  // Destroy agents
  sharedContext.createdAgents.forEach((agent) => {
    agent.destroy();
  });

  sharedContext.createdAgents = [];
  sharedContext.agent = undefined;
  sharedContext.agentConfig = undefined;
  sharedContext.events = [];
  sharedContext.userEvents = [];
  sharedContext.assistantEvents = [];
  sharedContext.streamEvents = [];
  sharedContext.resultEvents = [];
  sharedContext.unregisterHandlers = undefined;
  sharedContext.lastResult = undefined;
  sharedContext.error = undefined;
  sharedContext.messagesSent = 0;
}
