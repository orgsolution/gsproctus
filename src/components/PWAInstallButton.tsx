import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2, ArrowDownCircle } from 'lucide-react';
import { triggerInstantAppDownload } from '../utils/downloadAppPackage';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'pill';
  showDetails?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
  showDetails = false,
}) => {
  const { isInstallable, isInstalled, osName, install } = usePWAInstall();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (isInstalled) {
    if (!showDetails) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
        <CheckCircle2 className="w-4 h-4" />
        <span>Proctus Installée</span>
      </div>
    );
  }

  const handleAction = async () => {
    // 1. Instantly trigger the app download package
    triggerInstantAppDownload();
    setDownloadSuccess(true);

    // 2. Also prompt native browser PWA installation if supported
    if (isInstallable) {
      try {
        await install();
      } catch (err) {
        console.warn('Native install prompt dismissed or handled:', err);
      }
    }

    setTimeout(() => {
      setDownloadSuccess(false);
    }, 4500);
  };

  const getLabel = () => {
    if (downloadSuccess) return 'Téléchargement lancé !';
    if (osName === 'Android' || osName === 'iOS') return `Télécharger l'application`;
    return `Télécharger / Installer (${osName})`;
  };

  const buttonStyle =
    variant === 'primary'
      ? 'bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] border border-[#C9A227]/40 shadow-lg shadow-[#0A1F44]/20'
      : variant === 'pill'
      ? 'bg-[#C9A227] hover:bg-[#b58f1e] text-[#0A1F44] font-bold rounded-full'
      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200';

  return (
    <div className="inline-flex flex-col items-center">
      <button
        onClick={handleAction}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${buttonStyle} ${className}`}
        title="Télécharger et installer l'application Proctus"
      >
        {downloadSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
        ) : (
          <ArrowDownCircle className="w-4 h-4 text-[#C9A227]" />
        )}
        <span>{getLabel()}</span>
      </button>

      {downloadSuccess && (
        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 animate-in fade-in">
          Fichier application prêt dans vos téléchargements.
        </span>
      )}
    </div>
  );
};
