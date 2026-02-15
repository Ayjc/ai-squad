# AI Squad

> 你的 AI 战队指挥中心（Tauri + React + 多 AI 协作）

AI Squad 是一个桌面端多 AI 协作应用，把“给不同 AI 分派任务、追踪执行、查看结果”做成可视化看板。

## 项目关键能力

- 多 Provider 角色化管理：Codex / Claude / Gemini / OpenCode / Droid。
- 任务模式支持：
  - `parallel` 并行探索：多个 AI 同时执行同一任务。
  - `pipeline` 流水线：上一步输出会传给下一位 AI。
  - `master` 主从：主 AI 出初稿，协作者审查，主 AI 汇总最终答复。
- 任务结果可持久化：
  - 任务基础信息写入 `tasks` 表。
  - 每个 AI 的执行结果写入 `task_results` 表。
  - 启动时自动读取并合并展示历史结果。
- 历史记录可展开查看每次协作详情：AI、耗时、错误、返回内容。

## 当前技术栈

- 桌面：Tauri 2.x（Rust）
- 前端：React 18 + TypeScript + Vite
- 样式：Tailwind CSS
- 状态管理：Zustand
- 动画：Framer Motion
- 本地存储：SQLite（rusqlite）

## 目录结构

```text
ai-squad/
├── src/                  # 前端
│   ├── pages/            # Overview / Squad / Tasks / History / Settings
│   ├── stores/           # Zustand 状态
│   ├── services/         # Tauri invoke 封装
│   └── types/            # TS 类型定义
├── src-tauri/            # Rust + Tauri
│   ├── src/ccb/          # Provider 调用层（ping/ask/cancel）
│   ├── src/db/           # SQLite 初始化/迁移/查询
│   └── tauri.conf.json
└── docs/
    └── v1-design.md
```

## 环境要求

- Node.js 18+
- npm 9+
- Rust 工具链（`rustup`, `cargo`）
- macOS 下建议安装 Xcode Command Line Tools

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 启动前端开发服务器

```bash
npm run dev
```

默认地址：`http://localhost:1420`

### 3) 启动桌面应用（Tauri）

```bash
source "$HOME/.cargo/env"
npm run tauri dev
```

> 如果你已经把 cargo 加入 PATH，可省略 `source "$HOME/.cargo/env"`。

## 常用命令

```bash
# 代码检查
npm run lint

# 前端构建
npm run build

# Tauri（开发）
npm run tauri dev

# Tauri（打包）
npm run tauri build
```

## 数据库与迁移说明

应用启动时会在系统应用数据目录初始化 SQLite，并自动执行迁移：

- `tasks`：任务主表
- `task_results`：任务执行结果表（按结果唯一键去重）
- 使用 `PRAGMA user_version` 维护迁移版本

## 已实现的关键流程

1. 创建任务（选择模式 + 选择执行 AI）
2. 执行任务（按 `parallel/pipeline/master` 对应策略）
3. 结果入库（任务与结果分别持久化）
4. 历史查看（可展开查看每个 AI 的详细输出）

## 注意事项

- 当前 Provider 调用依赖本机可用的 `ask` / `ping` 命令（来自你的多 AI 工具链环境）。
- 如果 Provider 调用失败，任务会记录错误信息并在历史记录中展示。

## 开发文档

- 设计文档：`docs/v1-design.md`

## License

当前仓库代码按 AGPL-3.0 目标使用（如需严格发布，请补充正式 `LICENSE` 文件）。
