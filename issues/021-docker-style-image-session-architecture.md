# Docker-style Image/Session 架构重构

## 背景

当前 agentx-ui 在创建 Session 时遇到问题：

- Session 需要 imageId，但 Image 不存在
- 外键约束失败：`FOREIGN KEY constraint failed`
- UI 层直接生成假的 imageId，绕过了 agentx API

根本原因是架构设计不完整，需要完善 Docker-style 分层架构。

## Docker-style 架构对照

```
Docker:
Dockerfile → build → Image → run → Container
                      ↓
              docker commit
                      ↓
               New Image

AgentX:
Definition → [auto] → MetaImage → Session → [commit] → DerivedImage
                                     ↓
                                   Agent
```

## 核心概念：MetaImage（创世镜像）

### MetaImage vs DerivedImage

| 类型         | 描述                            | messages      | parentImageId |
| ------------ | ------------------------------- | ------------- | ------------- |
| MetaImage    | 创世镜像（Definition 自动产生） | 始终为空 `[]` | `null`        |
| DerivedImage | 派生镜像（session.commit 产生） | 包含对话历史  | 必须有        |

### 数据流

```
Definition (模板)
    │
    ├──[register]──→ MetaImage (创世镜像)
    │                    │
    │                    ├──→ Session A ──[commit]──→ DerivedImage A'
    │                    │
    │                    └──→ Session B ──[commit]──→ DerivedImage B'
    │
    └── imageId 规则: `meta_${definitionName}`
```

## 数据结构设计

### AgentImage (Discriminated Union)

```typescript
// MetaImage - 创世镜像
interface MetaImage {
  readonly type: "meta";
  readonly imageId: string; // pattern: meta_${definitionName}
  readonly definitionName: string;
  readonly definition: AgentDefinition;
  readonly config: Record<string, unknown>;
  readonly messages: readonly []; // 始终为空
  readonly createdAt: Date;
}

// DerivedImage - 派生镜像
interface DerivedImage {
  readonly type: "derived";
  readonly imageId: string; // pattern: img_${nanoid()}
  readonly parentImageId: string; // 必须有父镜像
  readonly definitionName: string;
  readonly definition: AgentDefinition;
  readonly config: Record<string, unknown>;
  readonly messages: ImageMessage[]; // 来自 commit
  readonly createdAt: Date;
}

// AgentImage = MetaImage | DerivedImage
type AgentImage = MetaImage | DerivedImage;
```

### ImageRecord (存储层)

```typescript
interface ImageRecord {
  imageId: string;
  type: "meta" | "derived";
  definitionName: string;
  parentImageId: string | null;
  definition: Record<string, unknown>;
  config: Record<string, unknown>;
  messages: Record<string, unknown>[];
  createdAt: Date;
}
```

### Session（用户会话）

```typescript
interface SessionRecord {
  sessionId: string;
  userId: string;
  imageId: string; // 关联 MetaImage 或 DerivedImage
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## API 设计

```typescript
// Definition（内存实现，注册时自动创建 MetaImage）
agentx.definitions.register(definition); // ✅ 已实现
agentx.definitions.get(name); // ✅ 已实现
agentx.definitions.list(); // ✅ 已实现
agentx.definitions.has(name); // ✅ 已实现
agentx.definitions.unregister(name); // ✅ 已实现

// Image（基于 Repository）
agentx.images.get(imageId); // ✅ 已实现
agentx.images.getMetaImage(definitionName); // ✅ 已实现
agentx.images.list(); // ✅ 已实现
agentx.images.listByDefinition(name); // ✅ 已实现
agentx.images.exists(imageId); // ✅ 已实现
agentx.images.delete(imageId); // ✅ 已实现（仅 DerivedImage）

// Session
agentx.sessions.create(imageId, userId); // 已有
session.commit(); // 待实现 → 产生 DerivedImage

// Agent
agentx.agents.run(imageId); // 已有
```

## 已完成的工作

### Phase 1: 类型定义 ✅

- [x] `agentx-types/src/image/MetaImage.ts` - 创世镜像类型
- [x] `agentx-types/src/image/DerivedImage.ts` - 派生镜像类型
- [x] `agentx-types/src/image/AgentImage.ts` - 联合类型
- [x] `agentx-types/src/runtime/repository/record/ImageRecord.ts` - 存储类型更新
- [x] `agentx-types/src/agentx/definition/DefinitionManager.ts` - 定义管理器接口
- [x] `agentx-types/src/agentx/image/ImageManager.ts` - 镜像管理器接口
- [x] `agentx-types/src/agentx/AgentX.ts` - 添加 definitions 和 images

### Phase 2: 实现 ✅

- [x] `agentx/src/managers/definition/DefinitionManagerImpl.ts` - 内存实现
- [x] `agentx/src/managers/image/ImageManagerImpl.ts` - 基于 Repository
- [x] `agentx/src/AgentX.ts` - 集成新管理器
- [x] `agentx-node/src/repository/SQLiteRepository.ts` - Schema 更新

### Phase 3: UI 调整 ✅

- [x] `agentx-ui/src/components/workspace/Workspace.tsx` - 使用 MetaImage

## 待完成的工作

### Phase 4: session.commit()

- [ ] 实现 `session.commit()` 方法
- [ ] 将 Session 当前状态打包成 DerivedImage
- [ ] 保存 DerivedImage（parent.messages + session.messages）
- [ ] 返回新 ImageRecord

### Phase 5: 外键约束

- [ ] 在 SQLite schema 中添加 sessions → images 外键约束
- [ ] 确保创建 Session 时 Image 必须存在

### Phase 6: UI 增强（可选）

- [ ] ImagePane 组件（查看已有镜像列表）
- [ ] "Commit Session" 按钮
- [ ] "Build Image" 功能（从 Definition）
- [ ] 显示 Image 元数据（来源 Definition、创建时间等）

## 验收标准

- [x] Definition 可以注册（自动创建 MetaImage）
- [x] MetaImage 可以查询
- [x] Session 创建时使用 MetaImage
- [ ] Session.commit() 生成 DerivedImage
- [ ] 外键约束正常工作
- [ ] UI 流程完整：Definition → MetaImage → Session → Agent

## 文件变更清单

```
packages/agentx-types/src/
├── image/
│   ├── MetaImage.ts        # 新增
│   ├── DerivedImage.ts     # 新增
│   ├── AgentImage.ts       # 修改（联合类型）
│   └── index.ts            # 修改
├── agentx/
│   ├── definition/
│   │   ├── DefinitionManager.ts  # 新增
│   │   └── index.ts              # 新增
│   ├── image/
│   │   ├── ImageManager.ts       # 新增
│   │   └── index.ts              # 新增
│   ├── AgentX.ts           # 修改（添加 definitions/images）
│   └── index.ts            # 修改
└── runtime/repository/record/
    └── ImageRecord.ts      # 修改（添加 type/parentImageId）

packages/agentx/src/
├── managers/
│   ├── definition/
│   │   ├── DefinitionManagerImpl.ts  # 新增
│   │   └── index.ts                  # 新增
│   ├── image/
│   │   ├── ImageManagerImpl.ts       # 新增
│   │   └── index.ts                  # 新增
│   └── index.ts            # 修改
└── AgentX.ts               # 修改

packages/agentx-node/src/repository/
└── SQLiteRepository.ts     # 修改（schema + 方法）

packages/agentx-ui/src/components/workspace/
└── Workspace.tsx           # 修改（使用 MetaImage）
```

## 参考

- Docker 架构：Dockerfile → Image → Container → docker commit → New Image
- Issue #020: AgentX-UI Image 架构适配
