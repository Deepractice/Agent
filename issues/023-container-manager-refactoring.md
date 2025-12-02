# 023 ContainerManager 重构设计

## 背景

当前 Runtime 层混合了技术概念和业务概念：

- `Container` 接口使用 `ContainerContext`（包含 tenantId、sandbox）
- `ContainerProvisioner` 暴露在 types 包
- Runtime 接口包含 `provisioner` 属性

这导致：

1. 业务层概念（tenant）泄露到技术层
2. 内部实现类型被公开导出
3. 上层调用者需要理解 provisioning 细节

## 设计目标

1. **Runtime 纯技术化**：不包含 tenant 等业务概念
2. **封装内部实现**：Provisioner、ContainerContext 不对外暴露
3. **简化公开 API**：使用简单的 `containerId: string`

## 新设计

### 分层架构

```
┌─────────────────────────────────────────┐
│           业务层 (Application)           │
│  - Tenant 管理                          │
│  - Tenant → Container 映射              │
│  - 调用: containerManager.run(image, containerId) │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│           Runtime 层 (Technical)         │
│  - ContainerManager: Agent 生命周期管理   │
│  - Repository: 数据持久化                │
│  - LoggerFactory: 日志                   │
│  - 内部: Provisioner, ContainerContext   │
└─────────────────────────────────────────┘
```

### 接口定义

#### Runtime (公开)

```typescript
interface Runtime {
  readonly name: string;
  readonly containerManager: ContainerManager;
  readonly repository?: Repository;
  readonly loggerFactory?: LoggerFactory;
}
```

#### ContainerManager (公开)

```typescript
interface ContainerManager {
  /**
   * 从 image 运行 agent
   * @param image - Agent 镜像
   * @param containerId - 容器标识（资源隔离单元）
   */
  run(image: AgentImage, containerId: string): Promise<Agent>;

  /**
   * 从 session 恢复 agent
   * @param session - 会话
   * @param containerId - 容器标识
   */
  resume(session: Session, containerId: string): Promise<Agent>;

  destroy(agentId: string): Promise<void>;
  get(agentId: string): Agent | undefined;
  has(agentId: string): boolean;
  list(): Agent[];
  destroyAll(): Promise<void>;
}
```

#### 内部类型 (不导出)

```typescript
// 在 node-runtime 内部定义，不从 types 导出
interface ContainerContext {
  containerId: string;
  sandbox: Sandbox;
}

// Provisioner 逻辑合并到 ContainerManager 内部
class NodeContainerManager implements ContainerManager {
  private provision(containerId: string): ContainerContext {
    // 创建 workspace, sandbox 等
  }

  async run(image: AgentImage, containerId: string): Promise<Agent> {
    const context = this.provision(containerId);
    // 使用 context 创建 agent
  }
}
```

### 命名约定

| 概念               | 说明                                |
| ------------------ | ----------------------------------- |
| `containerId`      | 技术层资源隔离单元标识              |
| `tenantId`         | 业务层租户标识（在上层管理）        |
| `ContainerManager` | 管理多个容器和 Agent 生命周期       |
| `Sandbox`          | 容器内的运行环境（workspace + llm） |

### 使用示例

```typescript
// 业务层
class TenantService {
  // 1 Tenant → 1 Container 的映射
  getContainerId(tenantId: string): string {
    return `container_${tenantId}`;
  }
}

// 使用
const tenantService = new TenantService();
const runtime = nodeRuntime();

// 运行 agent
const containerId = tenantService.getContainerId("tenant_123");
const agent = await runtime.containerManager.run(image, containerId);
```

## 实现计划

### Phase 1: types 包重构

- [ ] 重命名 `Container` → `ContainerManager`
- [ ] 更新接口签名: `run(image, containerId)`, `resume(session, containerId)`
- [ ] 移除 `ContainerContext`, `ContainerProvisioner` 导出
- [ ] 更新 `Runtime.container` → `Runtime.containerManager`
- [ ] 移除 `Runtime.provisioner`

### Phase 2: node-runtime 重构

- [ ] 重命名 `NodeContainer` → `NodeContainerManager`
- [ ] 将 `NodeContainerProvisioner` 合并到 `NodeContainerManager` 内部
- [ ] 定义内部 `ContainerContext` 类型
- [ ] 更新 `NodeRuntime` 使用 `containerManager`

### Phase 3: agentx 包重构

- [ ] 更新 `AgentManager` 使用 `containerManager`
- [ ] 更新 `ImageManagerImpl` 使用 `containerId`
- [ ] 更新 `SessionManagerImpl` 使用 `containerId`
- [ ] 更新 `SSERuntime` / `RemoteContainerManager`
- [ ] 更新 `createAgentXHandler` 移除 provisioner 使用

### Phase 4: Session 相关

- [ ] 决定 Session 是否保留 `tenantId`（业务层概念）
- [ ] 或改为 `containerId`（技术层）
- [ ] 更新 `SessionRecord` 和相关查询

### Phase 5: UI 包适配

- [ ] 更新 `useSession` hook
- [ ] 更新 `Workspace` 组件

## 讨论记录

### Q: 为什么用 containerId 而不是 tenantId？

A: Runtime 是纯技术层，不应该包含业务概念。`containerId` 是技术标识，表示资源隔离单元。业务层的 tenant 概念和 container 的映射关系应该在上层处理。

### Q: ContainerManager vs Container？

A: `Container` 是具体的资源容器实例（绑定到某个 containerId），`ContainerManager` 是管理这些容器的组件。类似 Docker 的 daemon 管理多个容器。

### Q: 内部类型为什么不导出？

A: 封装实现细节。用户只需要知道 `containerId`，不需要理解 `Sandbox`、`Workspace`、`LLMProvider` 等内部资源是如何组装的。这样可以自由重构内部实现而不影响公开 API。

## 当前状态

部分实现已完成，但存在编译错误。需要完成上述实现计划才能通过 typecheck。

## 相关文件

- `packages/types/src/runtime/container/ContainerManager.ts`
- `packages/types/src/runtime/Runtime.ts`
- `packages/node-runtime/src/NodeRuntime.ts`
- `packages/agentx/src/runtime/sse/SSERuntime.ts`
- `packages/agentx/src/managers/*`
