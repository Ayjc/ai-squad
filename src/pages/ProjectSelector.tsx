import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Zap, Clock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProjectStore } from '../stores';
import { getProjectInfo, startCcb, getCcbStatus } from '../services/tauriService';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function ProjectSelector() {
  const { recentProjects, setCurrentProject, setCcbStatus } = useProjectStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingPath, setConnectingPath] = useState<string | null>(null);
  const [error, setError] = useState('');

  const connectToProject = async (projectPath: string) => {
    setIsConnecting(true);
    setConnectingPath(projectPath);
    setError('');

    try {
      const info = await getProjectInfo(projectPath);
      if (!info) {
        setError('Unable to read project directory');
        return;
      }

      // Check if CCB is already running
      let status = await getCcbStatus(projectPath);

      if (!status || status.mounted.length === 0) {
        // Start CCB with default providers
        const defaultProviders = ['codex', 'claude'];
        status = await startCcb(projectPath, defaultProviders);
      }

      if (status) {
        setCcbStatus(status.running, status.mounted);
      }

      setCurrentProject(projectPath, info.name);
    } catch (err) {
      setError(`Connection failed: ${String(err)}`);
    } finally {
      setIsConnecting(false);
      setConnectingPath(null);
    }
  };

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Project Directory',
    });

    if (selected && typeof selected === 'string') {
      await connectToProject(selected);
    }
  };

  return (
    <div className="flex h-screen bg-bg-primary text-text-primary items-center justify-center">
      <motion.div
        className="w-full max-w-lg px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo & Title */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/24 to-accent/8 border border-accent/25 flex items-center justify-center mx-auto mb-4 shadow-[0_10px_22px_-14px_rgba(46,122,118,0.48)]">
            <Zap className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">AI Squad</h1>
          <p className="text-text-secondary text-sm">Select a project to start collaborating</p>
        </motion.div>

        {/* Select Folder Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={handleSelectFolder}
            disabled={isConnecting}
            className="w-full card p-6 rounded-xl flex items-center gap-4 hover:border-accent/40 transition-colors group cursor-pointer disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <FolderOpen className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-text-primary">Open Project</p>
              <p className="text-sm text-text-secondary">Select a folder to connect CCB</p>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary" />
          </button>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-error/10 border border-error/20 flex items-center gap-2 text-sm text-error"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <motion.div variants={itemVariants} className="mt-8">
            <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Projects
            </h2>
            <div className="space-y-2">
              {recentProjects.map((project) => {
                const isThisConnecting = connectingPath === project.path;
                return (
                  <button
                    key={project.path}
                    onClick={() => connectToProject(project.path)}
                    disabled={isConnecting}
                    className="w-full text-left card px-4 py-3 rounded-lg hover:border-accent/30 transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    <FolderOpen className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-text-tertiary truncate">{project.path}</p>
                    </div>
                    {isThisConnecting && (
                      <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
