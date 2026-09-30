import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getAllDocuments } from '../services/indexedDb';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Trophy,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle,
  Laptop,
  Smartphone
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { osName, isIOS } = usePWAInstall();
  const { t } = useTranslation();

  // Real statistics that increment with actual data in the app
  const [realMembersCount, setRealMembersCount] = useState(0);
  const [realGamesCount, setRealGamesCount] = useState(0);
  const [realDocsCount, setRealDocsCount] = useState(0);

  useEffect(() => {
    try {
      const rawUsers = localStorage.getItem('proctus_users');
      if (rawUsers) {
        const u = JSON.parse(rawUsers);
        if (Array.isArray(u)) setRealMembersCount(u.length);
      }
      const rawGames = localStorage.getItem('proctus_games');
      if (rawGames) {
        const g = JSON.parse(rawGames);
        if (Array.isArray(g)) setRealGamesCount(g.length);
      }
      getAllDocuments().then(docs => {
        setRealDocsCount(docs.length);
      });
    } catch (e) {
      console.warn('Error reading stats:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#070F22] text-[#0A1F44] dark:text-slate-100 flex flex-col selection:bg-[#C9A227]/30 selection:text-[#0A1F44]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full h-20 bg-white/90 dark:bg-[#0A1F44]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 lg:px-12 flex items-center justify-between">
        <Logo size={42} showText={true} />
        <div className="flex items-center gap-3">
          <Link
            to="/auth?mode=login"
            className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:text-[#0A1F44] dark:hover:text-[#C9A227] hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Connexion
          </Link>
          <Link
            to="/auth?mode=signup"
            className="px-5 py-2.5 text-sm font-bold rounded-xl bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] border border-[#C9A227]/40 shadow-md transition cursor-pointer"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 px-6 lg:px-12 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Subtle background financial chart styling */}
        <div className="absolute top-10 right-10 -z-10 w-96 h-96 bg-[#C9A227]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 -z-10 w-96 h-96 bg-[#0A1F44]/15 rounded-full blur-3xl" />

        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0A1F44]/5 dark:bg-[#C9A227]/10 border border-[#C9A227]/30 text-xs font-bold text-[#0A1F44] dark:text-[#C9A227] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
            Finance cohort
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#0A1F44] dark:text-white leading-[1.15]">
            L'Excellence Financière en <span className="text-[#C9A227]">Réseaux et Compétition</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('landing.heroSubtitle')}
          </p>

          {/* Call to actions and OS Detection */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/app/feed"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-base shadow-xl shadow-[#0A1F44]/25 flex items-center justify-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{t('landing.ctaEnter')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Smart OS Installation Button */}
            <div className="w-full sm:w-auto flex flex-col items-center">
              <PWAInstallButton
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-[#131E35] border-2 border-[#C9A227] text-[#0A1F44] dark:text-white font-bold hover:bg-[#C9A227]/10 text-base shadow-md cursor-pointer"
              />
            </div>
          </div>

          {/* OS detected badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2">
            {isIOS ? (
              <Smartphone className="w-3.5 h-3.5 text-[#C9A227]" />
            ) : (
              <Laptop className="w-3.5 h-3.5 text-[#C9A227]" />
            )}
            <span>
              {t('landing.detectedOS')} : <strong className="text-[#0A1F44] dark:text-white">{osName}</strong> • PWA multiplateforme synchronisée
            </span>
          </div>
        </div>

        {/* 3 Pillars Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {/* Pilier 1 : Réseaux */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0A1F44]/60 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-[#C9A227]/60 transition-all duration-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0A1F44] text-[#C9A227] flex items-center justify-center shadow-lg">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0A1F44] dark:text-white">
              Réseaux
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('landing.pillars.networkDesc')}
            </p>
            <div className="pt-2 text-xs font-bold text-[#C9A227] flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Accès strictement restreint à la promotion
            </div>
          </div>

          {/* Pilier 2 : QCM Arena */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0A1F44]/60 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-[#C9A227]/60 transition-all duration-300 space-y-4 relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-[#C9A227] text-[#0A1F44] flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0A1F44] dark:text-white">
              QCM Arena
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('landing.pillars.gamesDesc')}
            </p>
            <div className="pt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Scoring rapidité et podium animé
            </div>
          </div>

          {/* Pilier 3 : Bibliothèque et Recherche */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0A1F44]/60 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-[#C9A227]/60 transition-all duration-300 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#0A1F44] text-[#C9A227] flex items-center justify-center shadow-lg">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#0A1F44] dark:text-white">
              Bibliothèque et Recherche
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('landing.pillars.libraryDesc')}
            </p>
            <div className="pt-2 text-xs font-bold text-[#C9A227] flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              SSRN • RePEc • Google Scholar Finance
            </div>
          </div>
        </div>

        {/* Cohort Key Figures : Dynamic based on real data */}
        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-[#0A1F44] via-[#142D57] to-[#0A1F44] text-white border border-[#C9A227]/40 shadow-2xl">
          <div className="text-center mb-6">
            <h4 className="text-xs uppercase font-mono tracking-widest text-[#C9A227]">
              Promotion et Écosystème
            </h4>
            <div className="text-2xl font-black mt-1">Chiffres Clés de la Promotion</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl lg:text-4xl font-black text-[#C9A227]">{realMembersCount}</div>
              <div className="text-xs text-slate-300 mt-1">{t('landing.stats.members')}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl lg:text-4xl font-black text-white">{realGamesCount}</div>
              <div className="text-xs text-slate-300 mt-1">{t('landing.stats.games')}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-3xl lg:text-4xl font-black text-[#C9A227]">{realDocsCount}</div>
              <div className="text-xs text-slate-300 mt-1">{t('landing.stats.docs')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-8 px-6 lg:px-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-2">
            <Logo size={24} showText={false} />
            <span className="font-bold text-[#0A1F44] dark:text-white">PROCTUS</span>
            <span>• Plateforme réservée aux Élèves - Stagiaires.</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link to="/app/about" className="hover:text-[#C9A227] transition">Guide d'installation</Link>
            <Link to="/auth?mode=login" className="hover:text-[#C9A227] transition">Espace Membre</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
