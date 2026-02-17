import { motion } from 'framer-motion';
import { Plus, Target, Zap, HeartHandshake } from 'lucide-react';
import { useAgentStore, useTaskStore } from '../stores';
import { AgentCard } from '../components/AgentCard';

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
    <motion.div
      className="page-shell"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="page-container">
        {/* 头部 */}
        <motion.div variants={itemVariants} className="page-header">
          <h1 className="page-title">概览</h1>
          <button className="btn-primary flex items-center gap-2 rounded-lg px-4 py-2 min-h-[44px]">
            <Plus className="w-4 h-4" />
            快速任务
          </button>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <motion.div
            variants={itemVariants}
            className="card p-6 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg-surface flex items-center justify-center">
                <Target className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium mb-1">团队状态</p>
                <p className="text-2xl font-bold text-text-primary tracking-tight">
                  {onlineCount}/{totalAgents} <span className="text-base font-normal text-text-tertiary">在线</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card p-6 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg-surface flex items-center justify-center">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium mb-1">今日任务</p>
                <p className="text-2xl font-bold text-text-primary tracking-tight">
                  {totalTasks} <span className="text-base font-normal text-text-tertiary">个</span> · {completedToday} <span className="text-base font-normal text-text-tertiary">完成</span>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="card p-6 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg-surface flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" style={{ color: bestPartner?.color ?? '#C89A3F' }} />
              </div>
              <div>
                <p className="text-text-secondary text-sm font-medium mb-1">最佳搭档</p>
                <p className="text-lg font-bold text-text-primary tracking-tight truncate max-w-[180px]">
                  {bestPartner && bestPartner.tasksCompleted > 0
                    ? `${bestPartner.name} · ${bestPartner.tasksCompleted} 次`
                    : '暂无协作数据'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 主要内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* 团队状态 */}
          <motion.div variants={itemVariants} className="card p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-text-primary mb-6">团队状态</h2>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </motion.div>

          {/* 最近活动 */}
          <motion.div variants={itemVariants} className="card p-6 rounded-xl">
            <h2 className="text-xl font-semibold text-text-primary mb-6">最近活动</h2>
            <div className="space-y-4">
              {recentEvents.length > 0 ? (
                recentEvents.map((activity, i) => (
                  <motion.div
                    key={i}
                    variants={itemVariants}
                    className="flex items-center gap-4 text-sm group"
                  >
                    <span className="text-text-tertiary w-14 font-mono text-xs">{activity.time}</span>
                    <div className="relative flex items-center justify-center w-4">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                          activity.type === 'error' ? 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-accent shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                        }`}
                      />
                      <div className="absolute h-full w-px bg-border-subtle top-4 -z-10 group-last:hidden" />
                    </div>
                    <span className="text-text-secondary group-hover:text-text-primary transition-colors">{activity.action}</span>
                  </motion.div>
                ))
              ) : (
                <p className="text-text-secondary text-sm">暂无活动记录，创建你的第一个任务吧</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
