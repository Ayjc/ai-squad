// Task 类型定义

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskMode = 'parallel' | 'pipeline' | 'master';

export interface TaskResult {
  agentId: string;               // 执行的 agent
  content: string;               // 返回内容 (Markdown)
  startedAt: Date;               // 开始时间
  completedAt: Date;             // 完成时间
  success: boolean;              // 是否成功
  error?: string;                // 错误信息
}

export interface Task {
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

// 工作模式说明
export const TASK_MODE_INFO: Record<TaskMode, { label: string; icon: string; description: string }> = {
  parallel: {
    label: '并行探索',
    icon: '⚡',
    description: '同一任务发给多个 AI，比较不同方案',
  },
  pipeline: {
    label: '流水线',
    icon: '🔗',
    description: 'AI-A 完成 → AI-B 继续 → AI-C 审核',
  },
  master: {
    label: '主从',
    icon: '👑',
    description: '主 AI 做核心工作，其他 AI 咨询/验证',
  },
};

// 任务状态说明
export const TASK_STATUS_INFO: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: '等待中', color: 'text-text-secondary' },
  running: { label: '执行中', color: 'text-warning' },
  completed: { label: '已完成', color: 'text-success' },
  failed: { label: '失败', color: 'text-error' },
  cancelled: { label: '已取消', color: 'text-text-secondary' },
};
