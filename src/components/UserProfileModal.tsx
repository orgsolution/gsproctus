import React from 'react';
import { User } from '../types';
import { X, Award, Briefcase, GraduationCap, MessageSquare, Linkedin, Calendar, MailCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  user: User | null;
  onClose: () => void;
  onStartChat?: (user: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onStartChat,
}) => {
  const navigate = useNavigate();

  if (!user) return null;

  const handleMessageClick = () => {
    onClose();
    if (onStartChat) {
      onStartChat(user);
    } else {
      navigate('/app/feed?chatWith=' + user.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#131E35] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {/* Banner with financial graph aesthetic */}
        <div className="h-28 bg-gradient-to-r from-[#0A1F44] via-[#162D5A] to-[#0A1F44] relative p-4 flex justify-between items-start">
          <div className="text-[10px] tracking-widest font-mono text-[#C9A227] uppercase">
            Certification Officielle Promotion {user.cohort}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/30 text-white/80 hover:text-white hover:bg-black/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar & Header */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="relative">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.firstName}`}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-24 h-24 rounded-2xl border-4 border-white dark:border-[#131E35] object-cover shadow-lg bg-slate-200"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131E35]" title="En ligne" />
            </div>

            <button
              onClick={handleMessageClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44] text-[#C9A227] hover:bg-[#152e5c] text-sm font-semibold transition shadow-md cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contacter (DM)</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#0A1F44] dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              {user.emailConfirmed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  <MailCheck className="w-3.5 h-3.5" />
                  Email vérifié
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium text-[#C9A227]">
                <GraduationCap className="w-3.5 h-3.5" />
                Promo {user.cohort}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Briefcase className="w-3.5 h-3.5" />
                {user.specialty}
              </span>
            </div>
          </div>

          {user.bio && (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {user.bio}
            </p>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Score QCM</div>
              <div className="text-lg font-black text-[#C9A227]">{(user.totalScore || 0).toLocaleString()}</div>
            </div>
            <div className="border-x border-slate-200 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">Parties Jouées</div>
              <div className="text-lg font-black text-[#0A1F44] dark:text-white">{user.gamesPlayed || 0}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Statut</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Certifié</div>
            </div>
          </div>

          {/* Badges */}
          {user.badges && user.badges.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-[#C9A227]" />
                Distinctions et Badges
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {user.badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C9A227]/15 text-[#C9A227] text-xs font-semibold border border-[#C9A227]/30"
                  >
                    ★ {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer metadata */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </span>
            {user.linkedin && (
              <a
                href={user.linkedin}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#0A1F44] dark:text-[#C9A227] hover:underline font-medium"
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
