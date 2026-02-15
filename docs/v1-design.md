# AI Squad - v1 设计文档

> 创建时间: 2026-02-15
> 状态: 设计阶段

## 一、产品概述

### 1.1 产品名称
**AI Squad** - 你的 AI 战队指挥中心

### 1.2 一句话定位
一个游戏化的多 AI 协作桌面客户端，让指挥 AI 团队像玩策略游戏一样有趣。

### 1.3 背景与目标

**背景:**
- 现有项目 [claude_code_bridge](/Users/alexyuan/Desktop/Study/claude_code_bridge) (CCB) 是一个强大的多 AI 协作 CLI 工具
- CCB 支持 Codex、Claude、Gemini、OpenCode、Droid 等多个 AI provider
- 用户希望有一个更直观、更有趣的游戏化 UI 界面

**目标:**
- 将 CCB 的能力从终端延伸到桌面应用
- 提供游戏化的用户体验，增加趣味性和成就感
- 支持多种工作模式：并行探索、流水线协作、主从模式

### 1.4 迭代策略

采用**平衡迭代策略**，每版都有功能和游戏化增量：

| 版本 | 重点 | 核心特性 |
|------|------|---------|
| **v1** | 核心功能 + 基础游戏化 | 能用 + 角色外观 + 进度可视化 |
| **v2** | 成长系统 | 经验值、统计数据、成就徽章 |
| **v3** | 深度玩法 | 技能树、任务副本、团队/分享 |

---

## 二、v1 功能范围

### 2.1 核心功能 (P0)

| 功能模块 | 描述 |
|---------|------|
| **AI 角色管理** | 每个 AI 显示为角色卡片，有头像、名称、状态 |
| **任务系统** | 向单个或多个 AI 发送任务，显示执行状态和进度 |
| **结果查看** | 查看 AI 的回复，支持 Markdown 渲染 |

### 2.2 游戏化元素 (P1)

| 功能模块 | 描述 |
|---------|------|
| **工作模式** | 支持并行探索、流水线、主从三种基本模式 |
| **角色外观** | 每个 AI 有独特配色和简单动画效果 |
| **进度可视化** | 任务执行时有进度动画、完成有成功特效 |

### 2.3 不在 v1 范围

- 经验值/升级系统 (v2)
- 技能树 (v3)
- 成就分享 (v3)
- 团队协作功能 (v3)

---

## 三、技术架构

### 3.1 技术栈

| 层级 | 技术 | 理由 |
|------|------|------|
| **桌面框架** | Tauri 2.x | 轻量 (3MB)、Rust 后端性能好、安全 |
| **前端框架** | React 18 + TypeScript | 生态丰富、类型安全、招人容易 |
| **样式方案** | Tailwind CSS + shadcn/ui | 快速开发、一致性高 |
| **状态管理** | Zustand | 轻量、简单、支持持久化 |
| **动画库** | Framer Motion | React 生态最强动画库，游戏化效果必备 |
| **图标** | Lucide React | 风格统一、可定制 |
| **本地存储** | SQLite (via Tauri) | 存任务历史、统计数据，用户无感知 |

### 3.2 项目结构

