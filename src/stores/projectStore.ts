import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RecentProject {
  path: string;
  name: string;
  lastOpenedAt: string;
}

interface ProjectState {
  currentProject: string | null;      // current project path
  currentProjectName: string | null;
  recentProjects: RecentProject[];
  ccbRunning: boolean;
  mountedProviders: string[];

  setCurrentProject: (path: string, name: string) => void;
  clearCurrentProject: () => void;
  setCcbStatus: (running: boolean, mounted: string[]) => void;
  addRecentProject: (path: string, name: string) => void;
}

const MAX_RECENT = 10;

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      currentProjectName: null,
      recentProjects: [],
      ccbRunning: false,
      mountedProviders: [],

      setCurrentProject: (path, name) => {
        set({ currentProject: path, currentProjectName: name });
        get().addRecentProject(path, name);
      },

      clearCurrentProject: () => {
        set({
          currentProject: null,
          currentProjectName: null,
          ccbRunning: false,
          mountedProviders: [],
        });
      },

      setCcbStatus: (running, mounted) => {
        set({ ccbRunning: running, mountedProviders: mounted });
      },

      addRecentProject: (path, name) => {
        set((state) => {
          const filtered = state.recentProjects.filter((p) => p.path !== path);
          const entry: RecentProject = {
            path,
            name,
            lastOpenedAt: new Date().toISOString(),
          };
          return {
            recentProjects: [entry, ...filtered].slice(0, MAX_RECENT),
          };
        });
      },
    }),
    {
      name: 'ai-squad-project',
    }
  )
);
