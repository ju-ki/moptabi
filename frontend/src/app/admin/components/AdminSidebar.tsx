'use client';

import { Users, Clock, Bell, LayoutDashboard } from 'lucide-react';

import { cn } from '@/lib/utils';

export type AdminNavItem = 'dashboard' | 'users' | 'activity' | 'notifications';

interface AdminSidebarProps {
  activeNav: AdminNavItem;
  onNavChange: (nav: AdminNavItem) => void;
}

const navItems: { id: AdminNavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'users', label: 'ユーザー一覧', icon: <Users className="w-5 h-5" /> },
  // { id: 'activity', label: '滞在時間管理', icon: <Clock className="w-5 h-5" /> },
  { id: 'notifications', label: 'お知らせ管理', icon: <Bell className="w-5 h-5" /> },
];

/**
 * 管理画面のサイドバーナビゲーション
 */
export const AdminSidebar = ({ activeNav, onNavChange }: AdminSidebarProps) => {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">管理画面</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
              activeNav === item.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
