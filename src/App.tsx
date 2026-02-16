import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout/Layout';
import Overview from './pages/Overview';
import Squad from './pages/Squad';
import Tasks from './pages/Tasks';
import History from './pages/History';
import Settings from './pages/Settings';
import { useAgentStore, useTaskStore } from './stores';
import { getProviders, getTasks } from './services/tauriService';

function App() {
  const location = useLocation();
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
    const syncFromTauri = async () => {
      const [providers, tasks] = await Promise.all([getProviders(), getTasks()]);

      if (providers) {
        syncProviderStatuses(providers);
      }

      if (tasks) {
        setTasks(tasks);
      }
    };

    syncFromTauri();
  }, [setTasks, syncProviderStatuses]);

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Overview />} />
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
