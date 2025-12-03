# AgentX = Environment：Runtime 本质是环境实现

## 核心洞察

AgentX 本质上就是 **Environment（环境）**，而 Runtime 是 **Environment 的不同实现方式**。

```typescript
// 这行代码的本质含义
const agentx = createAgentX(runtime);

// 实际上是
const environment = createEnvironment(environmentImplementation);
```

## 概念统一

### 之前的理解

```
AgentX = 平台 API
Runtime = 运行时（提供 Driver、Repository 等）
```

### 现在的理解

```
AgentX = Environment（环境）
Runtime = Environment 的实现方式
```

## Runtime = Environment 实现

| Runtime          | 环境类型   | 本质                                          |
| ---------------- | ---------- | --------------------------------------------- |
| `node-runtime`   | 真实环境   | Agent 真的在这里运行，产生 Environment Events |
| `server-runtime` | 环境广播器 | 把 Environment Events 通过 SSE 传输出去       |
| `sse-runtime`    | 环境镜像   | 接收 SSE，还原 Environment Events，呈现给 UI  |

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    Environment 层                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AgentX = Environment API                            │   │
│  │                                                      │   │
│  │  - on(event => ...)     // 监听环境事件              │   │
│  │  - containers           // 环境中的容器              │   │
│  │  - sessions             // 环境中的记忆              │   │
│  │  - images               // 环境中的模板              │   │
│  │  - agents               // 环境中的个体              │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           │ 由 Runtime 决定实现             │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Runtime = Environment Implementation                │   │
│  │                                                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │   │
│  │  │ node-runtime │ │server-runtime│ │ sse-runtime  │ │   │
│  │  │              │ │              │ │              │ │   │
│  │  │ 真实环境     │ │ 环境广播器   │ │ 环境镜像     │ │   │
│  │  │ 产生事件     │ │ 传输事件     │ │ 接收事件     │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 事件流转

```
┌─────────────────────────────────────────────────────────────┐
│  Node (node-runtime) - 真实环境                              │
│                                                             │
│  Agent Domain Events (体内)                                 │
│      │                                                      │
│      ▼                                                      │
│  Environment Events (环境层)                                │
│      │                                                      │
│      │  agentx.on((event) => ...)  ← Node 端可以直接监听    │
│      │                                                      │
└──────┼──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Server (server-runtime) - 环境广播器                        │
│                                                             │
│  Environment Events                                         │
│      │                                                      │
│      ▼                                                      │
│  SSE Transport (无脑传输)                                   │
│                                                             │
└──────┼──────────────────────────────────────────────────────┘
       │ SSE
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Browser (sse-runtime) - 环境镜像                            │
│                                                             │
│  SSE Events                                                 │
│      │                                                      │
│      ▼                                                      │
│  Environment Events (还原)                                  │
│      │                                                      │
│      │  agentx.on((event) => ...)  ← Browser 端也能监听     │
│      │                                                      │
│      ▼                                                      │
│  UI React (渲染)                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 同构的本质

"同构"的真正含义：**两端都是 Environment，只是实现不同**

```typescript
// Server 端
const environment = createAgentX(nodeRuntime);
environment.on((event) => {
  console.log("环境中发生了:", event.type);
});

// Browser 端 - 代码完全一样！
const environment = createAgentX(sseRuntime);
environment.on((event) => {
  console.log("环境中发生了:", event.type);
});
```

用户代码不需要关心：

- 事件是本地产生的，还是通过 SSE 接收的
- Agent 是真的在运行，还是只是镜像
- 底层用的是什么传输协议

## 三种 Runtime 的职责

### 1. node-runtime（真实环境）

```typescript
interface NodeRuntime {
  // 创建真实的 Agent
  createDriver(definition, context, sandbox): AgentDriver;
  createSandbox(containerId): Sandbox;

  // 产生真实的 Environment Events
  environment: NodeEnvironment;
}
```

- Agent 真的在这里运行
- Domain Events 在这里产生
- 转换为 Environment Events

### 2. server-runtime（环境广播器）

```typescript
interface ServerRuntime {
  // 把 Environment Events 广播出去
  transport: SSEServerTransport;

  // 监听 NodeEnvironment 的事件并转发
  broadcast(event: EnvironmentEvent): void;
}
```

- 不运行 Agent
- 只负责把 Environment Events 通过 SSE 发出去
- 是 node-runtime 和 sse-runtime 之间的桥梁

### 3. sse-runtime（环境镜像）

```typescript
interface SSERuntime {
  // 接收 SSE 事件
  transport: SSEClientTransport;

  // 还原为 Environment Events
  environment: SSEEnvironment;

  // 转发给 AgentEngine（保持架构）
  driver: EventDriver;
}
```

- 不运行真实 Agent
- 接收 SSE，还原 Environment Events
- 通过 EventDriver 对接 AgentEngine
- 给 UI 提供和 Node 端一样的 API

## 架构影响

### 命名考虑

| 当前命名       | 可能的新命名         | 说明                    |
| -------------- | -------------------- | ----------------------- |
| `AgentX`       | `Environment`        | 更准确，但改动大        |
| `Runtime`      | `EnvironmentRuntime` | 明确 Runtime 是环境实现 |
| `createAgentX` | `createEnvironment`  | 可选，语义更清晰        |

暂时可以保持现有命名，但在概念上理解 **AgentX = Environment**。

### 目录结构建议

```
packages/
├── types/
│   └── src/
│       ├── agent/           # Agent (系统/个体)
│       │   └── event/       # Domain Events (体内)
│       │
│       └── environment/     # Environment (环境)
│           ├── event/       # Environment Events
│           ├── container/
│           ├── session/
│           └── ...
│
├── agentx/                  # AgentX = Environment API
│   └── src/
│       ├── environment/     # Environment 实现
│       │   ├── NodeEnvironment.ts
│       │   └── SSEEnvironment.ts
│       └── ...
│
├── node-runtime/            # 真实环境实现
├── server-runtime/          # 环境广播器（可能合并到 agentx/server）
└── sse-runtime/             # 环境镜像（可能合并到 agentx/runtime/sse）
```

## 总结

1. **AgentX = Environment** - 平台 API 本质上是环境的 API
2. **Runtime = Environment 实现** - 不同 Runtime 是环境的不同实现方式
3. **node-runtime = 真实环境** - 产生 Environment Events
4. **server-runtime = 广播器** - 传输 Events
5. **sse-runtime = 镜像** - 接收并还原 Events

这个理解让整个架构更加统一和清晰。

## 相关文档

- issues/024-environment-events-architecture.md - Environment Events 设计
- issues/022-runtime-agentx-isomorphic-architecture.md - 同构架构设计
