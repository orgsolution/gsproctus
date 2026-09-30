import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  Trophy,
  BookOpen,
  Settings,
  WifiOff,
  HelpCircle,
  Award,
  Flame,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getSchoolConfig, saveSchoolConfig } from '../services/storage';
import { fetchOnlineData } from '../services/apiSync';
import { SchoolConfig } from '../types';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { t } = useTranslation();
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(getSchoolConfig);

  useEffect(() => {
    fetchOnlineData().then(data => {
      if (data && data.schoolConfig) {
        setSchoolConfig(data.schoolConfig);
        saveSchoolConfig(data.schoolConfig);
      }
    });

    const handleConfigUpdate = (e: CustomEvent<SchoolConfig>) => {
      if (e.detail) {
        setSchoolConfig(e.detail);
      } else {
        setSchoolConfig(getSchoolConfig());
      }
    };
    window.addEventListener('proctus-school-config-update', handleConfigUpdate as EventListener);
    return () => {
      window.removeEventListener('proctus-school-config-update', handleConfigUpdate as EventListener);
    };
  }, []);

  const navItems = [
    {
      to: '/app/feed',
      label: 'Réseaux',
      icon: MessageSquare,
    },
    {
      to: '/app/games',
      label: 'QCM Arena',
      icon: Trophy,
      badge: 'Live',
      badgeColor: 'bg-[#E63946] text-white',
    },
    {
      to: '/app/library',
      label: t('nav.library'),
      icon: BookOpen,
    },
    {
      to: '/app/settings',
      label: t('nav.settings'),
      icon: Settings,
    },
    {
      to: '/app/offline',
      label: t('nav.offline'),
      icon: WifiOff,
    },
    {
      to: '/app/about',
      label: t('nav.about'),
      icon: HelpCircle,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-16 z-40 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white dark:bg-[#0A1F44] border-r border-slate-200/80 dark:border-slate-800 transition-transform duration-300 ease-in-out flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Promotion Cohort Card Header (Customizable by SuperAdmin) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0A1F44] to-[#152e5c] text-white shadow-md border border-[#C9A227]/30">
            <div className="flex items-center justify-between text-xs text-[#C9A227] font-semibold mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#F4A261]" />
                {schoolConfig.headerSubtitle || 'Promotion Officielle'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#C9A227]/20 text-[#C9A227] text-[10px] font-mono">
                {currentUser?.cohort || schoolConfig.cohortLabel || '2025'}
              </span>
            </div>
            <div className="font-bold text-sm text-white">
              {schoolConfig.schoolName || 'Haute École de Finance'}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#C9A227]" />
              {currentUser?.specialty || 'Audit et Comptabilité'} • {schoolConfig.badgeText || 'Certifié'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Espaces Principaux
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#0A1F44] text-[#C9A227] shadow-sm dark:bg-[#132B5B] dark:text-[#C9A227]'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-[#0A1F44] dark:hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-[#C9A227]/15 text-[#C9A227]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Current User Widget with RBAC Indicator */}
        {currentUser && (
          <div className="p-3 m-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.firstName}`}
                alt={currentUser.firstName}
                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[#C9A227]/60"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{currentUser.firstName} {currentUser.lastName}</span>
                  {isSuperAdmin && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#C9A227] text-[#0A1F44] text-[9px] font-black uppercase tracking-tight shrink-0 shadow-xs">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-semibold text-[#C9A227] truncate">
                  {(currentUser.totalScore || 0).toLocaleString()} pts
                </div>
              </div>
            </div>
            <NavLink
              to="/app/settings"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              title="Paramètres"
            >
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};
