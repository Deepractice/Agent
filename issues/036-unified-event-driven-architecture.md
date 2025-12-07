# Issue 036: Unified Event-Driven Architecture

## Summary

统一 AgentX 的事件驱动架构，移除 Mirror 层，将 WebSocket 作为总线延伸。

## 背景

当前架构存在问题：

1. **两套机制打架**
   - API 调用：直接调用 MirrorRuntime.containers.create()
   - 状态同步：收到 server 的 response 事件后更新本地状态

2. **状态重叠风险**
   - Mirror 有自己的状态（MirrorContainer, MirrorAgent）
   - Source 也有状态
   - 两边状态可能不一致

3. **复杂的 Mirror 层**
   - MirrorRuntime
   - MirrorContainer
   - MirrorAgent
   - MirrorImage
   - 每个都需要维护自己的状态

## 核心洞察

**Mirror = WebSocket 总线延伸**

Mirror 本质上就是把系统总线通过 WebSocket 延伸到远程。它不需要自己的状态管理，只需要：

- 把本地 Request 事件发到 Server
- 把 Server 的 Response/Stream 事件转发到本地

## 新架构

### 统一事件驱动

```
┌─────────────────────────────────────────────────────────────────┐
│                          AgentX                                   │
│                                                                   │
│  所有操作 → 发 Request 事件                                        │
│                 │                                                 │
│     ┌───────────┴───────────┐                                     │
│     │                       │                                     │
│     ▼                       ▼                                     │
│  Source 模式             Mirror 模式                               │
│  (本地 Runtime)          (WebSocket → Server)                      │
│     │                       │                                     │
│     ▼                       ▼                                     │
│  直接处理              转发给 Server                               │
│     │                       │                                     │
│     └───────────┬───────────┘                                     │
│                 │                                                 │
│                 ▼                                                 │
│        Response/Stream 事件                                       │
│                 │                                                 │
│                 ▼                                                 │
│        agentx.on() 订阅                                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 外部观测原则

系统内部所有信息通过事件驱动，外部只能通过事件观测：

```typescript
// 观测状态变化
agentx.on("agent_state_change", (e) => {
  console.log(`${e.context?.agentId}: ${e.data.prev} → ${e.data.current}`);
});

// 观测生命周期
agentx.on("agent_lifecycle", (e) => {
  console.log(`${e.context?.agentId}: ${e.data.lifecycle}`);
});

// 观测输出
agentx.on("text_delta", (e) => {
  process.stdout.write(e.data.text);
});
```

### Agent 接口极简化

```typescript
interface Agent {
  readonly id: string;
  readonly containerId: string;
  receive(message: string): Promise<void>;
}
```

不暴露 state、lifecycle 等属性，全部通过事件观测。

## 架构简化

### 之前

```
AgentX
  └── MirrorRuntime (状态管理)
        └── MirrorContainer (状态管理)
              └── MirrorAgent (状态管理)
                    └── WebSocket
                          └── Server
```

### 之后

```
AgentX
  ├── Source 模式 → 本地 Runtime
  └── Mirror 模式 → WebSocket → Server
```

Mirror 模式下，AgentX 直接：

1. 建立 WebSocket 连接
2. 发送 Request 事件
3. 接收 Response/Stream 事件
4. 分发给订阅者

## 实施计划

### Phase 1: 事件定义

定义所有操作的 Request/Response 事件：

```typescript
// Container
container_create_request / container_create_response;
container_get_request / container_get_response;
container_list_request / container_list_response;

// Agent
agent_run_request / agent_run_response;
agent_receive_request / agent_receive_response;
agent_destroy_request / agent_destroy_response;

// Image
image_snapshot_request / image_snapshot_response;
image_get_request / image_get_response;
image_list_request / image_list_response;
image_delete_request / image_delete_response;
image_resume_request / image_resume_response;
```

### Phase 2: AgentX 重构

1. Source 模式：本地 Runtime 处理 Request，发 Response
2. Mirror 模式：WebSocket 转发 Request，接收 Response

### Phase 3: 移除 Mirror 包

删除：

- `@agentxjs/mirror`
- MirrorRuntime
- MirrorContainer
- MirrorAgent
- MirrorImage

### Phase 4: Server 端适配

Server 端：

1. 接收 WebSocket Request 事件
2. 调用本地 Runtime
3. 返回 Response/Stream 事件

## 优势

1. **架构简单** - 没有 Mirror 状态管理层
2. **一致性** - 不存在状态同步问题
3. **统一观测** - 所有信息通过事件获取
4. **类型安全** - 事件类型静态检查
5. **易于扩展** - 加 filter/map 等响应式操作符

## 相关文件

- `packages/types/src/agentx/` - AgentX 类型定义
- `packages/types/src/event/mirror/` - Mirror 事件定义（需重构为通用 Request/Response）
- `packages/agentx/` - AgentX 实现
- `packages/mirror/` - 待删除

## 备注

这个重构是一个重大架构变更，需要分阶段实施。当前已完成 AgentX API 设计，下一步是事件定义和实现。
