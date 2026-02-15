import { invoke } from '@tauri-apps/api/core';
import type { StepStatus, Task, TaskMode, TaskResult, TaskStatus, TaskStep } from '../types/task';
import type { CollaborationStat } from '../types/common';

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

interface TaskStepRecord {
  id?: number | null;
  task_id: string;
  agent_id: string;
  step_index: number;
  title: string;
  content: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface CollaborationStatRecord {
  id?: number | null;
  agent_combo: string;
  mode: string;
  total_tasks: number;
  success_count: number;
  avg_duration_ms: number;
  last_used_at: string | null;
  created_at: string | null;
}

const toIsoString = (value?: Date | string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const TASK_STATUSES: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
const TASK_MODES: TaskMode[] = ['parallel', 'pipeline', 'master'];
const STEP_STATUSES: StepStatus[] = ['pending', 'running', 'completed', 'failed'];

const normalizeStatus = (status: string): TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : 'pending';
};

const normalizeMode = (mode: string): TaskMode => {
  return TASK_MODES.includes(mode as TaskMode) ? (mode as TaskMode) : 'parallel';
};

const normalizeStepStatus = (status: string): StepStatus => {
  return STEP_STATUSES.includes(status as StepStatus) ? (status as StepStatus) : 'pending';
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
    steps: [],
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

const mapTaskStepRecord = (record: TaskStepRecord): TaskStep => {
  return {
    id: record.id ?? undefined,
    taskId: record.task_id,
    agentId: record.agent_id,
    stepIndex: Number(record.step_index) || 0,
    title: record.title,
    content: record.content ?? undefined,
    status: normalizeStepStatus(record.status),
    startedAt: parseDate(record.started_at),
    completedAt: parseDate(record.completed_at),
  };
};

const mapTaskStepToRecord = (step: TaskStep): TaskStepRecord => {
  return {
    id: step.id ?? null,
    task_id: step.taskId,
    agent_id: step.agentId,
    step_index: step.stepIndex,
    title: step.title,
    content: step.content ?? null,
    status: step.status,
    started_at: toIsoString(step.startedAt),
    completed_at: toIsoString(step.completedAt),
  };
};

const mapCollaborationStatRecord = (record: CollaborationStatRecord): CollaborationStat => {
  return {
    id: record.id ?? undefined,
    agentCombo: record.agent_combo,
    mode: record.mode,
    totalTasks: Number(record.total_tasks) || 0,
    successCount: Number(record.success_count) || 0,
    avgDurationMs: Number(record.avg_duration_ms) || 0,
    lastUsedAt: parseDate(record.last_used_at),
    createdAt: parseDate(record.created_at),
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

    const tasks = records.map((record) => {
      const task = mapTaskRecord(record);
      return {
        ...task,
        results: groupedResults.get(task.id) ?? [],
      };
    });

    await Promise.allSettled(
      tasks.map(async (task) => {
        const stepRecords = await invoke<TaskStepRecord[]>('get_task_steps', { taskId: task.id });
        task.steps = stepRecords.map(mapTaskStepRecord);
      })
    );

    return tasks;
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

export async function getTaskSteps(taskId: string): Promise<TaskStep[] | null> {
  try {
    const records = await invoke<TaskStepRecord[]>('get_task_steps', { taskId });
    return records.map(mapTaskStepRecord);
  } catch (error) {
    console.warn('Tauri get_task_steps 调用失败:', error);
    return null;
  }
}

export async function saveTaskStep(step: TaskStep): Promise<number | null> {
  try {
    return await invoke<number>('save_task_step', { step: mapTaskStepToRecord(step) });
  } catch (error) {
    console.warn('Tauri save_task_step 调用失败:', error);
    return null;
  }
}

export async function deleteTaskSteps(taskId: string): Promise<boolean> {
  try {
    await invoke('delete_task_steps', { taskId });
    return true;
  } catch (error) {
    console.warn('Tauri delete_task_steps 调用失败:', error);
    return false;
  }
}

export async function getCollaborationStats(): Promise<CollaborationStat[] | null> {
  try {
    const records = await invoke<CollaborationStatRecord[]>('get_collaboration_stats');
    return records.map(mapCollaborationStatRecord);
  } catch (error) {
    console.warn('Tauri get_collaboration_stats 调用失败:', error);
    return null;
  }
}

export async function upsertCollaborationStat(
  agentCombo: string,
  mode: string,
  success: boolean,
  durationMs: number
): Promise<boolean> {
  try {
    await invoke('upsert_collaboration_stat', {
      agentCombo,
      mode,
      success,
      durationMs,
    });
    return true;
  } catch (error) {
    console.warn('Tauri upsert_collaboration_stat 调用失败:', error);
    return false;
  }
}

export async function getBestCombo(): Promise<CollaborationStat | null> {
  try {
    const record = await invoke<CollaborationStatRecord | null>('get_best_combo');
    if (!record) {
      return null;
    }
    return mapCollaborationStatRecord(record);
  } catch (error) {
    console.warn('Tauri get_best_combo 调用失败:', error);
    return null;
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
