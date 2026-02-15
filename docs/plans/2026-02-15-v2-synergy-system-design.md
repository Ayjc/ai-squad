# AI Squad v2 - 协作默契成长系统设计

> 创建时间: 2026-02-15
> 状态: 已确认

## 一、v2 核心主题

从 v1 的「战斗/竞技」隐喻转向「协作默契成长」。重点放在人与 AI 的协作质量上：默契度、协作偏好记录、AI 特长匹配推荐，弱化游戏化指标。

## 二、术语体系变更

| v1 术语 | v2 术语 | 影响范围 |
|---------|---------|---------|
| 等级 (Level) | 默契度 (Synergy) | AgentCard, agentStore, Squad 页, db schema |
| 战队状态 | 团队状态 | Overview 页统计卡片, 侧边栏 |
| 总战力 | 删除，替换为「最佳搭档」 | Overview 页第三张卡片 |
| 战队管理 | 团队 | Squad 页标题 |
| ⚔️ 图标 | 🤝 或协作图标 | AgentCard, Overview |

## 三、默契度系统

### 3.1 计算模型

每个 AI 的默契度为 0-100 分制，由三个维度加权计算：

| 维度 | 权重 | 数据来源 |
|------|------|---------|
| 使用频率 | 30% | 累计协作次数 + 最近 7 天使用频次 |
| 成功率 | 40% | 任务成功次数 / 总任务数 |
| 平均效率 | 30% | 同类任务中该 AI 的平均耗时排名 |

```typescript
// 默契度计算
const calculateSynergy = (stats: AgentStats): number => {
  const frequencyScore = Math.min(100, stats.recentUsageCount * 5 + stats.totalTasks * 2);
  const successScore = stats.totalTasks > 0 ? (stats.successCount / stats.totalTasks) * 100 : 0;
  const efficiencyScore = stats.avgTimeRank <= 1 ? 100 : Math.max(0, 100 - (stats.avgTimeRank - 1) * 20);
  return Math.round(frequencyScore * 0.3 + successScore * 0.4 + efficiencyScore * 0.3);
};
```

### 3.2 UI 呈现

- AgentCard: `⚔️ 等级 12` → `🤝 默契 78%`
- 进度条: 能量条 → 默契度指示条
  - < 30%: 灰色
  - 30-70%: AI 专属主色
  - > 70%: 主色 + 发光效果
- 新增默契度趋势: 最近 7 天的变化趋势箭头 (↑/↓/→)

## 四、AI 组合化学分析

### 4.1 数据模型

新增 `collaboration_stats` 表：

```sql
CREATE TABLE collaboration_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_combo TEXT NOT NULL,    -- 排序后的 agent ids, 如 "claude,codex"
  mode TEXT NOT NULL,           -- parallel/pipeline/master
  total_tasks INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 最佳搭档卡片

Overview 第三张卡片展示最近效果最好的 AI 组合：
- 显示: `Claude + Codex`
- 副标题: `成功率 95% · 12 次协作`
- 数据来源: collaboration_stats 按 success_rate 排序

## 五、智能推荐

### 5.1 任务创建时推荐

在 Tasks 页创建任务选择 AI 时：
- 根据历史默契度数据，高亮推荐的 AI
- 推荐标签: `推荐` 小标签在 AI 名称旁
- 推荐逻辑: 该 AI 在近期同类任务中默契度最高

### 5.2 模式推荐

根据已选 AI 组合，推荐最适合的协作模式：
- 如果 A+B 在 pipeline 模式下成功率最高 → 推荐 pipeline

## 六、统计仪表盘增强

Overview 页下半部分增强：
- 「团队状态」卡片保留，显示各 AI 缩略图
- 「最近活动」保留，改为真实数据驱动
- 新增: 默契度排行（哪个 AI 默契度最高）
- 新增: 本周协作趋势（简单折线图或柱状图）

## 七、任务拆分

### Codex 负责（逻辑/数据层）:
1. 术语变更: 全局替换代码中的战斗术语
2. 数据库 schema 更新: 新增 collaboration_stats 表, 修改 agent_stats 表
3. agentStore 重构: calculateLevel → calculateSynergy
4. 新增协作数据统计逻辑
5. 智能推荐算法实现

### Claude 负责（UI/UX 层）:
1. 使用 UI/UX Pro Max 进行整体 UI/UX 优化
2. AgentCard 视觉重设计
3. Overview 页面重构
4. 新组件设计与实现