```
ai-squad/
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── main.rs               # Tauri 入口
│   │   ├── ccb/                  # CCB 集成层
│   │   │   ├── mod.rs
│   │   │   ├── provider.rs       # AI provider 管理
│   │   │   ├── task.rs           # 任务调度
│   │   │   └── monitor.rs        # 状态监控
│   │   └── db/                   # SQLite 操作
│   │       ├── mod.rs
│   │       └── schema.sql
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # React 前端
│   ├── components/
│   │   ├── AgentCard/            # AI 角色卡片
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentAvatar.tsx
│   │   │   └── AgentStatus.tsx
│   │   ├── TaskPanel/            # 任务面板
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskList.tsx
│   │   │   └── TaskCreateDialog.tsx
│   │   ├── ResultView/           # 结果展示
│   │   │   ├── ResultViewer.tsx
│   │   │   └── MarkdownRenderer.tsx
│   │   └── Layout/               # 布局组件
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── DetailPanel.tsx
│   ├── pages/
│   │   ├── Overview.tsx          # 概览页
│   │   ├── Squad.tsx             # 战队页
│   │   ├── Tasks.tsx             # 任务页
│   │   └── History.tsx           # 历史页
│   ├── stores/                   # Zustand stores
│   │   ├── agentStore.ts
│   │   ├── taskStore.ts
│   │   └── settingsStore.ts
│   ├── hooks/                    # 自定义 hooks
│   │   ├── useAgents.ts
│   │   ├── useTasks.ts
│   │   └── useCCB.ts
│   ├── services/                 # API 调用层
│   │   ├── ccbService.ts
│   │   └── storageService.ts
│   ├── types/                    # TypeScript 类型
│   │   ├── agent.ts
│   │   ├── task.ts
│   │   └── common.ts
│   ├── styles/                   # 全局样式
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
│
├── docs/                         # 文档
│   └── v1-design.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

### 3.3 与 CCB 的集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Squad (Tauri App)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   React UI  ←→  Zustand Store  ←→  Tauri Commands (Rust)   │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Socket / FIFO (复用 CCB 协议)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              CCB Daemon Layer (现有，不修改)                 │
│                                                             │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│   │  askd   │ │  caskd  │ │  gaskd  │ │  oaskd  │ ...     │
│   └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI Providers                             │
│                                                             │
│     Codex      Claude      Gemini      OpenCode    Droid   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**集成要点:**

1. **复用 CCB 通信协议** - 不重复造轮子，通过 Socket/FIFO 与现有 daemon 通信
2. **GUI 与 CLI 共存** - 用户可以同时使用终端和桌面应用
3. **渐进式迁移** - 不改动 CCB 核心代码，AI Squad 作为独立客户端

**通信接口设计:**

```typescript
// services/ccbService.ts
interface CCBService {
  // Provider 管理
  getProviders(): Promise<Provider[]>;
  connectProvider(id: string): Promise<void>;
  disconnectProvider(id: string): Promise<void>;

  // 任务操作
  sendTask(providerId: string, task: TaskInput): Promise<string>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  getTaskResult(taskId: string): Promise<TaskResult>;
  cancelTask(taskId: string): Promise<void>;

  // 状态监控
  subscribeToStatus(callback: (status: SystemStatus) => void): () => void;
}
```

---

## 四、UI 设计

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────┐  AI Squad                        ─ □ ×  │  标题栏  │
├──┴─────┴────────────────────────────────────────────────────┤
│         │                                    │              │
│  侧边栏  │          主内容区                   │   详情面板   │
│         │                                    │              │
│  ○ 概览  │   ┌─────────────────────────┐     │  任务详情    │
│  ○ 战队  │   │                         │     │  或          │
│  ○ 任务  │   │    页面内容             │     │  角色详情    │
│  ○ 历史  │   │                         │     │              │
│  ○ 设置  │   └─────────────────────────┘     │              │
│         │                                    │              │
├─────────┴────────────────────────────────────┴──────────────┤
│  状态栏: ● Codex 在线  ● Claude 在线  ○ Gemini 离线         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 四个主要页面

#### 页面 1: 概览 (Overview)

```
┌─────────────────────────────────────────────────────────────┐
│  概览                                        [快速任务 +]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  战队状态   │  │  今日任务   │  │  总战力     │         │
│  │  3/4 在线   │  │  12 个      │  │  ⚔️ 2,450  │         │
│  │  ●●●○      │  │  8 完成     │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│  战队状态                          最近活动                 │
│  ┌─────────────────────────────┐  ┌─────────────────────┐  │
│  │                             │  │ 10:32 Codex 完成任务 │  │
│  │   ┌───┐  ┌───┐  ┌───┐     │  │ 10:28 Claude 回复   │  │
│  │   │ C │  │ G │  │ O │     │  │ 10:15 新任务分配    │  │
│  │   └───┘  └───┘  └───┘     │  │ ...                 │  │
│  │    ●       ●       ○       │  └─────────────────────┘  │
│  │  Claude  Gemini  OpenCode  │                           │
│  │                             │                           │
│  │   ┌───┐                    │                           │
│  │   │ D │  待命中...         │                           │
│  │   └───┘                    │                           │
│  │  Codex                     │                           │
│  └─────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**功能要点:**
- 战队状态卡片: 显示在线/离线数量
- 今日任务卡片: 任务总数和完成数
- 总战力卡片: 战队综合评分 (v1 基于任务完成数)
- 战队状态区: 所有角色缩略图和状态
- 最近活动: 实时活动日志

**交互:**
- 点击角色头像 → 右侧显示角色详情
- 点击"快速任务" → 弹出任务创建对话框
- 实时更新在线状态和活动日志

