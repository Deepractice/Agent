/**
 * Runtime Internal Types
 *
 * Internal implementation types for runtime layer.
 * These are used by runtime implementers, not end users.
 *
 * ## Structure
 *
 * ```
 * internal/
 * ├── container/
 * │   ├── Container      # Agent lifecycle management
 * │   ├── llm/           # LLM connection (LLM, LLMConfig, TokenUsage...)
 * │   └── sandbox/       # Isolated environment
 * │       ├── Sandbox    # Workdir + MCP access
 * │       ├── workdir/   # File system operations
 * │       └── mcp/       # MCP tools, resources, prompts
 * │
 * ├── environment/
 * │   ├── Environment    # External world abstraction
 * │   ├── Receptor       # Event producer (LLM → DriveableEvent)
 * │   └── Effector       # Action executor (ToolCall → ToolResult)
 * │
 * ├── session/
 * │   └── Session        # Message persistence per Agent
 * │
 * ├── event/
 * │   └── SystemBus      # Central event bus
 * │
 * └── persistence/
 *     ├── Persistence    # Storage facade
 *     ├── Repository     # Flat storage interface
 *     └── record/        # Storage schema types
 * ```
 *
 * @packageDocumentation
 */

// ============================================================================
// Container
// ============================================================================

export type { Container } from "./container/Container";

// Sandbox
export type { Sandbox } from "./container/sandbox/Sandbox";
export type { Workdir } from "./container/sandbox/workdir/Workdir";
export type {
  McpServerInfo,
  McpServerConfig,
  McpTool,
  McpResource,
  McpPrompt,
  McpRequest,
  McpTransportConfig,
  McpProtocolVersion,
} from "./container/sandbox/mcp";

// LLM
export type {
  LLM,
  LLMConfig,
  LLMProvider,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  StopReason,
  TokenUsage,
} from "./container/llm";

// ============================================================================
// Environment
// ============================================================================

export type { Environment } from "./environment/Environment";
export type { Receptor } from "./environment/Receptor";
export type { Effector } from "./environment/Effector";

// ============================================================================
// Session
// ============================================================================

export type { Session } from "./session/Session";

// ============================================================================
// Event Bus (Runtime internal)
// ============================================================================

export type { SystemBus, BusEventHandler, SubscribeOptions, Unsubscribe } from "./event/SystemBus";
export type { SystemBusProducer } from "./event/SystemBusProducer";
export type { SystemBusConsumer } from "./event/SystemBusConsumer";

// ============================================================================
// Event Handler
// ============================================================================

export type { ErrorContext } from "./EventHandler";

// ============================================================================
// Persistence
// ============================================================================

export * from "./persistence";
