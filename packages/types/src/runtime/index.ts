/**
 * Runtime Module - Execution environment for AI Agents
 *
 * Runtime manages the complete system: Container lifecycle, Session persistence,
 * Sandbox isolation, and event-driven communication via SystemBus.
 *
 * ## Architecture
 *
 * ```
 * Runtime (extends SystemBus)
 * │
 * ├── Container 1
 * │   ├── Agent A ─── Sandbox A ─── Session A
 * │   └── Agent B ─── Sandbox B ─── Session B
 * │
 * └── Container 2
 *     └── Agent C ─── Sandbox C ─── Session C
 *
 * Environment (LLM connection)
 *     └── Receptor → DriveableEvent → SystemBus → Agent
 * ```
 *
 * ## Two-Domain Relationship
 *
 * ```
 * Runtime Domain                      AgentEngine Domain
 * ─────────────────────────────────────────────────────────
 * Agent (complete entity)             AgentEngine (processing unit)
 *   - lifecycle: stop/resume            - receive/on/react
 *   - LLM + Sandbox + Session           - Driver + MealyMachine + Presenter
 *
 * SystemEvent (full context)          AgentEvent (lightweight)
 *   - source, category, intent          - type, timestamp, data
 *
 * DriveableEvent                      StreamEvent
 *   - from Environment                  - simplified for Engine
 *         │                                    ▲
 *         └──────── Driver converts ───────────┘
 * ```
 *
 * ## Core Components
 *
 * | Component | Responsibility |
 * |-----------|----------------|
 * | Runtime   | Event-driven API, extends SystemBus |
 * | Container | Agent lifecycle, isolation boundary |
 * | Agent     | Complete runtime entity (LLM + Sandbox + Session) |
 * | AgentImage| Snapshot for stop/resume capability |
 * | Session   | Message persistence per Agent |
 * | Sandbox   | Isolated environment (Workdir, MCP tools) |
 *
 * ## Usage
 *
 * ```typescript
 * // Create runtime
 * const runtime = createRuntime({ persistence });
 *
 * // Create container and run agent
 * const containerRes = await runtime.request("container_create_request", {
 *   containerId: "my-container"
 * });
 * const agentRes = await runtime.request("agent_run_request", {
 *   containerId: "my-container",
 *   config: { name: "Assistant", systemPrompt: "You are helpful." }
 * });
 *
 * // Subscribe to events
 * runtime.on("text_delta", (e) => console.log(e.data.text));
 *
 * // Send message
 * await runtime.request("agent_receive_request", {
 *   agentId: agentRes.data.agentId,
 *   content: "Hello!"
 * });
 * ```
 *
 * For internal implementation types (Container, LLM, Sandbox, Session, etc.),
 * use `@agentxjs/types/runtime/internal`.
 *
 * @packageDocumentation
 */

// ============================================================================
// Runtime Entry
// ============================================================================

export type { Runtime, Unsubscribe, BusEventHandler } from "./Runtime";

export type { Container } from "./internal/container/Container";

export type { AgentImage, ImageMessage } from "./AgentImage";

export type { LLMProvider, ClaudeLLMConfig, ClaudeLLMProvider } from "./LLMProvider";

// ============================================================================
// Agent Runtime
// ============================================================================

export type { Agent } from "./Agent";
export type { AgentConfig } from "./AgentConfig";
export type { AgentLifecycle } from "./AgentLifecycle";

// MCP Server Config (SDK Compatible)
export type { McpServerConfig } from "./internal/container/sandbox/mcp";

// ============================================================================
// Events (Re-exported from @agentxjs/types/event)
// ============================================================================

export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
  EventContext,
} from "~/event/base/SystemEvent";

export type {
  DriveableEvent,
  DriveableEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
  InterruptedEvent,
  ErrorReceivedEvent,
} from "~/event/environment";
