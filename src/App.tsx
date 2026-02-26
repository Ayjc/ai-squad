import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Overview from './pages/Overview';
import Squad from './pages/Squad';
import Tasks from './pages/Tasks';
import History from './pages/History';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import ProjectSelector from './pages/ProjectSelector';
import { useAgentStore, useTaskStore, useProjectStore } from './stores';
import { getProviders, getTasks } from './services/tauriService';

function App() {
  const location = useLocation();
  const { currentProject } = useProjectStore();
  const {
    agents,
    initializeAgents,
    syncProviderStatuses,
  } = useAgentStore();
  const { setTasks } = useTaskStore();

  useEffect(() => {
    if (agents.length === 0) {
      initializeAgents();
    }
  }, [agents.length, initializeAgents]);

  useEffect(() => {
    if (!currentProject) return;

    const syncFromTauri = async () => {
      const [providers, tasks] = await Promise.all([
        getProviders(currentProject),
        getTasks(),
      ]);

      if (providers) {
        syncProviderStatuses(providers);
      }

      if (tasks) {
        setTasks(tasks);
      }
    };

    syncFromTauri();
  }, [currentProject, setTasks, syncProviderStatuses]);

  if (!currentProject) {
    return <ProjectSelector />;
  }

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Overview />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/squad" element={<Squad />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
