/**
 * Agent components - Agent state monitoring and UI integration
 *
 * Components for integrating AgentService with React UI:
 * - AgentStatusIndicator: Displays agent status with animations
 * - UIReactor: Reactor for accumulating UI data (messages, streaming, errors)
 */

export { AgentStatusIndicator, type AgentStatusIndicatorProps } from "./AgentStatusIndicator";
export { UIReactor, type UIReactorConfig } from "./UIReactor";
