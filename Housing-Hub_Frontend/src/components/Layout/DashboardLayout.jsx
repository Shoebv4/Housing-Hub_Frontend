import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Building2, Menu } from 'lucide-react';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import { ThemeToggle } from '../UI';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          tabIndex={-1}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-16 flex-shrink-0 items-center border-b border-line bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
              <Building2 className="h-5 w-5 text-accent" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">HousingHub</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className={clsx('flex-1', isSidebarOpen ? 'overflow-hidden' : 'overflow-y-auto')}>
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
