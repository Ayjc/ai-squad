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

// 预定义成就
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: '首胜',
    icon: '🏆',
    description: '完成第一个任务',
    progress: 0,
    requirement: 1,
  },
  {
    id: 'streak_5',
    name: '连击 x5',
    icon: '⚡',
    description: '连续完成 5 个任务',
    progress: 0,
    requirement: 5,
  },
  {
    id: 'precise',
    name: '精准',
    icon: '🎯',
    description: '任务一次成功率 100% (10个以上)',
    progress: 0,
    requirement: 10,
  },
  {
    id: 'hot',
    name: '火热',
    icon: '🔥',
    description: '单日完成 10+ 任务',
    progress: 0,
    requirement: 10,
  },
  {
    id: 'collaborator',
    name: '协作大师',
    icon: '🤝',
    description: '使用 3 个以上 AI 完成任务',
    progress: 0,
    requirement: 3,
  },
];
