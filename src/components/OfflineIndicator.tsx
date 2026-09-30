import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md border border-amber-400/40 animate-bounce">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <span>{t('common.offline')}</span>
    </div>
  );
};