#### 页面 2: 战队 (Squad)

```
┌─────────────────────────────────────────────────────────────┐
│  战队管理                              [+ 添加角色] [设置]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐│
│  │  ┌────────────┐  │ │  ┌────────────┐  │ │ ┌──────────┐ ││
│  │  │   🤖       │  │ │  │   🧠       │  │ │ │   🔷     │ ││
│  │  └────────────┘  │ │  └────────────┘  │ │ └──────────┘ ││
│  │                  │ │                  │ │              ││
│  │  Codex           │ │  Claude          │ │  Gemini      ││
│  │  ⚔️ 等级 12     │ │  ⚔️ 等级 15      │ │  ⚔️ 等级 8   ││
│  │                  │ │                  │ │              ││
│  │  ● 在线 · 空闲   │ │  ● 在线 · 工作中 │ │  ○ 离线      ││
│  │  ████████░░ 80% │ │  ██████████ 100%│ │  ░░░░░░░░░░  ││
│  │                  │ │  📝 正在分析...  │ │              ││
│  │  [分配任务]      │ │  [查看进度]      │ │  [连接]      ││
│  └──────────────────┘ └──────────────────┘ └──────────────┘│
│                                                             │
│  ┌──────────────────┐ ┌──────────────────┐                 │
│  │  OpenCode        │ │  Droid           │   [+ 添加更多]  │
│  │  ⚔️ 等级 6      │ │  ⚔️ 等级 4       │                 │
│  │  ● 在线 · 空闲   │ │  ● 在线 · 空闲   │                 │
│  │  [分配任务]      │ │  [分配任务]      │                 │
│  └──────────────────┘ └──────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**角色卡片信息:**

| 元素 | 说明 |
|------|------|
| 头像 | 每个 AI 有独特的图标/配色 |
| 名称 | Codex / Claude / Gemini / OpenCode / Droid |
| 等级 | 基于完成任务数量 (v1 简单算法) |
| 状态 | 在线/离线 + 空闲/工作中 |
| 状态条 | 当前任务进度 或 能量条 |
| 操作按钮 | 分配任务 / 查看进度 / 连接 |

**状态动画效果:**
- 在线空闲: 轻微呼吸动画
- 工作中: 状态条流动 + 头像微动
- 离线: 灰化 + 静止

#### 页面 3: 任务 (Tasks)

```
┌─────────────────────────────────────────────────────────────┐
│  任务中心                              [+ 新建任务]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  工作模式:  [⚡ 并行探索] [🔗 流水线] [👑 主从]      │   │
│  │                                                     │   │
│  │  当前: 并行探索 - 同时向多个 AI 提问，比较方案       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │ 等待中 (2) │ │ 执行中 (1) │ │ 已完成 (5) │ │ 失败 (0) ││
│  ├────────────┤ ├────────────┤ ├────────────┤ ├──────────┤│
│  │ ┌────────┐ │ │ ┌────────┐ │ │ ┌────────┐ │          ││
│  │ │分析登录│ │ │ │优化数据│ │ │ │重构API │ │          ││
│  │ │模块bug │ │ │ │库查询  │ │ │ │接口    │ │          ││
│  │ │        │ │ │ │██████░░│ │ │ │✓ 完成  │ │          ││
│  │ │Claude  │ │ │ │  65%   │ │ │ │Codex   │ │          ││
│  │ │Gemini │ │ │ │        │ │ │ │        │ │          ││
│  │ └────────┘ │ │ │Codex   │ │ │ └────────┘ │          ││
│  │            │ │ │⚡执行中│ │ │            │          ││
│  │ ┌────────┐ │ │ └────────┘ │ │ ┌────────┐ │          ││
│  │ │设计用户│ │ │            │ │ │实现推荐│ │          ││
│  │ │界面    │ │ │            │ │ │算法    │ │          ││
│  │ │Droid   │ │ │            │ │ │✓ 完成  │ │          ││
│  │ └────────┘ │ │            │ │ │Gemini │ │          ││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**工作模式说明:**

| 模式 | 图标 | 说明 |
|------|------|------|
| 并行探索 | ⚡ | 同一任务发给多个 AI，比较不同方案 |
| 流水线 | 🔗 | AI-A 完成 → AI-B 继续 → AI-C 审核 |
| 主从 | 👑 | 主 AI 做核心工作，其他 AI 咨询/验证 |

**任务卡片状态:**

