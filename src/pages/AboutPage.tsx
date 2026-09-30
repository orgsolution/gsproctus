import React from 'react';
import { Logo } from '../components/Logo';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  Laptop,
  Smartphone,
  Share,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Brand Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0A1F44] via-[#152e5c] to-[#0A1F44] text-white border border-[#C9A227]/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <Logo size={48} showText={true} textColor="text-white" />
          <p className="text-xs text-slate-300 max-w-lg leading-relaxed pt-1">
            Proctus est la plateforme officielle de la promotion d'excellence en finance. Elle réunit un réseau sécurisé de camarades, une arène QCM multijoueur en direct synchronisée entre écrans, et une bibliothèque académique de pointe.
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {/* Guide d'installation multiplateforme */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Sparkles className="w-5 h-5 text-[#C9A227]" />
          <h2 className="text-lg font-black text-[#0A1F44] dark:text-white">
            Guide d'Installation PWA sur Tous vos Appareils
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-xs">
          {/* Mac et PC */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-[#C9A227] flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white">
              PC Windows et Mac
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Sous Chrome, Edge ou Brave, cliquez sur le bouton <strong>« Installer Proctus »</strong> dans l'en-tête ou sur l'icône d'installation dans la barre d'URL. L'app s'exécutera dans sa propre fenêtre native.
            </p>
          </div>

          {/* Android */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A227] text-[#0A1F44] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white">
              Smartphones Android
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Touchez <strong>« Installer l'application »</strong>. L'icône Proctus s'ajoute immédiatement à votre écran d'accueil avec support hors-ligne et notifications.
            </p>
          </div>

          {/* iOS iPhone / iPad */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A1F44] text-white flex items-center justify-center">
              <Share className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white">
              iPhone et iPad
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Dans Safari, appuyez sur le bouton <strong>Partager</strong> en bas, puis sélectionnez <strong>« Sur l'écran d'accueil »</strong> et confirmez. L'icône dorée apparaîtra sans barre de navigateur.
            </p>
          </div>
        </div>
      </div>

      {/* Architecture et Piliers */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#0A1F44] dark:text-white">
          Spécifications Techniques de l'Architecture
        </h3>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-[#0A1F44] dark:text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#C9A227]" />
              <span>Synchro Jeu Multijoueur</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Synchronisation temps réel par <strong>BroadcastChannel API</strong> (canal inter-onglets instantané) combiné à un état partagé persistant avec polling 500ms.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-[#0A1F44] dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Génération IA QCM (Gemini)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Moteur Gemini 3.8 Flash analysant les polycopiés et synthèses de cours pour générer des QCM conformes aux exigences académiques.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-[#0A1F44] dark:text-white flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#C9A227]" />
              <span>Multilinguisme 4 Langues</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Internationalisation intégrale avec Kreyòl ayisyen (🇭🇹), Français (🇫🇷), English (🇺🇸) et Español (🇪🇸).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-[#0A1F44] dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              <span>Stockage Local et IndexedDB</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Persistance des profils, posts et jeux dans localStorage, et stockage haute capacité des documents PDF dans IndexedDB avec consultation hors-ligne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
