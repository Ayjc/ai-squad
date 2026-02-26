import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useAgentStore } from '../stores';
import { getCollaborationStats } from '../services/tauriService';
import { retentionRun } from '../services/retentionService';
import { hasApiKey, setApiKey } from '../services/keyService';
import type { CollaborationStat } from '../types/common';
import { clsx } from 'clsx';

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

const formatDuration = (ms: number) => {
  if (ms <= 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${seconds}s`;
};

export default function Settings() {
  const { agents } = useAgentStore();
  const [collabStats, setCollabStats] = useState<CollaborationStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [retentionLoading, setRetentionLoading] = useState(false);

  const [claudeKeyInput, setClaudeKeyInput] = useState('');
  const [claudeSaving, setClaudeSaving] = useState(false);
  const [claudeKeyConfigured, setClaudeKeyConfigured] = useState<boolean | null>(null);
  const [retentionReport, setRetentionReport] = useState<null | {
    dbPath: string;
    dbSizeBytes: number;
    maxBytes: number;
    maxDays: number;
    deletedRows: number;
  }>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const stats = await getCollaborationStats();
      if (stats) {
        setCollabStats(stats);
      }
    } catch (error) {
      console.warn('获取协作统计失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    (async () => {
      try {
        const ok = await hasApiKey('claude');
        setClaudeKeyConfigured(ok);
      } catch (err) {
        console.warn('Check Claude key failed:', err);
        setClaudeKeyConfigured(false);
      }
    })();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let i = 0;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  };

  const runRetention = async () => {
    setRetentionLoading(true);
    try {
      const report = await retentionRun(false);
      setRetentionReport({
        dbPath: report.db_path,
        dbSizeBytes: report.db_size_bytes,
        maxBytes: report.max_bytes,
        maxDays: report.max_days,
        deletedRows: report.deleted_rows,
      });
    } catch (error) {
      console.warn('Retention run failed:', error);
      setRetentionReport(null);
    } finally {
      setRetentionLoading(false);
    }
  };

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
          <h1 className="page-title">设置</h1>
        </motion.div>

        {/* Provider 配置 */}
        <motion.div variants={itemVariants} className="card mb-6">
          <h3 className="font-medium text-text-primary mb-4">AI Provider</h3>

          <div className="space-y-4">
            <div className="rounded-xl border border-border-subtle bg-bg-primary p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">Claude API Key</div>
                  <div className="text-xs text-text-secondary mt-1">
                    存储位置：`~/.ai-squad/keys.json.enc`（加密） + keyring 主密钥
                  </div>
                </div>
                <div className={clsx('text-xs px-2 py-1 rounded-full border', 'border-border-subtle text-text-tertiary')}>
                  V1
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={claudeKeyInput}
                  onChange={(e) => setClaudeKeyInput(e.target.value)}
                  type="password"
                  placeholder="sk-ant-..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border-subtle bg-bg-surface text-sm"
                />
                <button
                  type="button"
                  className="btn-primary px-4"
                  disabled={claudeSaving}
                  onClick={async () => {
                    const v = claudeKeyInput.trim();
                    if (!v) return;
                    setClaudeSaving(true);
                    try {
                      await setApiKey('claude', v);
                      setClaudeKeyInput('');
                      const ok = await hasApiKey('claude');
                      setClaudeKeyConfigured(ok);
                    } catch (err) {
                      console.warn('Save Claude key failed:', err);
                    } finally {
                      setClaudeSaving(false);
                    }
                  }}
                >
                  保存
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-text-secondary">
                  状态：{
                    claudeKeyConfigured == null
                      ? '检测中...'
                      : claudeKeyConfigured
                        ? '已配置'
                        : '未配置'
                  }
                </div>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={async () => {
                    try {
                      const ok = await hasApiKey('claude');
                      setClaudeKeyConfigured(ok);
                    } catch (err) {
                      console.warn('Check Claude key failed:', err);
                    }
                  }}
                >
                  检测
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.25, ease: 'easeOut' }}
                  className="flex items-center gap-4 p-3 rounded-lg bg-bg-primary"
                >
                  <span className="text-2xl">{agent.avatar}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{agent.name}</span>
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          agent.status === 'online'
                            ? 'bg-success'
                            : agent.status === 'working'
                              ? 'bg-warning'
                              : 'bg-text-secondary'
                        )}
                      />
                      <span className="text-xs text-text-secondary">{agent.status}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{agent.displayName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-primary">默契 {agent.level}</p>
                    <p className="text-xs text-text-secondary">
                      {agent.tasksCompleted} 完成 / {agent.tasksFailed ?? 0} 失败
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 数据清理 */}
        <motion.div variants={itemVariants} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">本地数据清理</h3>
            <button
              type="button"
              onClick={runRetention}
              disabled={retentionLoading}
              className="btn-ghost flex items-center gap-1 text-sm"
              title="Run retention cleanup (90 days + 1GB)"
            >
              <Trash2 className={clsx('w-4 h-4', retentionLoading && 'animate-pulse')} />
              清理
            </button>
          </div>
          <p className="text-text-secondary text-sm">
            默认保留策略：90 天 + 1GB（超出会删除最旧记录）。
          </p>
          {retentionReport && (
            <div className="mt-3 text-sm text-text-secondary space-y-1">
              <div>DB: <span className="text-text-primary">{retentionReport.dbPath}</span></div>
              <div>当前大小: <span className="text-text-primary">{formatBytes(retentionReport.dbSizeBytes)}</span></div>
              <div>阈值: <span className="text-text-primary">{formatBytes(retentionReport.maxBytes)} / {retentionReport.maxDays} days</span></div>
              <div>删除行数: <span className="text-text-primary">{retentionReport.deletedRows}</span></div>
            </div>
          )}
        </motion.div>

        {/* 协作统计 */}
        <motion.div variants={itemVariants} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-text-primary">协作统计</h3>
            <button
              type="button"
              onClick={fetchStats}
              disabled={loading}
              className="btn-ghost flex items-center gap-1 text-sm"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
              刷新
            </button>
          </div>
          {collabStats.length === 0 ? (
            <p className="text-text-secondary text-sm">暂无协作数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-secondary border-b border-border-default">
                    <th className="pb-2 font-medium">组合</th>
                    <th className="pb-2 font-medium">模式</th>
                    <th className="pb-2 font-medium text-right">总任务</th>
                    <th className="pb-2 font-medium text-right">成功</th>
                    <th className="pb-2 font-medium text-right">成功率</th>
                    <th className="pb-2 font-medium text-right">平均耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {collabStats.map((stat) => {
                    const rate = stat.totalTasks > 0
                      ? Math.round((stat.successCount / stat.totalTasks) * 100)
                      : 0;
                    return (
                      <tr
                        key={`${stat.agentCombo}-${stat.mode}`}
                        className="border-b border-border-default/50"
                      >
                        <td className="py-2 text-text-primary">{stat.agentCombo}</td>
                        <td className="py-2 text-text-secondary">{stat.mode}</td>
                        <td className="py-2 text-right text-text-primary">{stat.totalTasks}</td>
                        <td className="py-2 text-right text-success">{stat.successCount}</td>
                        <td className="py-2 text-right text-text-primary">{rate}%</td>
                        <td className="py-2 text-right text-text-secondary">{formatDuration(stat.avgDurationMs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* 关于 */}
        <motion.div variants={itemVariants} className="card">
          <h3 className="font-medium text-text-primary mb-4">关于</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>AI Squad v2.0</p>
            <p>多 AI 协作任务管理平台</p>
            <p>基于 Tauri + React + TypeScript 构建</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
