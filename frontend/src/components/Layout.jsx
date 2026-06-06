import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { LayoutDashboard, Briefcase, FileText, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Layout() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Applications', path: '/applications', icon: Briefcase },
    { name: 'Resumes', path: '/resumes', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden",
          "transition-[width] duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-0 border-r-0"
        )}
      >
        {/* Inner wrapper keeps content at fixed width so it slides cleanly */}
        <div className="w-64 flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap">
              ApplyWise
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{currentUser?.name}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors whitespace-nowrap"
            >
              <LogOut className="w-5 h-5 text-slate-400 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          className={cn(
            "fixed top-4 z-10 p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 shadow-sm transition-all duration-300 ease-in-out",
            sidebarOpen ? "left-[268px] opacity-0 pointer-events-none" : "left-4 opacity-100"
          )}
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
