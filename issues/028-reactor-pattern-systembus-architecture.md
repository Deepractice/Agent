# Reactor 模式与 SystemBus 架构设计

## 背景

在 027-systems-theory-agent-environment.md 的基础上，我们进一步明确了事件驱动架构的实现方式：采用 **Reactor 模式** 和 **SystemBus** 作为核心机制。

## 核心概念

### Reactor 模式

所有组件都是 Reactor：

- 监听总线上的某类事件
- 加工/转换
- 产生新事件丢回总线

```typescript
interface Reactor {
  /** 启动，开始监听和产生事件 */
  start(bus: SystemBus): void;

  /** 停止 */
  stop(): void;
}
```

### 两层 Bus 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SystemBus (Ecosystem 级)                       │
│                                                                     │
│   事件类型：EnvironmentEvent + RuntimeEvent                         │
│   作用域：整个生态系统                                               │
│   订阅者：Environment, Receptor, UI, 监控, 日志...                  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                   Agent (系统边界)                           │   │
│   │                                                             │   │
│   │   ┌─────────────────────────────────────────────────────┐   │   │
│   │   │              AgentEventBus (Agent 内部)              │   │   │
│   │   │                                                     │   │   │
│   │   │  事件类型：AgentOutput (内部事件)                    │   │   │
│   │   │  作用域：单个 Agent 内部                             │   │   │
│   │   │  订阅者：Agent 内部组件、状态机                      │   │   │
│   │   └─────────────────────────────────────────────────────┘   │   │
│   │                                                             │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │                                       │
│                        Receptor 桥接                                 │
│                   (Agent 内部事件 → RuntimeEvent)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 为什么分开两层 Bus

| 维度     | SystemBus                       | AgentEventBus          |
| -------- | ------------------------------- | ---------------------- |
| 作用域   | 整个 Ecosystem                  | 单个 Agent 内部        |
| 事件类型 | EnvironmentEvent, RuntimeEvent  | AgentOutput            |
| 订阅者   | Environment, Receptor, UI, 监控 | Agent 内部组件、状态机 |
| 隔离性   | 全局可见                        | Agent 边界内           |
| 性能     | 低频，跨组件                    | 高频，内部处理         |

**分开的好处**：

1. **隔离性**：Agent 内部事件不污染全局
2. **封装性**：Agent 是一个独立系统，有自己的边界
3. **性能**：Agent 内部高频事件不需要广播到全局
4. **清晰**：两个层次，两种事件，两个 bus

## 事件分层

### EnvironmentEvent（外部事件）

系统需要从环境获取的信息，是精简的、有意义的外部信息：

```typescript
type EnvironmentEvent =
  // 流式输出
  | { type: "text_chunk"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }

  // 工具执行结果
  | { type: "tool_result"; toolUseId: string; result: unknown; isError: boolean }

  // 流控制
  | { type: "stream_start"; messageId: string }
  | { type: "stream_end"; stopReason?: string }
  | { type: "interrupted"; reason: string }

  // 连接状态（远程环境）
  | { type: "connected" }
  | { type: "disconnected"; reason?: string }

  // 错误
  | { type: "error"; error: Error };
```

**关键原则**：我们定义什么 EnvironmentEvent，取决于**系统内部需要什么信息**，而不是外部有什么。

例如 Claude SDK 返回很多细节事件（message_start, content_block_start, content_block_delta...），但我们只定义系统需要的（text_chunk, tool_call, stream_end...）。

### RuntimeEvent（系统内部事件）

已经定义好的，是系统内部的丰富事件：

```typescript
type RuntimeEvent =
  // Transport
  | HeartbeatEvent
  | ConnectionEstablishedEvent
  // Session
  | SessionCreatedEvent
  | SessionResumedEvent
  // Agent lifecycle
  | AgentStartedEvent
  | AgentReadyEvent
  | AgentDestroyedEvent
  // Conversation
  | ConversationQueuedEvent
  | ConversationStartEvent
  | ConversationThinkingEvent
  | ConversationRespondingEvent
  | ConversationEndEvent
  | ConversationInterruptedEvent
  // Stream
  | MessageStartEnvEvent
  | MessageStopEnvEvent
  | TextDeltaEnvEvent
  | ToolCallEnvEvent
  | ToolResultEnvEvent
  | InterruptedEnvEvent
  // Tool
  | ToolPlannedEnvEvent
  | ToolExecutingEnvEvent
  | ToolCompletedEnvEvent
  | ToolFailedEnvEvent
  // Error
  | ErrorEnvEvent;
```

### AgentOutput（Agent 内部事件）

Agent 内部的事件，不暴露给 Ecosystem：

```typescript
type AgentOutput = StreamEventType | MessageEventType | StateEventType | TurnEventType;
```

## Reactor 组件

### Environment (Reactor)

监听外部世界，产生 EnvironmentEvent：

```typescript
class ClaudeEnvironment implements Reactor {
  start(bus: SystemBus): void {
    // 调用 Claude SDK
    // 把 SDK 返回的细节事件转换成 EnvironmentEvent
    // emit 到 SystemBus
  }
}

class WebSocketEnvironment implements Reactor {
  start(bus: SystemBus): void {
    // 监听 WebSocket
    // 把 ws message 转换成 EnvironmentEvent
    // emit 到 SystemBus
  }
}
```

### Receptor (Reactor)

监听 EnvironmentEvent，产生 RuntimeEvent：

