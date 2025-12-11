/**
 * React Hooks for AgentX integration
 *
 * Image-First Architecture:
 * - Image = persistent conversation entity
 * - Agent = transient runtime instance (auto-activated)
 * - Session = internal message storage (not exposed to UI)
 *
 * Entry-First Design:
 * - useAgent returns EntryData[] directly for UI rendering
 * - Entry = one party's complete utterance (user, assistant, error)
 * - Block = component within Entry (e.g., ToolBlock inside AssistantEntry)
 *
 * Hooks:
 * - useAgentX: Create and manage AgentX instance
 * - useAgent: Subscribe to agent events, returns EntryData[]
 * - useImages: Manage conversations (list, create, run, stop, delete)
 *
 * @example
 * ```tsx
 * import { useAgentX, useAgent, useImages } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX("ws://localhost:5200");
 *   const [currentImageId, setCurrentImageId] = useState<string | null>(null);
 *
 *   // Image management (conversations)
 *   const { images, createImage, runImage, stopImage, deleteImage } = useImages(agentx);
 *
 *   // Current conversation - use imageId, agent auto-activates on first message
 *   const { entries, streamingText, send, isLoading } = useAgent(agentx, currentImageId);
 *
 *   return (
 *     <div>
 *       {entries.map(entry => {
 *         switch (entry.type) {
 *           case 'user':
 *             return <UserEntry key={entry.id} entry={entry} />;
 *           case 'assistant':
 *             return <AssistantEntry key={entry.id} entry={entry} streamingText={streamingText} />;
 *           case 'error':
 *             return <ErrorEntry key={entry.id} entry={entry} />;
 *         }
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */

export {
  useAgent,
  type UseAgentResult,
  type UseAgentOptions,
  type AgentStatus,
  type EntryData,
  type UserEntryData,
  type AssistantEntryData,
  type ErrorEntryData,
  type ToolBlockData,
  type UserEntryStatus,
  type AssistantEntryStatus,
  type UIError,
} from "./useAgent";

export { useAgentX } from "./useAgentX";

export { useImages, type UseImagesResult, type UseImagesOptions } from "./useImages";
