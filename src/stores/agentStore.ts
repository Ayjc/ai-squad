import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent, AgentStatus } from '../types/agent';
import { AGENT_CONFIGS } from '../types/agent';
import type { ProviderRuntimeStatus } from '../services/tauriService';

interface AgentState {
  agents: Agent[];
  initializeAgents: () => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  syncProviderStatuses: (providers: ProviderRuntimeStatus[]) => void;
  incrementTasksCompleted: (id: string) => void;
  incrementTasksFailed: (id: string) => void;
  getOnlineCount: () => number;
  getRecommendedAgents: () => Agent[];
  getSynergyTrend: (id: string) => 'up' | 'down' | 'stable';
}

// 根据协作数据计算默契度
const calculateSynergy = (tasksCompleted: number, tasksFailed: number = 0): number => {
  const total = tasksCompleted + tasksFailed;
  if (total === 0) return 0;
  const frequencyScore = Math.min(100, total * 5);
  const successRate = tasksCompleted / total;
  const successScore = successRate * 100;
  return Math.round(frequencyScore * 0.3 + successScore * 0.4 + frequencyScore * 0.3);
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],

      initializeAgents: () => {
        const agents: Agent[] = Object.values(AGENT_CONFIGS).map((config) => ({
          ...config,
          status: 'offline' as AgentStatus,
          level: 0,
          experience: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
        }));
        set({ agents });
      },

      updateAgentStatus: (id, status) => {
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id ? { ...agent, status } : agent
          ),
        }));
      },

      syncProviderStatuses: (providers) => {
        const providerMap = new Map(providers.map((provider) => [provider.id, provider]));
        set((state) => ({
          agents: state.agents.map((agent) => {
            const provider = providerMap.get(agent.id);
            if (!provider) return agent;

            const status: AgentStatus = !provider.online
              ? 'offline'
              : provider.current_task
                ? 'working'
                : 'online';

            return {
              ...agent,
              status,
              currentTask: provider.current_task ?? undefined,
            };
          }),
        }));
      },

      incrementTasksCompleted: (id) => {
        set((state) => ({
          agents: state.agents.map((agent) => {
            if (agent.id !== id) return agent;
            const newTasksCompleted = agent.tasksCompleted + 1;
            const currentTasksFailed = agent.tasksFailed ?? 0;
            return {
              ...agent,
              tasksCompleted: newTasksCompleted,
              level: calculateSynergy(newTasksCompleted, currentTasksFailed),
              experience: agent.experience + 100,
            };
          }),
        }));
      },

      incrementTasksFailed: (id) => {
        set((state) => ({
          agents: state.agents.map((agent) => {
            if (agent.id !== id) return agent;
            const newTasksFailed = (agent.tasksFailed ?? 0) + 1;
            return {
              ...agent,
              tasksFailed: newTasksFailed,
              level: calculateSynergy(agent.tasksCompleted, newTasksFailed),
            };
          }),
        }));
      },

      getOnlineCount: () => {
        return get().agents.filter((a) => a.status !== 'offline').length;
      },

      getRecommendedAgents: () => {
        const sortedByLevelDesc = (items: Agent[]) =>
          [...items].sort((left, right) => right.level - left.level);

        const allAgents = get().agents;
        const onlineAgents = allAgents.filter((agent) => agent.status !== 'offline');

        if (onlineAgents.length > 0) {
          return sortedByLevelDesc(onlineAgents);
        }

        return sortedByLevelDesc(allAgents);
      },

      getSynergyTrend: (id: string) => {
        const agent = get().agents.find((a) => a.id === id);
        if (!agent) return 'stable';
        const total = agent.tasksCompleted + (agent.tasksFailed ?? 0);
        if (total < 3) return 'stable';
        // 成功率 > 70% 视为上升趋势，< 40% 视为下降
        const successRate = agent.tasksCompleted / total;
        if (successRate > 0.7) return 'up';
        if (successRate < 0.4) return 'down';
        return 'stable';
      },
    }),
    {
      name: 'ai-squad-agents',
    }
  )
);
