/**
 * Multi-Consumer Example
 *
 * Demonstrates how multiple consumers can listen to the same events.
 * This is useful for logging, monitoring, UI updates, etc.
 */

import { AgentEventBus } from "@deepractice-ai/agentx-core";
import type { UserMessageEvent } from "../src/l3-message/UserMessageEvent";
import type { AssistantMessageEvent } from "../src/l3-message/AssistantMessageEvent";

const bus = new AgentEventBus();

// ============================================
// Consumer 1: Agent (handles business logic)
// ============================================

const agentConsumer = bus.createConsumer();
agentConsumer.consumeByType("assistant_message", (event: AssistantMessageEvent) => {
  console.log("[Agent] Processing response:", event.data.content);
});

// ============================================
// Consumer 2: Logger (logs everything)
// ============================================

const loggerConsumer = bus.createConsumer();
loggerConsumer.consume((event) => {
  console.log(`[Logger] Event: ${event.type} at ${new Date(event.timestamp).toISOString()}`);
});

// ============================================
// Consumer 3: UI (updates interface)
// ============================================

const uiConsumer = bus.createConsumer();
uiConsumer.consumeByTypes(["user_message", "assistant_message"], (event) => {
  if (event.type === "user_message") {
    console.log("[UI] User:", event.data.content);
  } else {
    console.log("[UI] Assistant:", event.data.content);
  }
});

// ============================================
// Producer: Simulate conversation
// ============================================

const producer = bus.createProducer();

// Send user message
producer.produce({
  type: "user_message",
  uuid: `msg_${Date.now()}`,
  agentId: "agent_001",
  timestamp: Date.now(),
  data: {
    id: `user_${Date.now()}`,
    role: "user",
    content: "Hello!",
    timestamp: Date.now(),
  },
} as UserMessageEvent);

// Send assistant response
setTimeout(() => {
  producer.produce({
    type: "assistant_message",
    uuid: `msg_${Date.now()}`,
    agentId: "agent_001",
    timestamp: Date.now(),
    data: {
      id: `assistant_${Date.now()}`,
      role: "assistant",
      content: "Hi there!",
      timestamp: Date.now(),
    },
  } as AssistantMessageEvent);
}, 1000);

// Clean up
setTimeout(() => {
  bus.close();
}, 2000);
