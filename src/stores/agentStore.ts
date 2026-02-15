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
  getOnlineCount: () => number;
}

// 根据任务数计算等级
const calculateLevel = (tasksCompleted: number): number => {
  if (tasksCompleted < 5) return 1;
  if (tasksCompleted < 15) return 2;
  if (tasksCompleted < 30) return 3;
  return Math.floor(tasksCompleted / 15) + 3;
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],

      initializeAgents: () => {
        const agents: Agent[] = Object.values(AGENT_CONFIGS).map((config) => ({
          ...config,
          status: 'offline' as AgentStatus,
          level: 1,
          experience: 0,
          tasksCompleted: 0,
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
            return {
              ...agent,
              tasksCompleted: newTasksCompleted,
              level: calculateLevel(newTasksCompleted),
              experience: agent.experience + 100,
            };
          }),
        }));
      },

      getOnlineCount: () => {
        return get().agents.filter((a) => a.status !== 'offline').length;
      },
    }),
    {
      name: 'ai-squad-agents',
    }
  )
);
