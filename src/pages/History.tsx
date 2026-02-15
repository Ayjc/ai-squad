import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { useTaskStore } from '../stores';
import { ACHIEVEMENTS } from '../types/common';
import { TASK_MODE_INFO } from '../types/task';
import { clsx } from 'clsx';

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

export default function History() {
  const { tasks } = useTaskStore();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const historyItems: HistoryItem[] = useMemo(() => {
    if (tasks.length === 0) {
      return DEMO_HISTORY;
    }

    const sortedTasks = [...tasks].sort((a, b) => {
      const left = new Date(a.completedAt ?? a.startedAt ?? a.createdAt).getTime();
      const right = new Date(b.completedAt ?? b.startedAt ?? b.createdAt).getTime();
      return right - left;
    });

    return sortedTasks.map((task) => ({
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
  }, [tasks]);

  const stats = useMemo(() => {
    if (tasks.length === 0) {
      return {
        totalTasks: 128,
        completionRate: 94,
        avgDuration: '3m 42s',
        bestPartner: 'Claude',
        bestPartnerCount: 48,
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

    return {
      totalTasks,
      completionRate,
      avgDuration: formatSeconds(avgSeconds),
      bestPartner,
      bestPartnerCount,
    };
  }, [tasks]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">历史记录</h1>
        <button className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
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
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '总任务', value: stats.totalTasks, trend: '+12%', up: true },
          { label: '完成率', value: `${stats.completionRate}%`, trend: '+5%', up: true },
          { label: '平均耗时', value: stats.avgDuration, trend: '-30s', up: false },
          { label: '最佳拍档', value: stats.bestPartner, subtext: `${stats.bestPartnerCount}次协作` },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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
      </div>

      <div className="card mb-6">
        <h3 className="font-medium text-text-primary mb-4">今天</h3>
        <div className="space-y-3">
          {historyItems.map((item, index) => {
            const expanded = expandedTaskId === item.id;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 rounded-lg bg-bg-primary hover:bg-bg-primary/80 transition-colors"
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
                      onClick={() => setExpandedTaskId(expanded ? null : item.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      {expanded ? '收起结果' : `查看结果(${item.results.length})`}
                    </button>
                  )}
                </div>

                {expanded && item.results.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-default space-y-2">
                    {item.results.map((result, resultIndex) => (
                      <div
                        key={`${item.id}-${result.agentId}-${resultIndex}`}
                        className="rounded-lg border border-border-default bg-bg-secondary/60 p-2"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-primary font-medium">{result.agentId}</span>
                          <span className="text-text-secondary">耗时 {result.duration}</span>
                        </div>
                        {result.error && (
                          <p className="text-xs text-error mb-1">{result.error}</p>
                        )}
                        <pre className={clsx(
                          'text-xs whitespace-pre-wrap break-words max-h-28 overflow-y-auto',
                          result.success ? 'text-text-secondary' : 'text-error/90'
                        )}>
                          {result.content || '-'}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">成就墙 (v1 预览)</h3>
        <div className="flex gap-3">
          {ACHIEVEMENTS.map((achievement, index) => {
            const isUnlocked = index < 2;
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={clsx(
                  'w-16 h-20 rounded-lg flex flex-col items-center justify-center',
                  isUnlocked ? 'bg-bg-primary' : 'bg-bg-primary/50'
                )}
              >
                <span className="text-2xl">{isUnlocked ? achievement.icon : '🔒'}</span>
                <span className="text-xs text-text-secondary mt-1">
                  {isUnlocked ? achievement.name : '???'}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
