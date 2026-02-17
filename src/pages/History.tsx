import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Search, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAgentStore, useTaskStore } from '../stores';
import { MILESTONES } from '../types/common';
import { TASK_MODE_INFO } from '../types/task';
import { clsx } from 'clsx';
import MarkdownRenderer from '../components/ResultView/MarkdownRenderer';
import { TaskDetail } from '../components/TaskDetail';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: 'easeIn'
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut'
    }
  }
};

interface HistoryResultItem {
  agentId: string;
  duration: string;
  success: boolean;
  content: string;
  error?: string;
}

interface HistoryItem {
  id: string;
  time: string;
  title: string;
  agent: string;
  duration: string;
  success: boolean;
  mode: string;
  results: HistoryResultItem[];
}

const DEMO_HISTORY: HistoryItem[] = [
  {
    id: 'demo-1',
    time: '10:32',
    title: '优化数据库查询',
    agent: 'Codex',
    duration: '2m 15s',
    success: true,
    mode: TASK_MODE_INFO.parallel.label,
    results: [
      {
        agentId: 'codex',
        duration: '2m 15s',
        success: true,
        content: '建议把慢查询拆成两段，先过滤索引字段，再做聚合。',
      },
    ],
  },
  {
    id: 'demo-2',
    time: '10:15',
    title: '重构API接口',
    agent: 'Claude',
    duration: '5m 30s',
    success: true,
    mode: TASK_MODE_INFO.pipeline.label,
    results: [
      {
        agentId: 'claude',
        duration: '5m 30s',
        success: true,
        content: '拆分 DTO 并统一错误响应格式，减少前后端耦合。',
      },
    ],
  },
];

