import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAgentStore, useTaskStore } from '../stores';
import type { Task, TaskMode, TaskResult, TaskStep, StepStatus } from '../types/task';
import { TASK_MODE_INFO } from '../types/task';
import { clsx } from 'clsx';
import { askProvider, saveTask, saveTaskStep, upsertCollaborationStat } from '../services/tauriService';

const modes: TaskMode[] = ['parallel', 'pipeline', 'master'];

interface DemoTask {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed';
  assignees: string[];
  progress: number;
}

interface ExecutionSummary {
  successCount: number;
  totalSteps: number;
}

const buildTaskMessage = (taskTitle: string, taskDescription: string) => {
  return taskDescription.trim().length > 0
    ? `${taskTitle}\n\n${taskDescription}`
    : taskTitle;
};

const buildPipelineMessage = (baseMessage: string, agentId: string, output: string) => {
  return `${baseMessage}\n\n上一步(${agentId})输出:\n${output}`;
};

const buildMasterReviewMessage = (originMessage: string, masterOutput: string) => {
  return `${originMessage}\n\n主AI初稿如下，请给出审查意见、风险点和改进建议：\n${masterOutput}`;
};

const buildMasterFinalizeMessage = (
  originMessage: string,
  masterOutput: string,
  advisorResults: TaskResult[]
) => {
  const advisorText = advisorResults
    .map((item) => `${item.agentId}: ${item.success ? item.content : item.error ?? '无输出'}`)
    .join('\n\n');

  return `${originMessage}\n\n你之前的初稿:\n${masterOutput}\n\n以下是协作者反馈，请整合并给出最终答复：\n${advisorText}`;
};

