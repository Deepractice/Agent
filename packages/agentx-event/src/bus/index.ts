/**
 * EventBus - Producer-Consumer Pattern
 *
 * Core abstractions for event-driven communication:
 * - EventBus: Message broker interface
 * - EventProducer: Event producer interface
 * - EventConsumer: Event consumer interface
 *
 * Implementation:
 * The concrete implementation (AgentEventBus) is provided by @deepractice-ai/agentx-core
 *
 * Usage:
 * ```typescript
 * import { AgentEventBus } from "@deepractice-ai/agentx-engine";
 * import type { EventBus, EventProducer, EventConsumer } from "@deepractice-ai/agentx-event/bus";
 *
 * const bus: EventBus = new AgentEventBus();
 *
 * // Agent side
 * const agentProducer: EventProducer = bus.createProducer();
 * const agentConsumer: EventConsumer = bus.createConsumer();
 * agentConsumer.consumeByType("assistant_message", (event) => { ... });
 * agentProducer.produce({ type: "user_message", ... });
 *
 * // Provider side
 * const providerProducer: EventProducer = bus.createProducer();
 * const providerConsumer: EventConsumer = bus.createConsumer();
 * providerConsumer.consumeByType("user_message", (event) => { ... });
 * providerProducer.produce({ type: "assistant_message", ... });
 * ```
 */

export type { EventBus } from "./EventBus";
export type { EventProducer } from "./EventProducer";
export type { EventConsumer, Unsubscribe } from "./EventConsumer";
