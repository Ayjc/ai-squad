import { motion } from 'framer-motion';
import { Plus, TrendingUp, Target, Zap } from 'lucide-react';
import { useAgentStore, useTaskStore } from '../stores';
import { AgentCard } from '../components/AgentCard';

export default function Overview() {
  const { agents, getOnlineCount } = useAgentStore();
  const { tasks } = useTaskStore();

  const onlineCount = getOnlineCount();
  const totalAgents = agents.length;
  const completedToday = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length || 12;
  const power = agents.reduce((sum, a) => sum + a.tasksCompleted * 100 + a.level * 50, 0) || 2450;

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
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">战队状态</p>
              <p className="text-xl font-semibold text-text-primary">
                {onlineCount}/{totalAgents} 在线
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-text-secondary text-sm">总战力</p>
              <p className="text-xl font-semibold text-text-primary">
                ⚔️ {power.toLocaleString()}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 主要内容区 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 战队状态 */}
        <div className="card">
          <h2 className="text-lg font-medium text-text-primary mb-4">战队状态</h2>
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
            {[
              { time: '10:32', action: 'Codex 完成任务', type: 'success' },
              { time: '10:28', action: 'Claude 回复', type: 'info' },
              { time: '10:15', action: '新任务分配', type: 'info' },
              { time: '10:05', action: 'Gemini 上线', type: 'success' },
            ].map((activity, i) => (
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
                    activity.type === 'success' ? 'bg-success' : 'bg-accent'
                  }`}
                />
                <span className="text-text-primary">{activity.action}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