export default function Tasks() {
  const location = useLocation();
  const locationState = location.state as { preselectedAgent?: string } | null;
  const {
    tasks,
    addTask,
    updateTaskStatus,
    updateTaskProgress,
    addTaskResult,
    addTaskStep,
    updateTaskStep,
  } = useTaskStore();
  const { getRecommendedAgents, getSynergyTrend } = useAgentStore();

  const [selectedMode, setSelectedMode] = useState<TaskMode>('parallel');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (locationState?.preselectedAgent) {
      setSelectedAssignees([locationState.preselectedAgent]);
      setIsCreateOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, []);

  const assigneeOptions = useMemo(() => {
    return getRecommendedAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      displayName: agent.displayName,
      level: agent.level,
      status: agent.status,
      trend: getSynergyTrend(agent.id),
    }));
  }, [getRecommendedAgents, getSynergyTrend]);

  const topRecommendedAgentId = assigneeOptions[0]?.id;
  const topRecommendedAgent = assigneeOptions[0];

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  const demoTasks: DemoTask[] = [
    { id: '1', title: '分析登录模块bug', status: 'pending', assignees: ['Claude', 'Gemini'], progress: 0 },
    { id: '2', title: '设计用户界面', status: 'pending', assignees: ['OpenCode'], progress: 0 },
    { id: '3', title: '优化数据库查询', status: 'running', assignees: ['Codex'], progress: 65 },
    { id: '4', title: '重构API接口', status: 'completed', assignees: ['Codex'], progress: 100 },
    { id: '5', title: '实现推荐算法', status: 'completed', assignees: ['Gemini'], progress: 100 },
  ];

  const persistTask = async (taskId: string) => {
    const snapshot = useTaskStore.getState().tasks.find((item) => item.id === taskId);
    if (!snapshot) return;
    await saveTask(snapshot);
  };

  const executeProvider = async (agentId: string, message: string): Promise<TaskResult> => {
    const startedAt = new Date();
    const response = await askProvider(agentId, message);
    const completedAt = new Date();

    if (response) {
      return {
        agentId,
        content: response,
        startedAt,
        completedAt,
        success: true,
      };
    }

    return {
      agentId,
      content: '',
      startedAt,
      completedAt,
      success: false,
      error: 'Provider 执行失败或未返回内容',
    };
  };

  const recordStep = async (
    taskId: string,
    stepIndex: number,
    agentId: string,
    stepTitle: string,
    status: StepStatus,
    content?: string
  ) => {
    const now = new Date();
    const step = {
      agentId,
      stepIndex,
      title: stepTitle,
      status,
      content,
      startedAt: status === 'running' ? now : undefined,
      completedAt: status === 'completed' || status === 'failed' ? now : undefined,
    };
    addTaskStep(taskId, step);
    const savedId = await saveTaskStep({ ...step, taskId });
    if (savedId != null) {
      updateTaskStep(taskId, stepIndex, { id: savedId });
    }
  };

  const updateAndPersistStep = async (
    taskId: string,
    stepIndex: number,
    updates: Partial<Pick<TaskStep, 'status' | 'content' | 'completedAt'>>
  ) => {
    updateTaskStep(taskId, stepIndex, updates);
    const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
    const step = task?.steps.find((s) => s.stepIndex === stepIndex);
    if (step) {
      await saveTaskStep(step);
    }
  };

  const appendResult = async (
    taskId: string,
    result: TaskResult,
    completedSteps: number,
    totalSteps: number
  ) => {
    addTaskResult(taskId, result);
    const progress = Math.round((completedSteps / totalSteps) * 100);
    updateTaskProgress(taskId, progress);
    await persistTask(taskId);
  };

  const runParallelTask = async (
    taskId: string,
    assignees: string[],
    message: string
  ): Promise<ExecutionSummary> => {
    let successCount = 0;
    const totalSteps = assignees.length;

    for (let i = 0; i < assignees.length; i += 1) {
      await recordStep(taskId, i, assignees[i], `${assignees[i]} 并行执行`, 'running');
    }

    const results = await Promise.all(
      assignees.map(async (agentId) => {
        const result = await executeProvider(agentId, message);
        return { agentId, result };
      })
    );

    for (let index = 0; index < results.length; index += 1) {
      const { result } = results[index];
      if (result.success) {
        successCount += 1;
      }

      await updateAndPersistStep(taskId, index, {
        status: result.success ? 'completed' : 'failed',
        content: result.success ? result.content : result.error,
        completedAt: new Date(),
      });

      await appendResult(taskId, result, index + 1, totalSteps);
    }

    return { successCount, totalSteps };
  };

  const runPipelineTask = async (
    taskId: string,
    assignees: string[],
    message: string
  ): Promise<ExecutionSummary> => {
    let successCount = 0;
    const totalSteps = assignees.length;
    let nextMessage = message;

    for (let index = 0; index < assignees.length; index += 1) {
      const agentId = assignees[index];
      await recordStep(
        taskId,
        index,
        agentId,
        index === 0 ? `${agentId} 启动流水线` : `${agentId} 基于上一步继续`,
        'running'
      );

      const result = await executeProvider(agentId, nextMessage);

      if (result.success) {
        successCount += 1;
        nextMessage = buildPipelineMessage(nextMessage, agentId, result.content);
      }

      await updateAndPersistStep(taskId, index, {
        status: result.success ? 'completed' : 'failed',
        content: result.success ? result.content : result.error,
        completedAt: new Date(),
      });

      await appendResult(taskId, result, index + 1, totalSteps);
    }

    return { successCount, totalSteps };
  };

  const runMasterTask = async (
    taskId: string,
    assignees: string[],
    message: string
  ): Promise<ExecutionSummary> => {
    const [masterAgent, ...advisorAgents] = assignees;
    if (!masterAgent) {
      return { successCount: 0, totalSteps: 1 };
    }

    const totalSteps = advisorAgents.length > 0 ? advisorAgents.length + 2 : 1;
    let completedSteps = 0;
    let successCount = 0;
    let stepIdx = 0;

    await recordStep(taskId, stepIdx, masterAgent, `${masterAgent} 生成初稿`, 'running');
    const masterDraft = await executeProvider(masterAgent, message);
    if (masterDraft.success) {
      successCount += 1;
    }
    await updateAndPersistStep(taskId, stepIdx, {
      status: masterDraft.success ? 'completed' : 'failed',
      content: masterDraft.success ? masterDraft.content : masterDraft.error,
      completedAt: new Date(),
    });
    completedSteps += 1;
    await appendResult(taskId, masterDraft, completedSteps, totalSteps);

    const advisorResults: TaskResult[] = [];
    if (advisorAgents.length > 0) {
      const advisorMessage = buildMasterReviewMessage(
        message,
        masterDraft.success ? masterDraft.content : '主AI未产出有效结果'
      );

      for (let i = 0; i < advisorAgents.length; i += 1) {
        stepIdx += 1;
        await recordStep(taskId, stepIdx, advisorAgents[i], `${advisorAgents[i]} 评审`, 'running');
      }

      const advisorResultRows = await Promise.all(
        advisorAgents.map(async (agentId) => {
          const result = await executeProvider(agentId, advisorMessage);
          return { agentId, result };
        })
      );

      for (let index = 0; index < advisorResultRows.length; index += 1) {
        const { result } = advisorResultRows[index];
        advisorResults.push(result);
        if (result.success) {
          successCount += 1;
        }

        await updateAndPersistStep(taskId, index + 1, {
          status: result.success ? 'completed' : 'failed',
          content: result.success ? result.content : result.error,
          completedAt: new Date(),
        });

        completedSteps += 1;
        await appendResult(taskId, result, completedSteps, totalSteps);
      }
    }

    if (advisorAgents.length > 0 && masterDraft.success) {
      stepIdx += 1;
      await recordStep(taskId, stepIdx, masterAgent, `${masterAgent} 综合反馈`, 'running');
      const finalMessage = buildMasterFinalizeMessage(message, masterDraft.content, advisorResults);
      const masterFinal = await executeProvider(masterAgent, finalMessage);
      if (masterFinal.success) {
        successCount += 1;
      }
      await updateAndPersistStep(taskId, stepIdx, {
        status: masterFinal.success ? 'completed' : 'failed',
        content: masterFinal.success ? masterFinal.content : masterFinal.error,
        completedAt: new Date(),
      });
      completedSteps += 1;
      await appendResult(taskId, masterFinal, completedSteps, totalSteps);
    }

    return { successCount, totalSteps };
  };

  const runTask = async (
    taskId: string,
    mode: TaskMode,
    assignees: string[],
    taskTitle: string,
    taskDescription: string
  ) => {
    updateTaskStatus(taskId, 'running');
    const runStartedAt = Date.now();
    await persistTask(taskId);

    const message = buildTaskMessage(taskTitle, taskDescription);
    let summary: ExecutionSummary;

    if (mode === 'parallel') {
      summary = await runParallelTask(taskId, assignees, message);
    } else if (mode === 'pipeline') {
      summary = await runPipelineTask(taskId, assignees, message);
    } else {
      summary = await runMasterTask(taskId, assignees, message);
    }

    const agentCombo = [...assignees].sort().join('+');
    const durationMs = Math.max(0, Date.now() - runStartedAt);
    const tracked = await upsertCollaborationStat(
      agentCombo,
      mode,
      summary.successCount > 0,
      durationMs
    );
    if (!tracked) {
      console.warn('协作统计记录失败', { taskId, agentCombo, mode });
    }

    updateTaskProgress(taskId, 100);
    const finalStatus = summary.successCount > 0 ? 'completed' : 'failed';
    updateTaskStatus(taskId, finalStatus);
    await persistTask(taskId);
  };

  const toggleAssignee = (agentId: string) => {
    setSelectedAssignees((current) => (
      current.includes(agentId)
        ? current.filter((item) => item !== agentId)
        : [...current, agentId]
    ));
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setSelectedAssignees([]);
    setSubmitError('');
  };

  const handleCreateTask = async () => {
    const taskTitle = title.trim();
    const taskDescription = description.trim();

    if (!taskTitle) {
      setSubmitError('请输入任务标题');
      return;
    }

    if (selectedAssignees.length === 0) {
      setSubmitError('请至少选择一个执行 AI');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const taskId = addTask({
        title: taskTitle,
        description: taskDescription,
        status: 'pending',
        mode: selectedMode,
        assignees: selectedAssignees,
        startedAt: undefined,
        completedAt: undefined,
      });

      await persistTask(taskId);
      setIsCreateOpen(false);
      resetCreateForm();

      await runTask(taskId, selectedMode, selectedAssignees, taskTitle, taskDescription);
    } catch (error) {
      setSubmitError(`创建任务失败: ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTaskCard = (
    task: Pick<Task, 'id' | 'title' | 'assignees'> | Pick<DemoTask, 'id' | 'title' | 'assignees'>,
    index: number
  ) => (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      className="card-hover"
    >
      <h4 className="font-medium text-text-primary mb-2">{task.title}</h4>
      <div className="flex flex-wrap gap-1">
        {task.assignees.map((assignee) => (
          <span key={assignee} className="text-xs px-2 py-0.5 rounded bg-bg-primary text-text-secondary">
            {assignee}
          </span>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">任务中心</h1>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建任务
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4 mb-2">
          {modes.map((mode) => {
            const info = TASK_MODE_INFO[mode];
            const isSelected = selectedMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  isSelected ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-text-secondary">
          当前: {TASK_MODE_INFO[selectedMode].label} - {TASK_MODE_INFO[selectedMode].description}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">等待中 ({pendingTasks.length || 2})</h3>
          </div>
          <AnimatePresence>
            {(pendingTasks.length > 0 ? pendingTasks : demoTasks.filter(t => t.status === 'pending')).map((task, index) => (
              renderTaskCard(task, index)
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">执行中 ({runningTasks.length || 1})</h3>
          </div>
          <AnimatePresence>
            {(runningTasks.length > 0 ? runningTasks : demoTasks.filter(t => t.status === 'running')).map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover border-warning/50"
              >
                <h4 className="font-medium text-text-primary mb-2">{task.title}</h4>
                <div className="h-1 bg-bg-primary rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-warning"
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>{task.progress}%</span>
                  <span>⚡ 执行中</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">已完成 ({completedTasks.length || 2})</h3>
          </div>
          <AnimatePresence>
            {(completedTasks.length > 0 ? completedTasks : demoTasks.filter(t => t.status === 'completed')).map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover border-success/50"
              >
                <h4 className="font-medium text-text-primary mb-2">{task.title}</h4>
                <div className="flex items-center gap-2 text-xs text-success">
                  <span>✓ 完成</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">失败 ({failedTasks.length})</h3>
          </div>
          <AnimatePresence>
            {failedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="card-hover border-error/50"
              >
                <h4 className="font-medium text-text-primary mb-2">{task.title}</h4>
                <p className="text-xs text-error">✗ 执行失败</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-xl card">
            <h2 className="text-lg font-medium text-text-primary mb-4">新建任务</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">标题</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
                  placeholder="例如：排查登录接口 500 错误"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-1">描述</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full min-h-[120px] bg-bg-primary border border-border-default rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent"
                  placeholder="补充上下文、限制条件和期望输出"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">执行 AI</label>
                {selectedAssignees.length === 0 && topRecommendedAgent && (
                  <div className="flex items-center gap-1.5 text-sm text-text-secondary mb-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>
                      根据默契度推荐：{topRecommendedAgent.name} (默契 {topRecommendedAgent.level})
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {assigneeOptions.map((agent) => {
                    const checked = selectedAssignees.includes(agent.id);
                    const isTopRecommended = agent.id === topRecommendedAgentId;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAssignee(agent.id)}
                        className={clsx(
                          'text-left px-3 py-2 rounded-lg border transition-colors',
                          checked
                            ? 'border-accent bg-accent/10 text-text-primary'
                            : 'border-border-default text-text-secondary hover:text-text-primary'
                        )}
                      >
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <span>{agent.name}</span>
                          {isTopRecommended && (
                            <span className="bg-accent/15 text-accent text-xs px-1.5 py-0.5 rounded">
                              推荐
                            </span>
                          )}
                        </p>
                        <p className="text-xs">{agent.displayName}</p>
                        <p className="text-text-secondary text-xs mt-1 flex items-center gap-1">
                          默契 {agent.level}
                          {agent.trend === 'up' && <TrendingUp className="w-3 h-3 text-success" />}
                          {agent.trend === 'down' && <TrendingDown className="w-3 h-3 text-error" />}
                          {agent.trend === 'stable' && <Minus className="w-3 h-3 text-text-secondary" />}
                        </p>
                        <p className="text-text-secondary text-xs mt-1">状态: {agent.status}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-error">{submitError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  if (isSubmitting) return;
                  setIsCreateOpen(false);
                  resetCreateForm();
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={isSubmitting}
                onClick={handleCreateTask}
              >
                {isSubmitting ? '执行中...' : '创建并执行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
