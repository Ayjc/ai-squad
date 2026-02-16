import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, CheckCircle, XCircle, Loader, FileText } from 'lucide-react';
import type { Task, TaskStep } from '../../types/task';
import { TASK_MODE_INFO } from '../../types/task';
import MarkdownRenderer from '../ResultView/MarkdownRenderer';
import { clsx } from 'clsx';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

const formatDuration = (start?: Date | string, end?: Date | string) => {
  if (!start || !end) return '-';
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '-';
  const totalSeconds = Math.floor((endMs - startMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const StepIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-success" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-error" />;
    case 'running':
      return <Loader className="w-4 h-4 text-warning animate-spin" />;
    default:
      return <Clock className="w-4 h-4 text-text-secondary" />;
  }
};

export default function TaskDetail({ task, onClose }: TaskDetailProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const steps: TaskStep[] = task.steps ?? [];

  const displaySteps: Array<{
    index: number;
    title: string;
    status: string;
    content?: string;
    agentId: string;
    startedAt?: Date | string;
    completedAt?: Date | string;
  }> = steps.length > 0
    ? steps.map((s) => ({
        index: s.stepIndex,
        title: s.title,
        status: s.status,
        content: s.content,
        agentId: s.agentId,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      }))
    : task.results.map((r, i) => ({
        index: i,
        title: `${r.agentId} 执行`,
        status: r.success ? 'completed' : 'failed',
        content: r.content,
        agentId: r.agentId,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      }));

  const selectedDisplay = displaySteps.find((s) => s.index === selectedStepIndex);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-bg-secondary border-l border-border-default h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-secondary border-b border-border-default p-4 flex items-start justify-between z-10">
          <div>
            <h2 id="task-detail-title" className="text-lg font-semibold text-text-primary">{task.title}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              <span className="px-2 py-0.5 rounded bg-accent/15 text-accent text-xs">
                {TASK_MODE_INFO[task.mode].icon} {TASK_MODE_INFO[task.mode].label}
              </span>
              <span>{task.assignees.join(', ')}</span>
              <span>{formatDuration(task.startedAt, task.completedAt)}</span>
              <span
                className={clsx(
                  task.status === 'completed'
                    ? 'text-success'
                    : task.status === 'failed'
                      ? 'text-error'
                      : 'text-warning'
                )}
              >
                {task.status === 'completed'
                  ? '已完成'
                  : task.status === 'failed'
                    ? '失败'
                    : '进行中'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {task.description && (
            <div className="mb-4 p-3 rounded-lg bg-bg-primary">
              <p className="text-sm text-text-secondary">{task.description}</p>
            </div>
          )}

          {displaySteps.length > 0 ? (
            <div className="space-y-0">
              <h3 className="text-sm font-medium text-text-primary mb-3">执行时间线</h3>
              {displaySteps.map((step, i) => (
                <div key={step.index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="p-1">
                      <StepIcon status={step.status} />
                    </div>
                    {i < displaySteps.length - 1 && (
                      <div className="w-px flex-1 bg-border-default min-h-[24px]" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStepIndex(selectedStepIndex === step.index ? null : step.index)
                    }
                    aria-expanded={selectedStepIndex === step.index}
                    aria-controls={`step-content-${step.index}`}
                    className={clsx(
                      'flex-1 text-left mb-2 p-2 rounded-lg transition-colors',
                      selectedStepIndex === step.index
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-bg-primary'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">{step.title}</span>
                      <span className="text-xs text-text-secondary">
                        {formatDuration(step.startedAt, step.completedAt)}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">{step.agentId}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">暂无执行步骤记录</p>
          )}

          <AnimatePresence>
            {selectedDisplay?.content && (
              <motion.div
                id={`step-content-${selectedDisplay.index}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-3 rounded-lg border border-border-default bg-bg-primary"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-text-primary">
                    {selectedDisplay.title} — 详细输出
                  </span>
                </div>
                <MarkdownRenderer
                  content={selectedDisplay.content}
                  className="text-sm max-h-60 overflow-y-auto"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {task.results.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-text-primary mb-3">完整输出</h3>
              <div className="space-y-3">
                {task.results.map((result, i) => (
                  <div key={i} className="rounded-lg border border-border-default bg-bg-primary p-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium text-text-primary">{result.agentId}</span>
                      <span className={result.success ? 'text-success' : 'text-error'}>
                        {result.success ? '成功' : '失败'}
                      </span>
                    </div>
                    {result.error && <p className="text-xs text-error mb-1">{result.error}</p>}
                    <MarkdownRenderer
                      content={result.content || '-'}
                      className="text-xs max-h-40 overflow-y-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