```typescript
class StreamReceptor implements Reactor {
  start(bus: SystemBus): void {
    bus.on('text_chunk', (e) => {
      bus.emit({ type: 'text_delta', ... });
    });

    bus.on('tool_call', (e) => {
      bus.emit({ type: 'tool_call', ... });
    });
  }
}

class ConversationReceptor implements Reactor {
  start(bus: SystemBus): void {
    bus.on('stream_start', (e) => {
      bus.emit({ type: 'conversation_start', ... });
    });

    bus.on('stream_end', (e) => {
      bus.emit({ type: 'conversation_end', ... });
    });
  }
}
```

### AgentBridge (Reactor)

桥接 Agent 内部事件到 SystemBus：

```typescript
class AgentBridge implements Reactor {
  constructor(private agent: Agent) {}

  start(bus: SystemBus): void {
    // 监听 Agent 内部的 AgentEventBus
    this.agent.on('text_delta', (e) => {
      // 转换成 RuntimeEvent 丢到 SystemBus
      bus.emit({ type: 'text_delta', agentId: this.agent.id, ... });
    });
  }
}
```

## 数据流

### 完整数据流

```
外部世界 (Claude SDK / WebSocket)
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Environment (Reactor)                      │
│                                                                     │
│  Claude SDK 事件 ──转换──▶ EnvironmentEvent                         │
│  - message_start         - text_chunk                               │
│  - content_block_delta   - tool_call                                │
│  - message_stop          - stream_end                               │
└─────────────────────────────────────────────────────────────────────┘
    │
    │ EnvironmentEvent
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            SystemBus                                │
└─────────────────────────────────────────────────────────────────────┘
    │
    ├──────────────────────┬──────────────────────┐
    ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│StreamReceptor│    │ToolReceptor  │    │ConversationR.│
│  (Reactor)   │    │  (Reactor)   │    │  (Reactor)   │
└──────────────┘    └──────────────┘    └──────────────┘
    │                      │                      │
    │ RuntimeEvent         │ RuntimeEvent         │ RuntimeEvent
    ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            SystemBus                                │
└─────────────────────────────────────────────────────────────────────┘
    │
    ├──────────────────────┬──────────────────────┐
    ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│     UI       │    │    Logger    │    │   Monitor    │
│  (订阅者)     │    │   (订阅者)   │    │   (订阅者)   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Agent 内部数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Agent                                    │
│                                                                     │
│   EnvironmentEvent (从 SystemBus 接收)                              │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      AgentEventBus                          │   │
│   │                                                             │   │
│   │   AgentOutput (内部事件)                                    │   │
│   │     │                                                       │   │
│   │     ├──▶ 状态机处理                                         │   │
│   │     ├──▶ 内部组件                                           │   │
│   │     └──▶ AgentBridge ──▶ RuntimeEvent ──▶ SystemBus        │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## SystemBus 接口

```typescript
interface SystemBus {
  /** 发布事件 */
  emit(event: EnvironmentEvent | RuntimeEvent): void;

  /** 订阅特定类型事件 */
  on<T extends string>(
    type: T,
    handler: (event: Extract<EnvironmentEvent | RuntimeEvent, { type: T }>) => void
  ): Unsubscribe;

  /** 订阅所有事件 */
  onAny(handler: (event: EnvironmentEvent | RuntimeEvent) => void): Unsubscribe;

  /** 销毁 */
  destroy(): void;
}
```

## Environment 接口

```typescript
interface Environment extends Reactor {
  /** 环境类型 */
  readonly type: string; // "claude" | "websocket" | "mock"

  /** 向环境发送消息（输入） */
  send(message: UserMessage): Promise<void>;

  /** 中断当前操作 */
  interrupt(): void;
}
```

## Runtime 的职责

Runtime 负责组装所有 Reactor：

```typescript
class NodeRuntime {
  private bus: SystemBus;
  private environment: ClaudeEnvironment;
  private receptors: Reactor[];

  constructor(config: NodeRuntimeConfig) {
    this.bus = new SystemBus();
    this.environment = new ClaudeEnvironment(config);
    this.receptors = [
      new StreamReceptor(),
      new ToolReceptor(),
      new ConversationReceptor(),
      new AgentReceptor(),
      new SessionReceptor(),
      new ErrorReceptor(),
    ];
  }

  start(): void {
    // 启动所有 Reactor
    this.environment.start(this.bus);
    this.receptors.forEach((r) => r.start(this.bus));
  }
}
```

## 实现计划

### Phase 1: 类型定义

1. 定义 `EnvironmentEvent` 类型
2. 定义 `SystemBus` 接口
3. 定义 `Environment` 接口
4. 定义 `Reactor` 接口

### Phase 2: 核心实现

1. 实现 `SystemBus`
2. 实现 `ClaudeEnvironment`（重构现有 ClaudeDriver）
3. 实现各 Receptor

### Phase 3: 集成

1. 重构 `NodeRuntime` 使用新架构
2. 实现 `AgentBridge`
3. 实现 `WebSocketEnvironment`

## 总结

1. **Reactor 模式**：所有组件都是 Reactor，监听事件、转换、产生新事件
2. **两层 Bus**：SystemBus（全局）+ AgentEventBus（Agent 内部）
3. **三类事件**：EnvironmentEvent（外部）→ RuntimeEvent（系统）→ AgentOutput（Agent 内部）
4. **信息交换原则**：EnvironmentEvent 只定义系统需要的，不是外部有什么定义什么
5. **解耦**：所有组件通过 Bus 解耦，可独立测试和替换

## 相关文档

- issues/027-systems-theory-agent-environment.md - 系统论视角
- issues/025-agentx-is-environment.md - AgentX = Environment
- issues/024-environment-events-architecture.md - Environment Events 设计
