import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { useAuth } from '../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Protected route check: if no user is signed in, redirect to login
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#070F22] text-[#0A1F44] dark:text-slate-100 flex flex-col">
      <Header
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
      />
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <OfflineIndicator />
    </div>
  );
};