```
执行中任务卡片:
┌────────────────────┐
│ 🔧 优化数据库查询   │  ← 任务标题
│                    │
│ ██████████░░ 65%   │  ← 进度条 (流动动画)
│                    │
│ ┌────┐             │
│ │ 🤖 │ Codex       │  ← 执行者
│ └────┘             │
│                    │
│ ⚡ 执行中 · 2m 30s  │  ← 状态 + 耗时
│                    │
│ [查看] [取消]       │  ← 操作
└────────────────────┘

已完成任务卡片:
┌────────────────────┐
│ ✓ 重构API接口      │
│                    │
│ ✓ 完成             │
│                    │
│ ┌────┐             │
│ │ 🧠 │ Claude      │
│ └────┘             │
│                    │
│ ✓ 完成 · 5m 30s    │
│                    │
│ [查看结果]          │
└────────────────────┘
```

**新建任务对话框:**

```
┌─────────────────────────────────────────┐
│  新建任务                          [×]  │
├─────────────────────────────────────────┤
│                                         │
│  任务标题                               │
│  ┌───────────────────────────────────┐  │
│  │ 优化用户查询性能                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  任务描述                               │
│  ┌───────────────────────────────────┐  │
│  │                                   │  │
│  │  分析当前查询瓶颈，               │  │
│  │  提供优化建议...                  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  工作模式                                │
│  ○ 并行探索  ○ 流水线  ● 主从          │
│                                         │
│  分配角色                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ ☑  │ │ ☐  │ │ ☑  │ │ ☐  │      │
│  │Codex│ │Claude│ │Gemini│ │Droid│      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│                                         │
│         [取消]        [创建任务]        │
└─────────────────────────────────────────┘
```

**交互要点:**
- 拖拽卡片可改变状态
- 点击卡片 → 右侧详情面板显示完整信息
- 任务完成时播放成功动画 ✨
- 失败任务可重试

#### 页面 4: 历史 (History)

```
┌─────────────────────────────────────────────────────────────┐
│  历史记录                                        [导出 📥]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔍 搜索任务...     │ 筛选: [全部 ▼] [今天 ▼]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐│
│  │ 总任务     │ │ 完成率     │ │ 平均耗时   │ │ 最佳拍档 ││
│  │    128     │ │   94%      │ │   3m 42s   │ │  Claude  ││
│  │  📈 +12%   │ │  📈 +5%    │ │  📉 -30s   │ │  48次协作││
│  └────────────┘ └────────────┘ └────────────┘ └──────────┘│
│                                                             │
│  今天                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ 10:32  优化数据库查询        Codex     2m 15s  ✓  │   │
│  │   分析了查询性能瓶颈，建议添加索引...               │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ✓ 10:15  重构API接口          Claude    5m 30s  ✓  │   │
│  │   将 REST 接口改为 GraphQL，提升灵活性...           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  成就墙 (v1 预览)                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ 🏆  │ │ ⚡  │ │ 🎯  │ │ 🔥  │ │ 🔒  │            │
│  │ 首胜 │ │ 连击 │ │ 精准 │ │ 火热 │ │ ???  │            │
│  │ 已解锁│ │x5   │ │ 已解锁│ │x10  │ │ 未解锁│            │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**成就系统 (v1 简单版):**

| 成就 | 图标 | 解锁条件 |
|------|------|---------|
| 首胜 | 🏆 | 完成第一个任务 |
| 连击 x5 | ⚡ | 连续完成 5 个任务 |
| 精准 | 🎯 | 任务一次成功率 100% (10个以上) |
| 火热 | 🔥 | 单日完成 10+ 任务 |
| 协作大师 | 🤝 | 使用 3 个以上 AI 完成任务 |

---

## 五、视觉风格

### 5.1 整体风格定位

**关键词:** 科技感 · 暗色系 · 霓虹点缀 · 清爽克制

**设计原则:**
- 克制有质感，像高端工具
- 不花哨，避免页游感
- 开发者友好的暗色主题

### 5.2 配色方案

#### 主色调

| 用途 | 色值 | 名称 |
|------|------|------|
| 背景层 | `#0D1117` | 深空黑 |
| 卡片层 | `#161B22` | 深灰 |
| 边框层 | `#30363D` | 边框灰 |
| 文字主色 | `#E6EDF3` | 亮白 |
| 文字次色 | `#8B949E` | 次级灰 |

#### 功能色

