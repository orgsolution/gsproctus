import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage, INITIAL_GAMES } from '../services/storage';
import { getAllDocuments } from '../services/indexedDb';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { GameSession, DocumentMeta, QuizQuestion } from '../types';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Play,
  Plus,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Crown
} from 'lucide-react';

export const GamesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, users } = useAuth();
  const { showToast, playChime } = useNotification();
  const { t, i18n } = useTranslation();

  const [games, setGames] = useLocalStorage<GameSession[]>('proctus_games', INITIAL_GAMES);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  // Join Game PIN state
  const [joinPin, setJoinPin] = useState('');

  // Create Game Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [gameTitle, setGameTitle] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);

  // Copied PIN indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    getAllDocuments().then(docs => {
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
        setGameTitle(`Arène QCM : ${docs[0].title.slice(0, 32)}...`);
      }
    });
  }, []);

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setGameTitle(`Arène QCM : ${doc.title.slice(0, 36)}...`);
    }
  };

  const generateGamePin = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsGenerating(true);
    const pin = generateGamePin();

    const selectedDoc = documents.find(d => d.id === selectedDocId);
    const docContent = selectedDoc ? selectedDoc.textSnippet : customTopic;
    const docTitle = selectedDoc ? selectedDoc.title : customTopic || 'Finance de Marché, Audit et Trésorerie';

    try {
      const response = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docTitle,
          docContent,
          numQuestions,
          timeLimit,
          language: i18n.language || 'fr',
        }),
      });

      const data = await response.json();
      const questions: QuizQuestion[] = data.questions && data.questions.length > 0
        ? data.questions
        : [
            {
              question: "Dans une modélisation LBO, quel est le principal levier permettant d'accroître le TRI (IRR) de l'actionnaire ?",
              options: [
                { text: "L'effet de levier de la dette bancaire", color: '#E63946', shape: '▲' },
                { text: "L'augmentation des CapEx", color: '#1D3557', shape: '◆' },
                { text: "La baisse du BFR", color: '#F4A261', shape: '●' },
                { text: "L'émission d'actions", color: '#2A9D8F', shape: '■' },
              ],
              correctIndex: 0,
              timeLimit,
              explanation: "Le désendettement rapide démultiplie le rendement des capitaux propres.",
            }
          ];

      const newSession: GameSession = {
        id: `game-${Date.now()}`,
        code: pin,
        title: gameTitle || `Quiz ${docTitle}`,
        sourceDocTitle: docTitle,
        hostId: currentUser.id,
        hostName: `${currentUser.firstName} ${currentUser.lastName}`,
        status: 'waiting',
        currentQuestionIndex: 0,
        questions,
        players: {},
        createdAt: new Date().toISOString(),
      };

      setGames([newSession, ...games]);
      setIsGenerating(false);
      setShowCreateModal(false);

      playChime('deal');
      showToast({ type: 'deal', title: 'Arène QCM Créée !', message: `Code de partie : ${pin}` });
      navigate(`/app/games/host/${pin}`);
    } catch (err) {
      console.error('Error creating quiz:', err);
      setIsGenerating(false);
      showToast({ type: 'error', title: 'Erreur', message: 'Impossible de générer le quiz.' });
    }
  };

  const handleJoinByPin = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = joinPin.trim();
    if (!pin) return;

    const game = games.find(g => g.code === pin);
    if (!game) {
      showToast({ type: 'error', title: 'Code Invalide', message: 'Aucune partie trouvée avec ce code à 6 chiffres.' });
      return;
    }

    playChime('click');
    navigate(`/app/games/play/${pin}`);
  };

  const handleCopyLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/app/games/play/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    showToast({ type: 'success', title: 'Lien copié !', message: 'Partagez-le avec vos camarades de promotion.' });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const sortedLeaderboard = [...users].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0A1F44] via-[#142D57] to-[#0A1F44] text-white border border-[#C9A227]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A227]/20 text-[#C9A227] text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Synchro Temps Réel
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            QCM Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Défis interactifs multijoueurs basés sur vos documents de cours avec scoring en direct
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#C9A227] hover:bg-[#b8911e] text-[#0A1F44] font-black text-sm shadow-lg shadow-[#C9A227]/20 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('games.createBtn')}</span>
          </button>
        </div>

        <div className="absolute right-0 top-0 w-80 h-80 bg-[#C9A227]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Join Game with 6-digit PIN Box */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-3 rounded-2xl bg-[#0A1F44] text-[#C9A227] shrink-0">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white">
                Rejoindre une partie en direct
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Entrez le code à 6 chiffres affiché sur l'écran hôte
              </p>
            </div>
          </div>

          <form onSubmit={handleJoinByPin} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              maxLength={6}
              value={joinPin}
              onChange={e => setJoinPin(e.target.value.replace(/\D/g, ''))}
              className="w-36 text-center font-mono font-black text-lg tracking-widest px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
            />
            <button
              type="submit"
              disabled={joinPin.length !== 6}
              className="px-5 py-2.5 rounded-xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {t('games.join')}
            </button>
          </form>
        </div>
      </div>

      {/* Main Grid: Active / Recent Games & Leaderboard */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Games list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#0A1F44] dark:text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-[#C9A227]" />
              <span>Parties QCM de la Promotion</span>
            </h3>
            <span className="text-xs text-slate-400">{games.length} sessions</span>
          </div>

          <div className="space-y-3">
            {games.length === 0 ? (
              <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 space-y-3">
                <Trophy className="w-12 h-12 text-[#C9A227] mx-auto opacity-75" />
                <h4 className="font-bold text-sm text-[#0A1F44] dark:text-white">
                  Aucune arène QCM créée pour le moment
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Soyez le premier à lancer une session en direct à partir de vos documents de cours ou d'un sujet financier !
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#0A1F44] text-[#C9A227] text-xs font-bold hover:bg-[#152e5c] transition inline-flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer une arène QCM</span>
                </button>
              </div>
            ) : (
              games.map(game => (
                <div
                  key={game.id}
                  className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#C9A227]/40 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            game.status === 'waiting'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : game.status === 'in_progress'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {game.status === 'waiting'
                            ? 'En attente'
                            : game.status === 'in_progress'
                            ? 'En cours'
                            : 'Terminé'}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#C9A227]">
                          PIN: {game.code}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-[#0A1F44] dark:text-white mt-1">
                        {game.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Organisé par <strong>{game.hostName}</strong> • {game.questions.length} questions • {new Date(game.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:pt-0">
                      <button
                        onClick={() => handleCopyLink(game.code)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Copier le lien d'invitation"
                      >
                        {copiedCode === game.code ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => navigate(`/app/games/host/${game.code}`)}
                        className="px-3.5 py-2 rounded-xl bg-[#0A1F44] text-[#C9A227] hover:bg-[#152e5c] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Écran Hôte</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => navigate(`/app/games/play/${game.code}`)}
                        className="px-3.5 py-2 rounded-xl bg-[#C9A227] text-[#0A1F44] hover:bg-[#b8911e] text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Buzzer Joueur</span>
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Cumulative Leaderboard */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#C9A227]" />
                <span>{t('games.leaderboard')}</span>
              </h3>
              <span className="text-[10px] font-mono uppercase text-[#C9A227]">Points cumulés</span>
            </div>

            <div className="space-y-2">
              {sortedLeaderboard.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-500 dark:text-slate-400">Aucun score enregistré</p>
                  <p className="text-[11px]">Rejoignez ou lancez une arène pour intégrer le podium !</p>
                </div>
              ) : (
                sortedLeaderboard.map((member, index) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition border ${
                      index === 0
                        ? 'bg-[#C9A227]/15 border-[#C9A227]/40 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 text-center font-black text-xs ${
                          index === 0
                            ? 'text-[#C9A227] text-sm'
                            : index === 1
                            ? 'text-slate-400 text-sm'
                            : index === 2
                            ? 'text-amber-700 text-sm'
                            : 'text-slate-400'
                        }`}
                      >
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>

                      <img
                        src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.firstName}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#C9A227]/50"
                      />

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0A1F44] dark:text-white truncate">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {member.cohort} • {member.specialty}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-xs text-[#C9A227]">
                        {(member.totalScore || 0).toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-400">pts</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal : Créer un jeu QCM avec Gemini AI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                    {t('games.createModalTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Modèle Gemini 3.8 Flash • Génération académique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('games.gameTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={gameTitle}
                  onChange={e => setGameTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('games.selectSource')}
                </label>
                <select
                  value={selectedDocId}
                  onChange={e => handleDocChange(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      📄 {d.title} ({d.subject})
                    </option>
                  ))}
                  <option value="">-- Autre sujet personnalisé --</option>
                </select>
              </div>

              {!selectedDocId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('games.customTopic')}
                  </label>
                  <textarea
                    rows={3}
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{t('games.numQuestions')}</span>
                    <span className="font-mono text-[#C9A227]">{numQuestions}</span>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={numQuestions}
                    onChange={e => setNumQuestions(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C9A227]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>{t('games.timeLimit')}</span>
                    <span className="font-mono text-[#C9A227]">{timeLimit}s</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={45}
                    step={5}
                    value={timeLimit}
                    onChange={e => setTimeLimit(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C9A227]"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-3 px-4 rounded-xl bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isGenerating ? t('games.generating') : t('games.createAction')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
