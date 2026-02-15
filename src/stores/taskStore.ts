import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, TaskStatus } from '../types/task';

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'progress' | 'results'>) => string;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTaskProgress: (id: string, progress: number) => void;
  addTaskResult: (id: string, result: Task['results'][0]) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getActiveTaskCount: () => number;
}

// 生成唯一 ID
const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      setTasks: (tasks) => {
        set({ tasks });
      },

      addTask: (taskData) => {
        const id = generateId();
        const task: Task = {
          ...taskData,
          id,
          createdAt: new Date(),
          progress: 0,
          results: [],
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
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, results: [...task.results, result] }
              : task
          ),
        }));
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter((t) => t.status === status);
      },

      getActiveTaskCount: () => {
        return get().tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
      },
    }),
    {
      name: 'ai-squad-tasks',
    }
  )
);