| 用途 | 色值 | 名称 |
|------|------|------|
| 主强调色 | `#58A6FF` | 科技蓝 |
| 成功 | `#3FB950` | 翠绿 |
| 警告 | `#D29922` | 琥珀 |
| 错误 | `#F85149` | 珊瑚红 |

#### AI 角色专属配色

| AI Provider | 色值 | 来源 |
|-------------|------|------|
| Codex | `#10A37F` | OpenAI 绿 |
| Claude | `#D97706` | Anthropic 橙 |
| Gemini | `#4285F4` | Google 蓝 |
| OpenCode | `#8B5CF6` | 紫色 |
| Droid | `#EC4899` | 粉红 |

### 5.3 字体方案

| 用途 | 字体 | 备选 |
|------|------|------|
| 标题 | Inter (600/700) | system-ui |
| 正文 | Inter (400) | -apple-system |
| 代码/ID | JetBrains Mono | Fira Code |
| 数字统计 | Tabular Numerals | 等宽数字 |

### 5.4 动画风格

| 场景 | 动画效果 | 时长 |
|------|---------|------|
| 页面切换 | 淡入 + 轻微上移 | 200ms |
| 卡片悬停 | 微微上浮 + 边框亮起 | 150ms |
| 状态变化 | 颜色渐变过渡 | 300ms |
| 任务完成 | 成功图标弹出 + 绿色光晕 | 400ms |
| 进度条 | 流动渐变动画 | 持续 |
| 角色呼吸 | 在线状态轻微发光脉动 | 2s 循环 |

**动画原则:** 快速、流畅、有反馈感，但不打扰

---

## 六、数据模型

### 6.1 核心类型定义

```typescript
// types/agent.ts
interface Agent {
  id: string;                    // provider id: codex, claude, gemini, etc.
  name: string;                  // 显示名称
  displayName: string;           // 完整名称 e.g. "OpenAI Codex"
  avatar: string;                // 头像 URL 或 emoji
  color: string;                 // 专属配色
  status: AgentStatus;           // 在线状态
  level: number;                 // 等级 (基于任务数计算)
  experience: number;            // 经验值
  tasksCompleted: number;        // 完成任务数
  currentTask?: string;          // 当前任务 ID
}

type AgentStatus =
  | 'online'      // 在线空闲
  | 'working'     // 工作中
  | 'offline';    // 离线

// types/task.ts
interface Task {
  id: string;                    // 任务唯一 ID
  title: string;                 // 任务标题
  description: string;           // 任务描述
  status: TaskStatus;            // 任务状态
  mode: TaskMode;                // 工作模式
  assignees: string[];           // 分配的 agent ids
  createdAt: Date;               // 创建时间
  startedAt?: Date;              // 开始时间
  completedAt?: Date;            // 完成时间
  progress: number;              // 进度 0-100
  results: TaskResult[];         // 执行结果
}

type TaskStatus =
  | 'pending'     // 等待中
  | 'running'     // 执行中
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'cancelled';  // 已取消

type TaskMode =
  | 'parallel'    // 并行探索
  | 'pipeline'    // 流水线
  | 'master';     // 主从

interface TaskResult {
  agentId: string;               // 执行的 agent
  content: string;               // 返回内容 (Markdown)
  startedAt: Date;               // 开始时间
  completedAt: Date;             // 完成时间
  success: boolean;              // 是否成功
  error?: string;                // 错误信息
}

// types/common.ts
interface SystemStatus {
  agents: AgentStatusInfo[];
  activeTasks: number;
  queueLength: number;
}

interface AgentStatusInfo {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  lastActivity?: Date;
}
```

### 6.2 数据库 Schema (SQLite)

```sql
-- tasks 表
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'parallel',
  assignees TEXT NOT NULL,  -- JSON array
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- task_results 表
CREATE TABLE task_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT,
  success BOOLEAN DEFAULT FALSE,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- agent_stats 表
CREATE TABLE agent_stats (
  agent_id TEXT PRIMARY KEY,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  total_time_ms INTEGER DEFAULT 0
);

-- achievements 表
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  unlocked_at TIMESTAMP,
  progress INTEGER DEFAULT 0
);
```

---

## 七、存储策略

### 7.1 存储架构

```
┌─────────────────────────────────────────────────┐
│                  Storage Interface              │
│            (统一的存储抽象层)                    │
├─────────────────────┬───────────────────────────┤
│   LocalStorage      │      CloudStorage         │
│   (SQLite)          │   (未来: 云端 API)         │
│   v1 使用            │   v2/v3 按需启用          │
└─────────────────────┴───────────────────────────┘
```

