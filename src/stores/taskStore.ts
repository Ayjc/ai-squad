import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskStatus, TaskStep } from '../types/task';
import { AGENT_CONFIGS } from '../types/agent';

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'progress' | 'results' | 'steps'>) => string;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  addTaskResult: (id: string, result: Task['results'][0]) => void;
  addTaskStep: (taskId: string, step: Omit<TaskStep, 'taskId'>) => void;
  updateTaskStep: (
    taskId: string,
    stepIndex: number,
    updates: Partial<Pick<TaskStep, 'id' | 'status' | 'content' | 'completedAt'>>
  ) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getActiveTaskCount: () => number;
  getRecentEvents: () => Array<{ time: string; action: string; type: 'success' | 'info' | 'error' }>;
}

// 生成唯一 ID
const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const SUPPORTED_AGENT_IDS = new Set(Object.keys(AGENT_CONFIGS));

const isSupportedAgent = (agentId: string) => SUPPORTED_AGENT_IDS.has(agentId);

const sanitizeTask = (task: Task): Task => {
  return {
    ...task,
    assignees: task.assignees.filter(isSupportedAgent),
    results: task.results.filter((result) => isSupportedAgent(result.agentId)),
    steps: task.steps.filter((step) => isSupportedAgent(step.agentId)),
  };
};

const sanitizeTasks = (tasks: Task[]) => tasks.map(sanitizeTask);

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      setTasks: (tasks) => {
        set({ tasks: sanitizeTasks(tasks) });
      },

      addTask: (taskData) => {
        const id = generateId();
        const task: Task = {
          ...taskData,
          assignees: taskData.assignees.filter(isSupportedAgent),
          id,
          createdAt: new Date(),
          progress: 0,
          results: [],
          steps: [],
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return id;
      },

      updateTaskStatus: (id, status) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status,
                  ...(status === 'running' && { startedAt: new Date() }),
                  ...(status === 'completed' && { completedAt: new Date(), progress: 100 }),
                }
              : task
          ),
        }));
      },

      updateTaskProgress: (id, progress) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, progress: Math.min(100, Math.max(0, progress)) } : task
          ),
        }));
      },

      addTaskResult: (id, result) => {
        if (!isSupportedAgent(result.agentId)) return;
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, results: [...task.results, result] }
              : task
          ),
        }));
      },

      addTaskStep: (taskId, stepData) => {
        if (!isSupportedAgent(stepData.agentId)) return;
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const step: TaskStep = { ...stepData, taskId };
            return { ...task, steps: [...task.steps, step] };
          }),
        }));
      },

      updateTaskStep: (taskId, stepIndex, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const newSteps = task.steps.map((step) =>
              step.stepIndex === stepIndex ? { ...step, ...updates } : step
            );
            return { ...task, steps: newSteps };
          }),
        }));
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter((t) => t.status === status);
      },

      getActiveTaskCount: () => {
        return get().tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
      },

      getRecentEvents: () => {
        const allTasks = get().tasks;
        if (allTasks.length === 0) return [];

        type EventItem = {
          timestamp: number;
          time: string;
          action: string;
          type: 'success' | 'info' | 'error';
        };
        const events: EventItem[] = [];

        const formatTime = (d: Date | string) => {
          const date = new Date(d);
          if (Number.isNaN(date.getTime())) return '--:--';
          return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        };

        allTasks.forEach((task) => {
          events.push({
            timestamp: new Date(task.createdAt).getTime(),
            time: formatTime(task.createdAt),
            action: `新任务: ${task.title}`,
            type: 'info',
          });

          if (task.status === 'completed' && task.completedAt) {
            events.push({
              timestamp: new Date(task.completedAt).getTime(),
              time: formatTime(task.completedAt),
              action: `${task.assignees[0] ?? 'AI'} 完成: ${task.title}`,
              type: 'success',
            });
          }

          if (task.status === 'failed' && task.completedAt) {
            events.push({
              timestamp: new Date(task.completedAt).getTime(),
              time: formatTime(task.completedAt),
              action: `${task.assignees[0] ?? 'AI'} 失败: ${task.title}`,
              type: 'error',
            });
          }
        });

        return events
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10)
          .map(({ time, action, type }) => ({ time, action, type }));
      },
    }),
    {
      name: 'ai-squad-tasks',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.setTasks(state.tasks);
      },
    }
  )
);
