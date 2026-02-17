import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentStore, useTaskStore } from '../stores';
import { AgentCard } from '../components/AgentCard';
import { TaskDetail } from '../components/TaskDetail';
import type { Task } from '../types/task';

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

export default function Squad() {
  const navigate = useNavigate();
  const { tasks } = useTaskStore();
  const { agents, updateAgentStatus } = useAgentStore();
  const [detailTask, setDetailTask] = useState<Task | null>(null);

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
          <h1 className="page-title">团队</h1>
          <div className="page-actions">
            <button className="btn-secondary flex items-center gap-2 rounded-lg px-4 py-2 min-h-[44px]">
              <Plus className="w-4 h-4" />
              添加角色
            </button>
            <button className="btn-ghost p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* 角色网格 */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              variants={itemVariants}
            >
              <AgentCard
                agent={agent}
                onAssignTask={() => {
                  navigate('/tasks', { state: { preselectedAgent: agent.id } });
                }}
                onViewProgress={() => {
                  const agentTask = tasks
                    .filter(
                      (t) =>
                        t.assignees.includes(agent.id) &&
                        (t.status === 'running' || t.status === 'completed')
                    )
                    .sort((a, b) => {
                      const ta = new Date(a.completedAt ?? a.startedAt ?? a.createdAt).getTime();
                      const tb = new Date(b.completedAt ?? b.startedAt ?? b.createdAt).getTime();
                      return tb - ta;
                    })[0];

                  if (agentTask) {
                    setDetailTask(agentTask);
                  }
                }}
                onConnect={() => {
                  updateAgentStatus(agent.id, 'online');
                }}
              />
            </motion.div>
          ))}

          {/* 添加更多卡片 */}
          <motion.div
            variants={itemVariants}
            className="card-hover flex items-center justify-center min-h-[320px] border-2 border-dashed border-border-subtle rounded-xl hover:border-accent/50 hover:bg-surface-hover/50 transition-all group cursor-pointer"
          >
            <button className="flex flex-col items-center gap-4 text-text-secondary group-hover:text-accent transition-colors w-full h-full justify-center">
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <Plus className="w-8 h-8" />
              </div>
              <span className="font-medium">添加更多</span>
            </button>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {detailTask && (
          <TaskDetail task={detailTask} onClose={() => setDetailTask(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
