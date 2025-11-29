/**
 * AgentEventHandler - Event subscription types
 */

import type { AgentOutput } from "./AgentOutput";

/**
 * Unsubscribe function returned by on()
 */
export type Unsubscribe = () => void;

/**
 * Event handler function type
 */
export type AgentEventHandler<T extends AgentOutput = AgentOutput> = (event: T) => void;
