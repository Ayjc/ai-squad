// AI Agent 类型定义

export type AgentStatus = 'online' | 'working' | 'offline';

export interface Agent {
  id: string;                    // provider id: codex, claude, gemini, etc.
  name: string;                  // 显示名称
  displayName: string;           // 完整名称 e.g. "OpenAI Codex"
  avatar: string;                // 头像 URL 或 emoji
  color: string;                 // 专属配色
  status: AgentStatus;           // 在线状态
  level: number;                 // 默契度 0-100
  experience: number;            // 协作积分
  tasksCompleted: number;        // 完成任务数
  tasksFailed: number;           // 失败任务数
  currentTask?: string;          // 当前任务 ID
}

// 预定义的 Agent 配置
export const AGENT_CONFIGS: Record<string, Omit<Agent, 'status' | 'level' | 'experience' | 'tasksCompleted' | 'tasksFailed' | 'currentTask'>> = {
  codex: {
    id: 'codex',
    name: 'Codex',
    displayName: 'OpenAI Codex',
    avatar: '🤖',
    color: '#10A37F',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    displayName: 'Anthropic Claude',
    avatar: '🧠',
    color: '#D97706',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    displayName: 'Google Gemini',
    avatar: '🔷',
    color: '#4285F4',
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    displayName: 'OpenCode',
    avatar: '⚡',
    color: '#8B5CF6',
  },
};