const formatTime = (dateLike?: Date | string) => {
  if (!dateLike) return '--:--';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const getDurationSeconds = (start?: Date | string, end?: Date | string) => {
  if (!start || !end) return 0;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return 0;
  return Math.floor((endMs - startMs) / 1000);
};

const formatDuration = (start?: Date | string, end?: Date | string) => {
  const totalSeconds = getDurationSeconds(start, end);
  if (totalSeconds <= 0) return '-';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const formatSeconds = (seconds: number) => {
  if (seconds <= 0) return '-';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
};

const formatExportDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function History() {
  const location = useLocation();
  const locationState = location.state as { filterAgent?: string } | null;
  const { getMilestoneProgress } = useAgentStore();
  const { tasks } = useTaskStore();
  const milestoneProgress = getMilestoneProgress();
  const [searchQuery, setSearchQuery] = useState(locationState?.filterAgent ?? '');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [copiedResultKey, setCopiedResultKey] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (locationState?.filterAgent) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  const handleCopyResult = async (resultKey: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedResultKey(resultKey);
      window.setTimeout(() => {
        setCopiedResultKey((current) => (current === resultKey ? null : current));
      }, 1500);
    } catch (error) {
      console.warn('复制结果失败:', error);
    }
  };

  const historyItems: HistoryItem[] = useMemo(() => {
    if (tasks.length === 0) {
      return DEMO_HISTORY;
    }

    const sortedTasks = [...tasks].sort((a, b) => {
      const left = new Date(a.completedAt ?? a.startedAt ?? a.createdAt).getTime();
      const right = new Date(b.completedAt ?? b.startedAt ?? b.createdAt).getTime();
      return right - left;
    });

    const filtered = searchQuery.trim()
      ? sortedTasks.filter((task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.assignees.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : sortedTasks;

    return filtered.map((task) => ({
      id: task.id,
      time: formatTime(task.completedAt ?? task.startedAt ?? task.createdAt),
      title: task.title,
      agent: task.assignees[0] ?? '未分配',
      duration: formatDuration(task.startedAt, task.completedAt),
      success: task.status !== 'failed' && task.status !== 'cancelled',
      mode: TASK_MODE_INFO[task.mode].label,
      results: task.results.map((result) => ({
        agentId: result.agentId,
        duration: formatDuration(result.startedAt, result.completedAt),
        success: result.success,
        content: result.content,
        error: result.error,
      })),
    }));
  }, [tasks, searchQuery]);

  const handleExportHistory = () => {
    const now = new Date();
    const dateLabel = formatExportDate(now);
    const markdownLines: string[] = [
      '# AI Squad History Export',
      '',
      `导出时间: ${now.toLocaleString('zh-CN')}`,
      '',
    ];

    historyItems.forEach((item, index) => {
      markdownLines.push(`## ${index + 1}. ${item.title}`);
      markdownLines.push(`- 时间: ${item.time}`);
      markdownLines.push(`- Agent: ${item.agent}`);
      markdownLines.push(`- 模式: ${item.mode}`);
      markdownLines.push(`- 耗时: ${item.duration}`);
      markdownLines.push(`- 状态: ${item.success ? '成功' : '失败'}`);
      markdownLines.push('');

      if (item.results.length === 0) {
        markdownLines.push('- 结果: 无');
        markdownLines.push('');
      } else {
        markdownLines.push('### 结果');
        markdownLines.push('');
        item.results.forEach((result, resultIndex) => {
          markdownLines.push(`#### ${resultIndex + 1}. ${result.agentId}`);
          markdownLines.push(`- 耗时: ${result.duration}`);
          markdownLines.push(`- 成功: ${result.success ? '是' : '否'}`);
          if (result.error) {
            markdownLines.push(`- 错误: ${result.error}`);
          }
          markdownLines.push('');
          markdownLines.push(result.content || '-');
          markdownLines.push('');
        });
      }

      markdownLines.push('---');
      markdownLines.push('');
    });

    const blob = new Blob([markdownLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-squad-history-${dateLabel}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    if (tasks.length === 0) {
      return {
        totalTasks: 128,
        completionRate: 94,
        avgDuration: '3m 42s',
        bestPartner: 'Claude',
        bestPartnerCount: 48,
        bestPartnerTrend: 'up' as const,
      };
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'completed').length;
    const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const durations = tasks
      .map((task) => getDurationSeconds(task.startedAt, task.completedAt))
      .filter((seconds) => seconds > 0);
    const avgSeconds = durations.length === 0
      ? 0
      : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);

    const agentCounter: Record<string, number> = {};
    tasks.forEach((task) => {
      task.results.forEach((result) => {
        if (!result.success) return;
        agentCounter[result.agentId] = (agentCounter[result.agentId] ?? 0) + 1;
      });
    });

    let bestPartner = '暂无';
    let bestPartnerCount = 0;
    Object.entries(agentCounter).forEach(([agentId, count]) => {
      if (count > bestPartnerCount) {
        bestPartner = agentId;
        bestPartnerCount = count;
      }
    });

    // 最佳拍档趋势
    const bestTotal = bestPartnerCount + (agentCounter[bestPartner + '_failed'] ?? 0);
    const bestPartnerTrend: 'up' | 'down' | 'stable' = bestPartnerCount > 5 ? 'up' : bestTotal > 0 ? 'stable' : 'stable';

    return {
      totalTasks,
      completionRate,
      avgDuration: formatSeconds(avgSeconds),
      bestPartner,
      bestPartnerCount,
      bestPartnerTrend,
    };
  }, [tasks]);

  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) : null;

  return (
    <motion.div
      className="page-shell"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="page-container">
        <motion.div variants={itemVariants} className="page-header">
          <h1 className="page-title">历史记录</h1>
          <button
            type="button"
            onClick={handleExportHistory}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="card mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务..."
                className="w-full bg-bg-primary border border-border-default rounded-lg py-2 pl-10 pr-4 text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
              />
            </div>
            <select className="bg-bg-primary border border-border-default rounded-lg px-4 text-text-primary focus:outline-none focus:border-accent">
              <option>全部</option>
              <option>今天</option>
              <option>本周</option>
              <option>本月</option>
            </select>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '总任务', value: stats.totalTasks, trend: '+12%', up: true },
            { label: '完成率', value: `${stats.completionRate}%`, trend: '+5%', up: true },
            { label: '平均耗时', value: stats.avgDuration, trend: '-30s', up: false },
            { label: '最佳拍档', value: stats.bestPartner, subtext: `${stats.bestPartnerCount}次协作`, trend: stats.bestPartnerTrend === 'up' ? '+' : undefined, up: stats.bestPartnerTrend === 'up' },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="card"
            >
              <p className="text-text-secondary text-sm mb-1">{stat.label}</p>
              <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
              {stat.trend && (
                <p className={clsx(
                  'text-xs flex items-center gap-1 mt-1',
                  stat.up ? 'text-success' : 'text-error'
                )}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.trend}
                </p>
              )}
              {stat.subtext && (
                <p className="text-xs text-text-secondary mt-1">{stat.subtext}</p>
              )}
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="card mb-6">
          <h3 className="font-medium text-text-primary mb-4">今天</h3>
          <div className="space-y-3">
            {historyItems.map((item, index) => {
              const expanded = expandedTaskId === item.id;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25, ease: 'easeOut' }}
                  className="p-3 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors cursor-pointer"
                  onClick={() => {
                    if (!item.id.startsWith('demo-')) {
                      setDetailTaskId(item.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <span className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-sm',
                      item.success ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                    )}>
                      {item.success ? '✓' : '✗'}
                    </span>
                    <span className="text-text-secondary text-sm w-12">{item.time}</span>
                    <span className="flex-1 text-text-primary">{item.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent">{item.mode}</span>
                    <span className="text-text-secondary text-sm">{item.agent}</span>
                    <span className="text-text-secondary text-sm">{item.duration}</span>
                    {item.results.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedTaskId(expanded ? null : item.id);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        {expanded ? '收起结果' : `查看结果(${item.results.length})`}
                      </button>
                    )}
                  </div>

                  {expanded && item.results.length > 0 && (
                    <div
                      className="mt-3 pt-3 border-t border-border-default space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.results.map((result, resultIndex) => {
                        const resultKey = `${item.id}-${result.agentId}-${resultIndex}`;
                        const copied = copiedResultKey === resultKey;
                        return (
                          <div
                            key={resultKey}
                            className="rounded-lg border border-border-default bg-bg-secondary/60 p-2"
                          >
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-text-primary font-medium">{result.agentId}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-text-secondary">耗时 {result.duration}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyResult(resultKey, result.content || '')}
                                  className="inline-flex items-center justify-center rounded border border-border-default p-1 text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                                  title="复制 Markdown"
                                  aria-label="复制 Markdown"
                                >
                                  {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            {result.error && (
                              <p className="text-xs text-error mb-1">{result.error}</p>
                            )}
                            <MarkdownRenderer
                              content={result.content || '-'}
                              className={clsx(
                                'text-xs max-h-28 overflow-y-auto',
                                !result.success && '[&_*]:text-error/90'
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card">
          <h3 className="font-medium text-text-primary mb-4">协作里程碑</h3>
          <div className="grid grid-cols-5 gap-3">
            {MILESTONES.map((milestone) => {
              const progressData = milestoneProgress.find((m) => m.id === milestone.id);
              const isUnlocked = progressData?.unlocked ?? false;
              const progress = isUnlocked ? 100 : Math.min(100, Math.round(((progressData?.progress ?? 0) / milestone.requirement) * 100));
              return (
                <motion.div
                  key={milestone.id}
                  variants={itemVariants}
                  className={clsx(
                    'rounded-lg p-3 flex flex-col items-center text-center',
                    isUnlocked ? 'bg-bg-primary' : 'bg-bg-primary/50'
                  )}
                >
                  <span className="text-2xl mb-1">{isUnlocked ? milestone.icon : '🔒'}</span>
                  <span className="text-xs font-medium text-text-primary">
                    {isUnlocked ? milestone.name : '???'}
                  </span>
                  {isUnlocked && (
                    <span className="text-xs text-success mt-0.5">已达成</span>
                  )}
                  {!isUnlocked && (
                    <div className="w-full mt-1.5">
                      <div className="h-1 bg-border-default rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: progress + '%' }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary mt-0.5">{progress}%</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {detailTask && (
          <TaskDetail task={detailTask} onClose={() => setDetailTaskId(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
