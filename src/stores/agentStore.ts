import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent, AgentStatus } from '../types/agent';
import { AGENT_CONFIGS } from '../types/agent';
import type { ProviderRuntimeStatus } from '../services/tauriService';
import { useTaskStore } from './taskStore';

interface AgentState {
  agents: Agent[];
  initializeAgents: () => void;
  reconcileAgents: () => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  syncProviderStatuses: (providers: ProviderRuntimeStatus[]) => void;
  incrementTasksCompleted: (id: string) => void;
  incrementTasksFailed: (id: string) => void;
  getOnlineCount: () => number;
  getRecommendedAgents: () => Agent[];
  getSynergyTrend: (id: string) => 'up' | 'down' | 'stable';
  getMilestoneProgress: () => Array<{ id: string; unlocked: boolean; progress: number }>;
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

const createDefaultAgent = (config: Omit<Agent, 'status' | 'level' | 'experience' | 'tasksCompleted' | 'tasksFailed' | 'currentTask'>): Agent => ({
  ...config,
  status: 'offline',
  level: 0,
  experience: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
});

const normalizeAgents = (currentAgents: Agent[]): Agent[] => {
  const agentMap = new Map(currentAgents.map((agent) => [agent.id, agent]));

  return Object.values(AGENT_CONFIGS).map((config) => {
    const current = agentMap.get(config.id);
    if (!current) {
      return createDefaultAgent(config);
    }

    return {
      ...createDefaultAgent(config),
      status: current.status,
      level: current.level,
      experience: current.experience,
      tasksCompleted: current.tasksCompleted,
      tasksFailed: current.tasksFailed ?? 0,
      currentTask: current.currentTask,
    };
  });
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],

      initializeAgents: () => {
        const agents: Agent[] = Object.values(AGENT_CONFIGS).map((config) => createDefaultAgent(config));
        set({ agents });
      },

      reconcileAgents: () => {
        set((state) => ({
          agents: normalizeAgents(state.agents),
        }));
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

      getMilestoneProgress: () => {
        const agents = get().agents;
        const tasks = useTaskStore.getState().tasks;

        const totalTasks = tasks.length;
        const firstCollab = totalTasks >= 1;

        const maxLevel = agents.reduce((max, a) => Math.max(max, a.level), 0);
        const synergy50 = maxLevel >= 50;

        const hasMultiAi = tasks.some((t) => t.assignees.length >= 3);

        const sortedByTime = [...tasks].sort((a, b) => {
          const ta = new Date(a.completedAt ?? a.createdAt).getTime();
          const tb = new Date(b.completedAt ?? b.createdAt).getTime();
          return tb - ta;
        });
        let streak = 0;
        for (const t of sortedByTime) {
          if (t.status === 'completed') streak++;
          else break;
        }
        const streak10 = streak >= 10;

        const usedModes = new Set(tasks.map((t) => t.mode));
        const allModes = usedModes.size >= 3;

        return [
          { id: 'first_collab', unlocked: firstCollab, progress: Math.min(totalTasks, 1) },
          { id: 'synergy_50', unlocked: synergy50, progress: Math.min(maxLevel, 50) },
          { id: 'multi_ai', unlocked: hasMultiAi, progress: hasMultiAi ? 3 : Math.max(...tasks.map((t) => t.assignees.length), 0) },
          { id: 'streak_10', unlocked: streak10, progress: Math.min(streak, 10) },
          { id: 'all_modes', unlocked: allModes, progress: usedModes.size },
        ];
      },
    }),
    {
      name: 'ai-squad-agents',
      onRehydrateStorage: () => (state) => {
        state?.reconcileAgents();
      },
    }
  )
);
