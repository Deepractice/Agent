# 简化事件架构 - RuntimeEvent 即 EnvironmentEvent + Context

## 背景

在实现 node-ecosystem 过程中，我们发现 RuntimeEvent 的设计存在冗余。原设计中定义了大量 `*EnvEvent`（如 `TextDeltaEnvEvent`、`MessageStartEnvEvent`），实际上只是 EnvironmentEvent 加了 context 字段。

## 问题分析

### 原设计

```
EnvironmentEvent (text_chunk, stream_start...)
       ↓
    Receptor (转换事件类型)
       ↓
RuntimeEvent (text_delta, message_start... 重复定义)
```

这导致：
1. **类型重复**：`TextChunkEvent` 和 `TextDeltaEnvEvent` 本质相同
2. **事件类型变化**：`text_chunk` → `text_delta`，增加理解成本
3. **维护成本高**：每增加一个 EnvironmentEvent 就要定义对应的 RuntimeEvent

### 新理解

**RuntimeEvent 就是 EnvironmentEvent + context**：

```typescript
interface RuntimeEvent<T, D> extends EnvironmentEvent<T, D> {
  agentId?: string;
  sessionId?: string;
  containerId?: string;
}
```

事件类型不变，只是加了 context 字段。

## 三种事件的职责

### 1. EnvironmentEvent - 外部原始物料

系统从外部世界感知到的信息：

```typescript
type EnvironmentEventType =
  | "text_chunk"      // 文本片段
  | "stream_start"    // 流开始
  | "stream_end"      // 流结束
  | "interrupted"     // 被中断
  | "connected"       // 连接建立
  | "disconnected";   // 连接断开
```

**关键原则**：
- 只定义系统需要的，不是外部有什么定义什么
- 是原始物料，不是组装后的结构

### 2. RuntimeEvent - EnvironmentEvent + Context

就是 EnvironmentEvent 加上运行时上下文：

```typescript
interface RuntimeEvent<T, D> extends EnvironmentEvent<T, D> {
  agentId?: string;     // 哪个 Agent
  sessionId?: string;   // 哪个 Session
  containerId?: string; // 哪个 Container
}
```

**Receptor 的职责**：
- 监听 EnvironmentEvent
- 加上 context 字段
- emit 到 SystemBus
- **不改变事件类型**

### 3. AgentEvent - Agent 内部事件

Agent 内部 Mealy Machine 组装产生的事件：

```typescript
type AgentEvent =
  | StreamEvent      // 流事件 (message_start, text_delta, tool_call...)
  | StateEvent       // 状态事件 (thinking, responding, executing...)
  | MessageEvent     // 消息事件 (user_message, assistant_message...)
  | TurnEvent;       // 轮次事件 (turn_start, turn_end)
```

**关键**：AgentEvent 由 Driver 选择 EnvironmentEvent 驱动 Mealy Machine 产生。

## Driver 的职责

Driver 是 Agent 与外部世界的桥梁：

```
SystemBus (所有 EnvironmentEvent/RuntimeEvent)
    ↓
  Driver (筛选需要的事件)
    ↓
  Agent (Mealy Machine)
    ↓
  AgentEvent (内部组装)
```

Driver 职责：
1. **订阅** SystemBus 上的 RuntimeEvent
2. **筛选** Agent 需要的事件（如 text_chunk, stream_start, stream_end）
3. **驱动** Agent 的 Mealy Machine

## 简化后的数据流

```
外部世界 (Claude SDK)
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ClaudeEnvironment                                 │
│                                                                     │
│  SDK 事件 ────转换────▶ EnvironmentEvent                            │
│  - message_start         - stream_start                             │
│  - content_block_delta   - text_chunk                               │
│  - message_stop          - stream_end                               │
└─────────────────────────────────────────────────────────────────────┘
    │
    │ emit(EnvironmentEvent)
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SystemBus                                  │
└─────────────────────────────────────────────────────────────────────┘
    │
    │ on(type, handler)
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Receptor                                   │
│                                                                     │
│  EnvironmentEvent ───加 context───▶ RuntimeEvent                    │
│  - text_chunk (same)      + agentId                                 │
│  - stream_start (same)    + sessionId                               │
│  - stream_end (same)      + containerId                             │
└─────────────────────────────────────────────────────────────────────┘
    │
    │ emit(RuntimeEvent)
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SystemBus                                  │
└─────────────────────────────────────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┬─────────────────┐
    ▼                 ▼                 ▼                 ▼
┌─────────┐    ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Driver  │    │   UI    │      │ Logger  │      │ Monitor │
│(筛选驱动)│    │         │      │         │      │         │
└────┬────┘    └─────────┘      └─────────┘      └─────────┘
     │
     │ 选择需要的事件
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            Agent                                     │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Mealy Machine                             │   │
│   │                                                             │   │
│   │  input (RuntimeEvent) ───处理───▶ output (AgentEvent)       │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 实现变更

### 1. 删除冗余类型

删除 `packages/types/src/ecosystem/event/runtime/stream/` 下的：
- `TextDeltaEnvEvent` - 直接用 `text_chunk`
- `MessageStartEnvEvent` - 直接用 `stream_start`
- `MessageStopEnvEvent` - 直接用 `stream_end`
- `InterruptedEnvEvent` - 直接用 `interrupted`
- 等等...

### 2. 简化 RuntimeEvent

```typescript
// RuntimeEvent 只是加 context 的 EnvironmentEvent
interface RuntimeEvent<T extends string = string, D = unknown>
  extends EnvironmentEvent<T, D> {
  readonly agentId?: string;
  readonly sessionId?: string;
  readonly containerId?: string;
}
```

### 3. 简化 Receptor

```typescript
class Receptor {
  start(bus: SystemBus): void {
    // 监听所有 EnvironmentEvent
    bus.onAny((event) => {
      if (this.isEnvironmentEvent(event)) {
        // 加 context，原样 emit
        bus.emit({
          ...event,
          agentId: this.context.agentId,
          sessionId: this.context.sessionId,
          containerId: this.context.containerId,
        });
      }
    });
  }
}
```

### 4. 实现 Driver

```typescript
class Driver {
  start(bus: SystemBus): void {
    // 只订阅 Agent 需要的事件
    bus.on('text_chunk', (e) => this.agent.process(e));
    bus.on('stream_start', (e) => this.agent.process(e));
    bus.on('stream_end', (e) => this.agent.process(e));
    // ...
  }
}
```

## 总结

| 概念 | 职责 | 事件类型 |
|------|------|---------|
| EnvironmentEvent | 外部原始物料 | text_chunk, stream_start... |
| RuntimeEvent | EnvironmentEvent + context | 同上，加 agentId/sessionId |
| AgentEvent | Agent 内部组装 | message_start, text_delta, state... |
| Receptor | 加 context | 不变事件类型 |
| Driver | 筛选事件驱动 Agent | 选择需要的 RuntimeEvent |

## 相关文档

- issues/028-reactor-pattern-systembus-architecture.md - Reactor 模式
- issues/027-systems-theory-agent-environment.md - 系统论视角
- packages/types/src/ecosystem/event/environment/ - EnvironmentEvent 定义
