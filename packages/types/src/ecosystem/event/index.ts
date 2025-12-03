/**
 * Ecosystem Events
 *
 * Two types of events:
 * 1. EnvironmentEvent - External raw materials (text_chunk, stream_start, etc.)
 * 2. AgentEvent - Agent internal events (assembled by Mealy Machine)
 *
 * EnvironmentEvent + context flows on SystemBus directly.
 * No need for separate RuntimeEvent definition.
 *
 * @see issues/029-simplified-event-architecture.md
 */

export * from "./EnvironmentEvent";
