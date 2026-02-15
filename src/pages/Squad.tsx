import { motion } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { useAgentStore } from '../stores';
import { AgentCard } from '../components/AgentCard';

export default function Squad() {
  const { agents, updateAgentStatus } = useAgentStore();

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">团队</h1>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加角色
          </button>
          <button className="btn-ghost p-2">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 角色网格 */}
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AgentCard
              agent={agent}
              onAssignTask={() => {
                // TODO: 接入任务分配弹窗
              }}
              onViewProgress={() => {
                // TODO: 接入任务详情侧栏
              }}
              onConnect={() => {
                updateAgentStatus(agent.id, 'online');
              }}
            />
          </motion.div>
        ))}

        {/* 添加更多卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: agents.length * 0.1 }}
          className="card-hover flex items-center justify-center min-h-[200px] border-dashed"
        >
          <button className="flex flex-col items-center gap-2 text-text-secondary hover:text-accent transition-colors">
            <Plus className="w-8 h-8" />
            <span>添加更多</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