### 7.2 各版本存储策略

| 版本 | 存储方式 | 适用场景 |
|------|---------|---------|
| **v1** | SQLite 本地 | 个人使用、离线可用、零配置 |
| **v2** | SQLite + 可选云同步 | 多设备、数据备份 |
| **v3** | 混合模式 | 团队协作、共享战绩 |

### 7.3 数据库文件位置

| 系统 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/ai-squad/data.db` |
| Windows | `%APPDATA%/ai-squad/data.db` |
| Linux | `~/.local/share/ai-squad/data.db` |

**注意:** SQLite 是嵌入式的，用户无需安装，应用启动时自动创建数据库文件。

---

## 八、与 claude_code_bridge 的集成

### 8.1 CCB 项目概述

**项目位置:** `/Users/alexyuan/Desktop/Study/claude_code_bridge`

**核心功能:**
- 多 AI provider 支持 (Codex, Claude, Gemini, OpenCode, Droid)
- 终端分屏界面 (tmux / WezTerm)
- 任务队列和状态监控
- 统一通信协议

**关键文件:**
- `ccb` - 主入口脚本
- `lib/askd/` - 统一守护进程
- `lib/*_comm.py` - 各 AI 通信模块
- `lib/ccb_protocol.py` - 通信协议定义

### 8.2 复用 CCB 组件

| CCB 组件 | AI Squad 复用方式 |
|----------|------------------|
| `lib/askd/daemon.py` | 通过 Socket 通信，不修改 |
| `lib/ccb_protocol.py` | 复用协议定义 |
| `lib/session_utils.py` | 复用会话管理逻辑 |
| `bin/ask`, `bin/ping`, `bin/pend` | 通过 Tauri Command 调用 |

### 8.3 通信层实现

```rust
// src-tauri/src/ccb/mod.rs

pub mod provider;
pub mod task;
pub mod monitor;

use std::process::Command;

/// 调用 CCB ask 命令
pub fn ask_provider(provider: &str, message: &str) -> Result<String, String> {
    let output = Command::new("ask")
        .arg(provider)
        .arg(message)
        .output()
        .map_err(|e| format!("Failed to execute ask: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// 调用 CCB ping 命令检查状态
pub fn ping_provider(provider: &str) -> Result<bool, String> {
    let output = Command::new("ping")
        .arg(provider)
        .output()
        .map_err(|e| format!("Failed to execute ping: {}", e))?;

    Ok(output.status.success())
}
```

### 8.4 运行要求

AI Squad 运行需要:
1. CCB 已安装并配置 (在 PATH 中可用 `ask`, `ping`, `pend` 命令)
2. 至少一个 AI provider 已配置并可用
3. CCB daemon 服务运行中 (或自动启动)

---

## 九、开发计划

### 9.1 v1 里程碑

| 阶段 | 内容 | 预计产出 |
|------|------|---------|
| **M1** | 项目搭建 | Tauri + React 项目初始化，基础路由 |
| **M2** | CCB 集成 | 通信层实现，能调用 ask/ping/pend |
| **M3** | 战队页 | 角色卡片、状态显示、动画效果 |
| **M4** | 任务页 | 任务创建、看板视图、进度跟踪 |
| **M5** | 概览页 + 历史页 | 仪表盘、历史记录、统计 |
| **M6** | 打包发布 | 跨平台构建、安装包 |

### 9.2 技术依赖

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "lucide-react": "^0.300.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## 十、附录

### 10.1 参考资料

- [Tauri 官方文档](https://tauri.app/)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Framer Motion 动画库](https://www.framer.com/motion/)
- [CCB 项目](/Users/alexyuan/Desktop/Study/claude_code_bridge)

### 10.2 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 桌面框架 | Tauri vs Electron | Tauri 更轻量 (3MB vs 150MB)，性能更好 |
| 前端框架 | React vs Svelte | 生态更丰富，招人容易 |
| 存储方案 | SQLite | 嵌入式，用户无感知，单机体验好 |
| CCB 集成 | 通信复用 | 不修改 CCB，渐进式集成 |
| 迭代策略 | 平衡迭代 | 每版都有功能和游戏化增量 |

---

*文档版本: 1.0*
*最后更新: 2026-02-15*
