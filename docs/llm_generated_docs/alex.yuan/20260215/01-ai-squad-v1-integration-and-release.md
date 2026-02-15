# AI Squad v1 联调与发布总结

- 日期: 2026-02-15 19:13
- 类型: 开发
- 项目: ai-squad
- 模块: 前端任务引擎、Tauri invoke、Rust 数据层、工程化与发布
- Issue: N/A
- 状态: 已完成

---

## 任务描述

本次任务目标是把 AI Squad 从原型状态推进到可运行、可构建、可发布状态，并完成 GitHub 公共仓库创建与代码推送。过程中重点解决了构建链路、Tauri/Rust 环境、前后端通信、任务执行模式、历史结果展示与持久化一致性问题。

## 完成内容

- 修复前端 TypeScript 报错与路由缺失问题，使 `npm run build` 可通过。
- 新增 ESLint 配置并修复相关问题，使 `npm run lint` 可执行且通过。
- 接入 Tauri 前端服务层，完成 `get_providers`、`get_tasks`、`ask_provider`、`save_task` 调用封装。
- 打通任务创建与执行流程，支持新建任务并自动执行。
- 实现三种执行策略：`parallel` 并行、`pipeline` 串行传递上下文、`master` 主从审查汇总。
- 在历史页展示任务结果明细，支持展开查看每个 AI 的耗时、错误、输出内容。
- Rust 侧重构 CCB 模块调用关系并清理 dead code warning。
- 修复 Tauri 配置与图标问题，完成 `npm run tauri dev` 启动验证。
- 新增 `task_results` 持久化读写命令，前端读取任务时合并结果表数据。
- 引入 SQLite 迁移（`PRAGMA user_version`），为 `task_results` 增加唯一键与去重逻辑，避免重复写入膨胀。
- 完善 `.gitignore` 与 `README`，补充项目关键能力、启动方式、命令与迁移说明。
- 创建 GitHub 公共仓库并推送 `main` 分支：`https://github.com/Ayjc/ai-squad`。

## 决策记录（渐进）

### 2026-02-15 14:30

决策：先修“可运行性底座”（lint/build/dev）再做功能联调。  
原因：
- 构建链路不稳定时继续叠加功能，回归成本高且定位困难。
- 先确保编译、路由、依赖稳定，可显著降低后续联调复杂度。
备选方案与取舍：
- 未采用“先做功能再集中修构建”，因为会导致错误来源叠加，难以拆分责任边界。

### 2026-02-15 15:00

决策：前端通过 `tauriService` 统一封装 invoke，而不是在页面直接调用。  
原因：
- 统一序列化/反序列化逻辑，避免页面层重复处理日期、状态、字段兼容。
- 便于后续替换为 mock/service worker 或增加重试策略。
备选方案与取舍：
- 未采用“页面直接 invoke”，因为短期快但后期维护成本高、测试困难。

### 2026-02-15 16:30

决策：任务执行采用“调用可并发、落库串行”的策略。  
原因：
- 并发调用可提升吞吐，保留 parallel 模式价值。
- 串行持久化可避免 `delete + rewrite` 引发结果覆盖竞态。
备选方案与取舍：
- 未采用“全并发读写数据库”，因为会有偶发覆盖与顺序不一致问题。

### 2026-02-15 18:40

决策：在 SQLite 中引入 `user_version` 迁移并为 `task_results` 增加 `result_id` 唯一索引。  
原因：
- 保证历史数据兼容升级，不破坏已有本地数据。
- 从存储层防止重复结果写入导致的数据膨胀。
备选方案与取舍：
- 未采用“仅依赖应用层去重”，因为无法覆盖异常重试和并发写场景。

### 2026-02-15 19:05

决策：通过 `gh repo create --public --source=. --push` 一步创建并推送仓库。  
原因：
- 降低手工远程配置错误概率，保证首次发布链路可追溯。
- 同步完成远程设置与分支追踪，便于后续协作。
备选方案与取舍：
- 未采用“手动网页建仓 + 命令行添加 remote”，因为步骤更多、易出现命名或权限错误。

## 修改文件

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| README.md | 修改 | 补充关键能力、启动方式、命令、迁移说明与注意事项 |
| .gitignore | 修改 | 增加 dist/target/环境文件与编辑器缓存忽略规则 |
| .eslintrc.cjs | 新增 | 建立 ESLint 基础规则，打通 lint 流程 |
| src/App.tsx | 修改 | 应用启动时同步 providers/tasks 到 store |
| src/pages/Tasks.tsx | 修改 | 新建任务弹窗、三种执行模式、执行与持久化流程 |
| src/pages/History.tsx | 修改 | 历史统计重算、结果明细展开展示 |
| src/pages/Settings.tsx | 新增 | 补齐 settings 路由占位页面 |
| src/services/tauriService.ts | 新增/修改 | invoke 封装，任务与结果表的读写映射与合并 |
| src/stores/agentStore.ts | 修改 | provider 状态同步到 agent store |
| src/stores/taskStore.ts | 修改 | 增加 setTasks 与结果写入支持 |
| src-tauri/src/main.rs | 修改 | 注册新增 command（结果表读写删除） |
| src-tauri/src/ccb/mod.rs | 修改 | 复用 provider/task 子模块并补 cancel_task command |
| src-tauri/src/ccb/task.rs | 修改 | 清理未使用结构并保留取消接口 |
| src-tauri/src/db/mod.rs | 修改 | 数据表初始化、迁移、task_results 去重与命令实现 |
| src-tauri/Cargo.toml | 修改 | 调整 tauri features 以兼容当前版本 |
| src-tauri/tauri.conf.json | 修改 | 修复图标配置以保证 dev 启动 |

## 技术要点

- Tauri invoke 参数命名采用 camelCase，Rust 侧自动映射 snake_case。
- `task_results` 使用 `result_id` 唯一索引 + UPSERT，保证幂等写入。
- 使用 `PRAGMA user_version` 做增量迁移，避免每次启动重复建索引和重复清洗。
- `parallel/master` 模式中，结果调用可并发但入库串行，规避竞态覆盖。
- 历史页统计从真实任务数据动态计算，不再依赖硬编码演示值。

## 待办事项

- [ ] 为 SQLite 迁移补充自动化测试与回滚策略验证。
- [ ] 将任务执行日志拆分为可追踪 step（便于调试 parallel/pipeline/master 细粒度过程）。
- [ ] 在历史结果中加入 Markdown 渲染和复制导出能力。

## 备注

本次已完成仓库发布：`https://github.com/Ayjc/ai-squad`，默认分支 `main`，可见性 `PUBLIC`。
