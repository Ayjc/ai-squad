import { motion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import type { Agent } from '../../types/agent';
import { clsx } from 'clsx';

interface AgentCardProps {
  agent: Agent;
  onAssignTask?: () => void;
  onViewProgress?: () => void;
  onConnect?: () => void;
}

export default function AgentCard({ agent, onAssignTask, onViewProgress, onConnect }: AgentCardProps) {
  const isOnline = agent.status !== 'offline';
  const isWorking = agent.status === 'working';

  return (
    <motion.div
      layout
      whileHover={{ y: -4 }}
      className={clsx(
        'card-hover cursor-pointer p-6 rounded-xl bg-surface-card border border-border-subtle transition-colors duration-300',
        isOnline && `agent-glow-${agent.id}`
      )}
    >
      {/* 头像 */}
      <motion.div layout className="flex justify-center mb-4">
        <motion.div
          animate={isWorking ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-sm relative z-10 bg-bg-surface"
          style={{ color: agent.color }}
        >
          {agent.avatar}
        </motion.div>
      </motion.div>

      {/* 名称和默契度 */}
      <motion.div layout className="text-center mb-4">
        <h3 className="text-lg font-bold text-text-primary tracking-tight mb-1">{agent.name}</h3>
        <p className="text-sm text-text-secondary flex items-center justify-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>默契 {agent.level}%</span>
        </p>
      </motion.div>

      {/* 状态 */}
      <motion.div layout className="flex items-center justify-center gap-2 mb-6">
        <span className={clsx(
          'status-dot ring-2 ring-surface-card',
          isOnline && !isWorking && 'status-online',
          isWorking && 'status-working',
          !isOnline && 'status-offline'
        )} />
        <span className="text-sm font-medium text-text-secondary">
          {isOnline ? (isWorking ? '工作中' : '空闲') : '离线'}
        </span>
      </motion.div>

      {/* 进度条 (工作中时显示) */}
      {isWorking && (
        <motion.div layout className="mb-6">
          <div className="h-2 bg-surface-hover/50 rounded-full overflow-hidden">
            <motion.div
              layout
              className="h-full rounded-full"
              style={{ backgroundColor: agent.color, width: '60%' }}
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 1,
                ease: "linear",
                repeat: Infinity,
              }}
            />
          </div>
          <p className="text-xs font-medium text-text-secondary text-center mt-2">📝 正在处理...</p>
        </motion.div>
      )}

      {/* 默契度条 */}
      {!isWorking && (
        <motion.div layout className="mb-6">
          <div className="h-2 bg-surface-hover/50 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                agent.level > 70 && 'shadow-[0_0_6px_currentColor]'
              )}
              style={{
                backgroundColor: agent.level < 30 ? '#8B949E' : agent.color,
                width: `${agent.level}%`
              }}
            />
          </div>
        </motion.div>
      )}

      {/* 操作按钮 */}
      <motion.div layout className="flex justify-center gap-3">
        {isOnline && !isWorking && (
          <button
            onClick={onAssignTask}
            aria-label={`分配任务给 ${agent.name}`}
            className="btn-ghost text-xs font-medium py-2 px-4 rounded-lg hover:bg-surface-hover transition-colors"
          >
            分配任务
          </button>
        )}
        {isWorking && (
          <button
            onClick={onViewProgress}
            aria-label={`查看 ${agent.name} 的进度`}
            className="btn-ghost text-xs font-medium py-2 px-4 rounded-lg hover:bg-surface-hover transition-colors"
          >
            查看进度
          </button>
        )}
        {!isOnline && (
          <button
            onClick={onConnect}
            aria-label={`连接 ${agent.name}`}
            className="btn-ghost text-xs font-medium py-2 px-4 rounded-lg hover:bg-surface-hover transition-colors"
          >
            连接
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
