/**
 * EventBus Basic Usage Example
 *
 * This example demonstrates how to use AgentEventBus
 * in a producer-consumer pattern for bidirectional communication.
 */

import { AgentEventBus } from "@deepractice-ai/agentx-engine";
import type { UserMessageEvent } from "../src/l3-message/UserMessageEvent";
import type { AssistantMessageEvent } from "../src/l3-message/AssistantMessageEvent";
import type { ConversationStartStateEvent } from "../src/l2-state/ConversationStartStateEvent";

// Create the event bus
const bus = new AgentEventBus();

// ============================================
// Agent Side (produces user messages, consumes assistant messages)
// ============================================

const agentProducer = bus.createProducer();
const agentConsumer = bus.createConsumer();

// Agent listens for assistant responses
agentConsumer.consumeByType("assistant_message", (event: AssistantMessageEvent) => {
  console.log("[Agent] Received assistant message:", event.data.content);
});

// Agent listens for state changes
agentConsumer.consumeByType("conversation_start", (event: ConversationStartStateEvent) => {
  console.log("[Agent] Conversation started");
});

// ============================================
// Provider Side (consumes user messages, produces assistant messages)
// ============================================

const providerProducer = bus.createProducer();
const providerConsumer = bus.createConsumer();

// Provider listens for user messages
providerConsumer.consumeByType("user_message", async (event: UserMessageEvent) => {
  console.log("[Provider] Received user message:", event.data.content);

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Produce assistant response
  providerProducer.produce({
    type: "assistant_message",
    uuid: `msg_${Date.now()}`,
    agentId: event.agentId,
    timestamp: Date.now(),
    data: {
      id: `assistant_${Date.now()}`,
      role: "assistant",
      content: "Hello! I received your message.",
      timestamp: Date.now(),
    },
  } as AssistantMessageEvent);
});

// ============================================
// Example: Send a user message
// ============================================

// Agent sends a message
agentProducer.produce({
  type: "user_message",
  uuid: `msg_${Date.now()}`,
  agentId: "agent_001",
  timestamp: Date.now(),
  data: {
    id: `user_${Date.now()}`,
    role: "user",
    content: "Hello, Claude!",
    timestamp: Date.now(),
  },
} as UserMessageEvent);

// Clean up after 3 seconds
setTimeout(() => {
  bus.close();
  console.log("[Bus] Closed");
}, 3000);
