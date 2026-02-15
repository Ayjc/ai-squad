import { motion } from 'framer-motion';
import { Plus, Target, Zap, HeartHandshake } from 'lucide-react';
import { useAgentStore, useTaskStore } from '../stores';
import { AgentCard } from '../components/AgentCard';

export default function Overview() {
  const { agents, getOnlineCount } = useAgentStore();
  const { tasks, getRecentEvents } = useTaskStore();

  const onlineCount = getOnlineCount();
  const totalAgents = agents.length;
  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length || 12;
  const bestPartner = agents.length > 0
    ? agents.reduce((best, agent) =>
      agent.tasksCompleted > best.tasksCompleted ? agent : best
    )
    : null;
  const recentEvents = getRecentEvents();

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">概览</h1>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          快速任务
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: 'easeOut' }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">团队状态</p>
              <p className="text-xl font-semibold text-text-primary">
                {onlineCount}/{totalAgents} 在线
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: 'easeOut' }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">今日任务</p>
              <p className="text-xl font-semibold text-text-primary">
                {totalTasks} 个 · {completedToday} 完成
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: 'easeOut' }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: bestPartner ? `${bestPartner.color}20` : 'rgba(210, 153, 34, 0.2)' }}
            >
              <HeartHandshake className="w-5 h-5" style={{ color: bestPartner?.color ?? '#D29922' }} />
            </div>
            <div>
              <p className="text-text-secondary text-sm">最佳搭档</p>
              <p className="text-xl font-semibold text-text-primary">
                {bestPartner && bestPartner.tasksCompleted > 0
                  ? `${bestPartner.name} · ${bestPartner.tasksCompleted} 次协作`
                  : '暂无协作数据'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 团队状态 */}
        <div className="card">
          <h2 className="text-lg font-medium text-text-primary mb-4">团队状态</h2>
          <div className="flex flex-wrap gap-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="card">
          <h2 className="text-lg font-medium text-text-primary mb-4">最近活动</h2>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="text-text-secondary w-12">{activity.time}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activity.type === 'success' ? 'bg-success' : activity.type === 'error' ? 'bg-error' : 'bg-accent'
                    }`}
                  />
                  <span className="text-text-primary">{activity.action}</span>
                </motion.div>
              ))
            ) : (
              <p className="text-text-secondary text-sm">暂无活动记录，创建你的第一个任务吧</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
