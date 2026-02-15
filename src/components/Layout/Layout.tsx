import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  History,
  Settings,
  Zap
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '概览' },
  { to: '/squad', icon: Users, label: '战队' },
  { to: '/tasks', icon: ClipboardList, label: '任务' },
  { to: '/history', icon: History, label: '历史' },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary">
      {/* 侧边栏 */}
      <aside className="w-16 bg-bg-secondary border-r border-border-default flex flex-col items-center py-4">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center mb-8">
          <Zap className="w-6 h-6 text-accent" />
        </div>

        {/* 导航 */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
            </NavLink>
          ))}
        </nav>

        {/* 底部设置 */}
        <NavLink
          to="/settings"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
        >
          <Settings className="w-5 h-5" />
        </NavLink>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
