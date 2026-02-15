// 通用类型定义

import type { AgentStatus } from './agent';

export interface SystemStatus {
  agents: AgentStatusInfo[];
  activeTasks: number;
  queueLength: number;
}

export interface AgentStatusInfo {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  lastActivity?: Date;
}

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt?: Date;
  progress: number;
  requirement: number;
}

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  successRate: number;
  avgDuration: number;
  bestPartner: string;
  bestPartnerCount: number;
}

export interface CollaborationStat {
  id?: number;
  agentCombo: string;
  mode: string;
  totalTasks: number;
  successCount: number;
  avgDurationMs: number;
  lastUsedAt?: Date;
  createdAt?: Date;
}

// 协作里程碑
export const MILESTONES: Achievement[] = [
  {
    id: 'first_collab',
    name: '初次协作',
    icon: '🤝',
    description: '完成第一次 AI 协作任务',
    progress: 0,
    requirement: 1,
  },
  {
    id: 'synergy_50',
    name: '默契达人',
    icon: '💡',
    description: '任意 AI 默契度达到 50',
    progress: 0,
    requirement: 50,
  },
  {
    id: 'multi_ai',
    name: '多元协作',
    icon: '🌐',
    description: '在同一任务中使用 3 个以上 AI',
    progress: 0,
    requirement: 3,
  },
  {
    id: 'streak_10',
    name: '稳定搭档',
    icon: '🔗',
    description: '连续 10 次任务成功完成',
    progress: 0,
    requirement: 10,
  },
  {
    id: 'all_modes',
    name: '全能指挥',
    icon: '🎯',
    description: '使用过所有三种协作模式',
    progress: 0,
    requirement: 3,
  },
];

export { MILESTONES as ACHIEVEMENTS };
