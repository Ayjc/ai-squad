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
      whileHover={{ y: -2 }}
      className={clsx(
        'card-hover cursor-pointer',
        isOnline && `agent-glow-${agent.id}`
      )}
      style={{ borderColor: isOnline ? `${agent.color}40` : undefined }}
    >
      {/* 头像 */}
      <div className="flex justify-center mb-3">
        <motion.div
          animate={isWorking ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${agent.color}20` }}
        >
          {agent.avatar}
        </motion.div>
      </div>

      {/* 名称和默契度 */}
      <div className="text-center mb-2">
        <h3 className="font-semibold text-text-primary">{agent.name}</h3>
        <p className="text-sm text-text-secondary flex items-center justify-center gap-1">
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>默契 {agent.level}%</span>
        </p>
      </div>

      {/* 状态 */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className={clsx(
          'status-dot',
          isOnline && !isWorking && 'status-online',
          isWorking && 'status-working',
          !isOnline && 'status-offline'
        )} />
        <span className="text-sm text-text-secondary">
          {isOnline ? (isWorking ? '工作中' : '空闲') : '离线'}
        </span>
      </div>

      {/* 进度条 (工作中时显示) */}
      {isWorking && (
        <div className="mb-3">
          <div className="h-1 bg-bg-primary rounded-full overflow-hidden">
            <motion.div
              className="h-full progress-animated"
              style={{ backgroundColor: agent.color, width: '60%' }}
            />
          </div>
          <p className="text-xs text-text-secondary text-center mt-1">📝 正在处理...</p>
        </div>
      )}

      {/* 默契度条 */}
      {!isWorking && (
        <div className="mb-3">
          <div className="h-1.5 bg-bg-primary rounded-full overflow-hidden">
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
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-center gap-2">
        {isOnline && !isWorking && (
          <button
            onClick={onAssignTask}
            className="btn-ghost text-xs py-1 px-3"
          >
            分配任务
          </button>
        )}
        {isWorking && (
          <button
            onClick={onViewProgress}
            className="btn-ghost text-xs py-1 px-3"
          >
            查看进度
          </button>
        )}
        {!isOnline && (
          <button
            onClick={onConnect}
            className="btn-ghost text-xs py-1 px-3"
          >
            连接
          </button>
        )}
      </div>
    </motion.div>
  );
}
