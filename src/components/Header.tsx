import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  Moon,
  Globe,
  LogOut,
  Settings,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { currentUser, logout, isSuperAdmin } = useAuth();
  const { isDark, setMode } = useTheme();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ht', label: 'Kreyòl ayisyen', flag: '🇭🇹' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  const handleLangChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('proctus_language', code);
    setShowLangMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-white/95 dark:bg-[#0A1F44]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors px-4 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left: Mobile hamburger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Toggle Navigation"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link to="/app/feed" className="flex items-center">
          <Logo size={36} showText={true} />
        </Link>
      </div>

      {/* Right controls: Theme + Language + User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => setMode(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl text-slate-600 dark:text-[#C9A227] hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
          title={isDark ? 'Passer en mode jour' : 'Passer en mode nuit'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Language selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Globe className="w-4 h-4 text-[#C9A227]" />
            <span className="uppercase">{i18n.language.slice(0, 2)}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-[#131E35] shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in">
              <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Choisir la langue
              </div>
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleLangChange(l.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition ${
                    i18n.language.startsWith(l.code)
                      ? 'bg-[#C9A227]/15 text-[#C9A227] font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-sm">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile dropdown */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 pl-2 rounded-full border border-slate-200 dark:border-slate-700 hover:border-[#C9A227] transition cursor-pointer"
            >
              <span className="hidden md:inline text-xs font-bold text-[#0A1F44] dark:text-white max-w-[120px] truncate">
                {currentUser.firstName}
              </span>
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.firstName}`}
                alt={currentUser.firstName}
                className="w-8 h-8 rounded-full object-cover border border-[#C9A227]"
              />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#131E35] shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in text-sm">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-[#0A1F44] dark:text-white truncate">
                      {currentUser.firstName} {currentUser.lastName}
                    </span>
                    {isSuperAdmin ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#C9A227] text-[#0A1F44] text-[9px] font-black uppercase">
                        SuperAdmin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-semibold">
                        SimpleUser
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#C9A227] font-semibold mt-0.5">
                    Promotion {currentUser.cohort} • {currentUser.specialty}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                </div>

                <Link
                  to="/app/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Paramètres et Mon compte</span>
                </Link>

                <Link
                  to="/app/about"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition"
                >
                  <Sparkles className="w-4 h-4 text-[#C9A227]" />
                  <span>Guide et Installation PWA</span>
                </Link>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
