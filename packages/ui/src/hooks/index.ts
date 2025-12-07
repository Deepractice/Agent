/**
 * React Hooks for AgentX integration
 *
 * Image-First Architecture:
 * - Image = persistent conversation entity
 * - Agent = transient runtime instance (auto-activated)
 * - Session = internal message storage (not exposed to UI)
 *
 * Hooks:
 * - useAgentX: Create and manage AgentX instance
 * - useAgent: Subscribe to agent events, send messages (supports imageId)
 * - useImages: Manage conversations (list, create, run, stop, delete)
 *
 * @example
 * ```tsx
 * import { useAgentX, useAgent, useImages } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX({ server: "ws://localhost:5200" });
 *   const [currentImageId, setCurrentImageId] = useState<string | null>(null);
 *
 *   // Image management (conversations)
 *   const { images, createImage, runImage, stopImage, deleteImage } = useImages(agentx);
 *
 *   // Current conversation - use imageId, agent auto-activates on first message
 *   const { messages, streaming, send, isLoading, agentId } = useAgent(
 *     agentx,
 *     { imageId: currentImageId }
 *   );
 *
 *   const handleNewConversation = async () => {
 *     const image = await createImage({ name: "New Chat" });
 *     setCurrentImageId(image.imageId);
 *   };
 *
 *   return <Chat messages={messages} streaming={streaming} onSend={send} />;
 * }
 * ```
 */

export {
  useAgent,
  type UseAgentResult,
  type UseAgentOptions,
  type AgentIdentifier,
  type AgentStatus,
  type UIMessage,
  type UIError,
} from "./useAgent";

export { useAgentX } from "./useAgentX";

export { useImages, type UseImagesResult, type UseImagesOptions } from "./useImages";
