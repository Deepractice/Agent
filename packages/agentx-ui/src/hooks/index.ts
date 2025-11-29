/**
 * React Hooks for AgentX integration
 *
 * @example
 * ```tsx
 * import { useAgent, useAgentX } from "@deepractice-ai/agentx-ui";
 *
 * function ChatPage() {
 *   const agentx = useAgentX();
 *   const [agent, setAgent] = useState(null);
 *
 *   // Create agent
 *   useEffect(() => {
 *     if (!agentx) return;
 *     const newAgent = agentx.agents.create(MyAgent, config);
 *     setAgent(newAgent);
 *     return () => newAgent.destroy();
 *   }, [agentx]);
 *
 *   // Use agent
 *   const { messages, streaming, send, isLoading } = useAgent(agent);
 *
 *   return <Chat messages={messages} streaming={streaming} onSend={send} />;
 * }
 * ```
 */

export { useAgent, type UseAgentResult, type UseAgentOptions } from "./useAgent";
export { useAgentX } from "./useAgentX";
