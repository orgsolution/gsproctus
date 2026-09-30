import React, { useState, useEffect } from 'react';
import { getAllDocuments } from '../services/indexedDb';
import { useLocalStorage, INITIAL_POSTS } from '../services/storage';
import { DocumentMeta, Post } from '../types';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { Wifi, WifiOff, BookOpen, MessageSquare, CheckCircle, Eye, X } from 'lucide-react';

export const OfflinePage: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [posts] = useLocalStorage<Post[]>('proctus_posts', INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState<'docs' | 'posts'>('docs');
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null);

  useEffect(() => {
    getAllDocuments().then(setDocuments);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Offline Status Header Card */}
      <div className={`p-6 rounded-3xl border shadow-md flex items-center justify-between gap-4 ${
        isOnline
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${isOnline ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}`}>
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold">
              {isOnline ? 'Connexion Réseau Active' : 'Mode Hors-Ligne Opérationnel'}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              {isOnline
                ? 'Tous vos documents et posts sont automatiquement synchronisés en cache pour un usage hors-ligne.'
                : 'Vous consultez vos documents locaux enregistrés dans IndexedDB et vos posts en mémoire.'}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-white/40 dark:bg-black/30">
          {documents.length} docs en cache
        </span>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white dark:bg-[#131E35] p-1.5 border border-slate-200 dark:border-slate-800 shadow-xs max-w-md">
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'docs'
              ? 'bg-[#0A1F44] text-[#C9A227] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Documents ({documents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-[#0A1F44] text-[#C9A227] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Publications ({posts.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'docs' ? (
        documents.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 space-y-2">
            <BookOpen className="w-10 h-10 text-[#C9A227] mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-[#0A1F44] dark:text-white">Aucun document en cache</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les documents consultés ou ajoutés dans la bibliothèque seront automatiquement disponibles ici sans connexion.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => setPreviewDoc(doc)}
                className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#C9A227] transition cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div>
                  <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider">
                    {doc.subject}
                  </span>
                  <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white mt-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {doc.textSnippet}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Disponible hors-ligne
                  </span>
                  <span className="flex items-center gap-1 font-bold text-[#0A1F44] dark:text-[#C9A227]">
                    <Eye className="w-3.5 h-3.5" />
                    Consulter
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 space-y-2">
            <MessageSquare className="w-10 h-10 text-[#C9A227] mx-auto opacity-70" />
            <h4 className="font-bold text-sm text-[#0A1F44] dark:text-white">Aucune publication en cache</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Les publications du fil seront sauvegardées en local pour être consultables sans connexion internet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[#C9A227]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#0A1F44] dark:text-white">
                      {post.authorName}
                    </div>
                    <div className="text-[10px] text-slate-400">{post.authorCohort} • {post.authorSpecialty}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {post.content}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Doc Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
                  Lecture Hors-Ligne
                </span>
                <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                  {previewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-line">
              {previewDoc.textSnippet}
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
