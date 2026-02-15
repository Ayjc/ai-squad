import { invoke } from '@tauri-apps/api/core';
import type { Task, TaskMode, TaskResult, TaskStatus } from '../types/task';

export interface ProviderRuntimeStatus {
  id: string;
  name: string;
  online: boolean;
  current_task: string | null;
}

interface TaskRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  mode: string;
  assignees: string;
  progress: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface TaskResultRecord {
  result_id?: string | null;
  task_id: string;
  agent_id: string;
  content: string;
  success: boolean;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

const toIsoString = (value?: Date | string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const TASK_STATUSES: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
const TASK_MODES: TaskMode[] = ['parallel', 'pipeline', 'master'];

const normalizeStatus = (status: string): TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : 'pending';
};

const normalizeMode = (mode: string): TaskMode => {
  return TASK_MODES.includes(mode as TaskMode) ? (mode as TaskMode) : 'parallel';
};

const parseAssignees = (value: string): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // ignore invalid JSON and fallback to comma split
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const mapTaskRecord = (record: TaskRecord): Task => {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: normalizeStatus(record.status),
    mode: normalizeMode(record.mode),
    assignees: parseAssignees(record.assignees),
    progress: Number(record.progress) || 0,
    createdAt: parseDate(record.created_at) ?? new Date(),
    startedAt: parseDate(record.started_at),
    completedAt: parseDate(record.completed_at),
    results: [],
  };
};

const mapTaskResultRecord = (record: TaskResultRecord): TaskResult => {
  return {
    agentId: record.agent_id,
    content: record.content,
    success: record.success,
    error: record.error ?? undefined,
    startedAt: parseDate(record.started_at) ?? new Date(),
    completedAt: parseDate(record.completed_at) ?? new Date(),
  };
};

const mapTaskResultToRecord = (taskId: string, result: TaskResult): TaskResultRecord => {
  return {
    task_id: taskId,
    agent_id: result.agentId,
    content: result.content,
    success: result.success,
    error: result.error ?? null,
    started_at: toIsoString(result.startedAt),
    completed_at: toIsoString(result.completedAt),
  };
};

const mapTaskToRecord = (task: Task): TaskRecord => {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    mode: task.mode,
    assignees: JSON.stringify(task.assignees),
    progress: task.progress,
    created_at: toIsoString(task.createdAt) ?? new Date().toISOString(),
    started_at: toIsoString(task.startedAt),
    completed_at: toIsoString(task.completedAt),
  };
};

export async function getProviders(): Promise<ProviderRuntimeStatus[] | null> {
  try {
    return await invoke<ProviderRuntimeStatus[]>('get_providers');
  } catch (error) {
    console.warn('Tauri get_providers 调用失败:', error);
    return null;
  }
}

export async function getTasks(): Promise<Task[] | null> {
  try {
    const [records, resultRecords] = await Promise.all([
      invoke<TaskRecord[]>('get_tasks'),
      invoke<TaskResultRecord[]>('get_task_results', { taskId: null }),
    ]);

    const groupedResults = new Map<string, TaskResult[]>();
    resultRecords.forEach((record) => {
      const item = mapTaskResultRecord(record);
      const current = groupedResults.get(record.task_id) ?? [];
      groupedResults.set(record.task_id, [...current, item]);
    });

    return records.map((record) => {
      const task = mapTaskRecord(record);
      return {
        ...task,
        results: groupedResults.get(task.id) ?? [],
      };
    });
  } catch (error) {
    console.warn('Tauri get_tasks 调用失败:', error);
    return null;
  }
}

export async function saveTask(task: Task): Promise<boolean> {
  try {
    await invoke('save_task', { task: mapTaskToRecord(task) });

    await invoke('delete_task_results', { taskId: task.id });
    for (const result of task.results) {
      await invoke('save_task_result', {
        result: mapTaskResultToRecord(task.id, result),
      });
    }

    return true;
  } catch (error) {
    console.warn('Tauri save_task 调用失败:', error);
    return false;
  }
}

export async function askProvider(provider: string, message: string): Promise<string | null> {
  try {
    return await invoke<string>('ask_provider', { provider, message });
  } catch (error) {
    console.warn('Tauri ask_provider 调用失败:', error);
    return null;
  }
}
