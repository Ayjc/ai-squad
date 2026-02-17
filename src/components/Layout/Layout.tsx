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
  { to: '/squad', icon: Users, label: '团队' },
  { to: '/tasks', icon: ClipboardList, label: '任务' },
  { to: '/history', icon: History, label: '历史' },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-bg-primary text-text-primary">
      {/* 侧边栏 */}
      <aside className="w-[72px] bg-bg-surface/90 border-r border-border-subtle backdrop-blur-sm flex flex-col items-center py-5 shadow-[inset_-1px_0_0_rgba(44,42,39,0.04)]">
        {/* Logo */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/24 to-accent/8 border border-accent/25 flex items-center justify-center mb-9 shadow-[0_10px_22px_-14px_rgba(46,122,118,0.48)]">
          <Zap className="w-6 h-6 text-accent" />
        </div>

        {/* 导航 */}
        <nav className="flex-1 flex flex-col gap-2.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              className={({ isActive }) =>
                `group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-muted text-accent border border-accent/25 shadow-[0_8px_16px_-14px_rgba(46,122,118,0.42)]'
                    : 'text-text-secondary border border-transparent hover:text-text-primary hover:bg-bg-secondary/70 hover:border-border-default'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-[7px] top-3 bottom-3 w-0.5 rounded-r bg-accent/90" />
                  )}
                  <item.icon className="w-5 h-5" />
                  <span className="absolute left-14 px-2 py-1 rounded-lg bg-bg-surface border border-border-default text-xs text-text-primary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-lg">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 底部设置 */}
        <NavLink
          to="/settings"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-text-secondary border border-transparent hover:text-text-primary hover:bg-bg-secondary/70 hover:border-border-default transition-all duration-200"
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
