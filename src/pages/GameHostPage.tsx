import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { GameSession, GamePlayer } from '../types';
import { syncGameToFirestore, subscribeToGameOnline } from '../services/apiSync';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Users,
  Play,
  ArrowRight,
  Copy,
  Check,
  Crown,
  Sparkles
} from 'lucide-react';

export const GameHostPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast, playChime } = useNotification();
  const [games, setGames] = useLocalStorage<GameSession[]>('proctus_games', []);
  const game = games.find(g => g.code === code);

  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast Channel reference
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!code) return;
    try {
      const channel = new BroadcastChannel(`proctus-game-${code}`);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type } = event.data;
        if (type === 'PLAYER_JOINED' || type === 'PLAYER_ANSWERED') {
          const freshGames: GameSession[] = JSON.parse(localStorage.getItem('proctus_games') || '[]');
          const freshGame = freshGames.find(g => g.code === code);
          if (freshGame) {
            setGames(freshGames);
          }
          playChime('click');
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }

    const pollingInterval = setInterval(() => {
      try {
        const freshGames: GameSession[] = JSON.parse(localStorage.getItem('proctus_games') || '[]');
        const freshGame = freshGames.find(g => g.code === code);
        if (freshGame) {
          setGames(prev => {
            const current = prev.find(g => g.code === code);
            if (
              JSON.stringify(current?.players) !== JSON.stringify(freshGame.players) ||
              current?.status !== freshGame.status ||
              current?.currentQuestionIndex !== freshGame.currentQuestionIndex
            ) {
              return freshGames;
            }
            return prev;
          });
        }
      } catch {
        // Safe poll
      }
    }, 500);

    // Real-time Firestore sync listener for game session
    const unsubFirestore = subscribeToGameOnline(code, (onlineGame) => {
      if (onlineGame) {
        setGames((prev) => {
          const filtered = prev.filter((g) => g.code !== code);
          return [onlineGame, ...filtered];
        });
      }
    });

    return () => {
      clearInterval(pollingInterval);
      unsubFirestore();
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [code]);

  const currentQuestion = game ? game.questions[game.currentQuestionIndex] : null;
  const playersList: GamePlayer[] = game ? Object.values(game.players || {}) : [];

  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerIntervalRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timerRunning && timeLeft === 0) {
      setTimerRunning(false);
      handleTimeExpired();
    }
    return () => {
      if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
    };
  }, [timerRunning, timeLeft]);

  const handleStartGame = () => {
    if (!game) return;
    const firstQTime = game.questions[0]?.timeLimit || 20;

    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          status: 'in_progress' as const,
          currentQuestionIndex: 0,
          questionStartTime: Date.now(),
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updated = updatedGames.find(g => g.code === code);
    if (updated) syncGameToFirestore(updated);
    setTimeLeft(firstQTime);
    setTimerRunning(true);
    playChime('deal');

    broadcastChannelRef.current?.postMessage({
      type: 'GAME_STARTED',
      payload: {
        questionIndex: 0,
        timeLimit: firstQTime,
        startTime: Date.now(),
      },
    });
  };

  const handleTimeExpired = () => {
    if (!game) return;
    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          status: 'question_reveal' as const,
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updated = updatedGames.find(g => g.code === code);
    if (updated) syncGameToFirestore(updated);
    playChime('warning');

    broadcastChannelRef.current?.postMessage({
      type: 'QUESTION_REVEAL',
      payload: {
        questionIndex: game.currentQuestionIndex,
        correctIndex: game.questions[game.currentQuestionIndex]?.correctIndex,
      },
    });
  };

  const handleNextQuestion = () => {
    if (!game) return;
    const nextIndex = game.currentQuestionIndex + 1;
    if (nextIndex >= game.questions.length) {
      handleFinishGame();
      return;
    }

    const nextTime = game.questions[nextIndex]?.timeLimit || 20;
    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          status: 'in_progress' as const,
          currentQuestionIndex: nextIndex,
          questionStartTime: Date.now(),
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updatedNext = updatedGames.find(g => g.code === code);
    if (updatedNext) syncGameToFirestore(updatedNext);
    setTimeLeft(nextTime);
    setTimerRunning(true);
    playChime('deal');

    broadcastChannelRef.current?.postMessage({
      type: 'NEXT_QUESTION',
      payload: {
        questionIndex: nextIndex,
        timeLimit: nextTime,
        startTime: Date.now(),
      },
    });
  };

  const handleFinishGame = () => {
    if (!game) return;
    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          status: 'finished' as const,
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updatedFin = updatedGames.find(g => g.code === code);
    if (updatedFin) syncGameToFirestore(updatedFin);
    playChime('deal');
    triggerGoldenConfetti();

    broadcastChannelRef.current?.postMessage({
      type: 'GAME_FINISHED',
      payload: {},
    });
  };

  const triggerGoldenConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C9A227', '#E5C158', '#0A1F44', '#FFFFFF'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#C9A227', '#FFD700'],
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#C9A227', '#FFD700'],
        });
      }, 400);
    } catch {
      // Ignore
    }
  };

  if (!game) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold">Partie introuvable</h2>
        <button
          onClick={() => navigate('/app/games')}
          className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold cursor-pointer"
        >
          Retour aux jeux
        </button>
      </div>
    );
  }

  const answeredCount = playersList.filter(
    p => p.lastAnswer && p.lastAnswer.questionIndex === game.currentQuestionIndex
  ).length;

  const sortedPlayers = [...playersList].sort((a, b) => b.score - a.score);
  const top5 = sortedPlayers.slice(0, 5);

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/app/games/play/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    showToast({ type: 'success', title: 'Lien joueur copié' });
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. LOBBY WAITING SCREEN */}
      {game.status === 'waiting' && (
        <div className="space-y-8 text-center py-6">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#C9A227] px-3 py-1 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30">
              Lobby de l'Organisateur • En attente
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#0A1F44] dark:text-white">
              {game.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ouvrez <span className="font-mono font-bold text-[#0A1F44] dark:text-white">/app/games/play/{code}</span> sur votre smartphone ou un autre onglet
            </p>
          </div>

          {/* Giant PIN Banner */}
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-br from-[#0A1F44] to-[#152e5c] text-white border-2 border-[#C9A227] shadow-2xl space-y-4">
            <div className="text-xs uppercase font-mono tracking-widest text-[#C9A227]">
              Code PIN de la Partie
            </div>
            <div className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-white drop-shadow-md">
              {game.code}
            </div>
            <div className="pt-2 flex justify-center">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#C9A227]" />}
                <span>{copied ? 'Lien d\'invitation copié !' : 'Copier le lien joueur'}</span>
              </button>
            </div>
          </div>

          {/* Players in Lobby */}
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#C9A227]" />
                <span>Joueurs connectés ({playersList.length})</span>
              </span>
              <span>{game.questions.length} questions au programme</span>
            </div>

            {playersList.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-[#131E35] border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-40 animate-pulse" />
                <span>En attente de connexion des participants...</span>
                <span className="text-[11px] text-slate-500">
                  (Astuce : ouvrez un deuxième onglet pour tester le buzzer joueur !)
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {playersList.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-xs animate-in zoom-in-95"
                  >
                    <img
                      src={player.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${player.name}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-[#C9A227]"
                    />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-[#0A1F44] dark:text-white truncate">
                        {player.name}
                      </div>
                      <div className="text-[10px] text-[#C9A227] font-mono">
                        Promo {player.cohort}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Launch Button */}
            <div className="pt-4">
              <button
                onClick={handleStartGame}
                disabled={playersList.length === 0}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-black text-base shadow-xl transition transform hover:scale-105 disabled:opacity-50 disabled:scale-100 cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Lancer l'Arène QCM</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. QUESTION IN PROGRESS & REVEAL SCREEN */}
      {(game.status === 'in_progress' || game.status === 'question_reveal') && currentQuestion && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9A227]">
                Question {game.currentQuestionIndex + 1} / {game.questions.length}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                PIN : <strong className="font-mono text-[#0A1F44] dark:text-white">{game.code}</strong>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                <strong className="text-base text-[#0A1F44] dark:text-white">{answeredCount}</strong> / {playersList.length} réponses
              </div>

              {/* Circular SVG Timer */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="text-slate-200 dark:text-slate-800"
                    fill="transparent"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="text-[#C9A227] transition-all duration-1000 ease-linear"
                    strokeDasharray={125.6}
                    strokeDashoffset={
                      125.6 - (125.6 * timeLeft) / (currentQuestion.timeLimit || 20)
                    }
                    fill="transparent"
                  />
                </svg>
                <span className="absolute font-mono font-black text-sm text-[#0A1F44] dark:text-white">
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#131E35] border-2 border-slate-200 dark:border-slate-800 shadow-md text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0A1F44] dark:text-white leading-tight max-w-3xl mx-auto">
              {currentQuestion.question}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentQuestion.options.map((opt, idx) => {
              const isCorrect = idx === currentQuestion.correctIndex;
              const isRevealed = game.status === 'question_reveal';
              const baseBg =
                idx === 0
                  ? 'bg-[#E63946]'
                  : idx === 1
                  ? 'bg-[#1D3557]'
                  : idx === 2
                  ? 'bg-[#F4A261]'
                  : 'bg-[#2A9D8F]';

              return (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl text-white font-bold text-base sm:text-lg flex items-center gap-4 transition-all duration-300 shadow-md ${baseBg} ${
                    isRevealed && !isCorrect ? 'opacity-35 scale-95' : ''
                  } ${isRevealed && isCorrect ? 'ring-4 ring-[#C9A227] scale-102 shadow-2xl' : ''}`}
                >
                  <span className="text-2xl sm:text-3xl font-black shrink-0">
                    {opt.shape}
                  </span>
                  <span className="flex-1 leading-snug">{opt.text}</span>
                  {isRevealed && isCorrect && (
                    <span className="p-1.5 rounded-full bg-white text-emerald-600 font-black text-xs shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {game.status === 'question_reveal' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in">
              {currentQuestion.explanation && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Explication pédagogique :</strong> {currentQuestion.explanation}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#C9A227] flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  Classement provisoire
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {top5.slice(0, 3).map((p, i) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#C9A227]">#{i + 1}</span>
                        <span className="font-bold text-[#0A1F44] dark:text-white truncate">
                          {p.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-[#C9A227]">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 rounded-2xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>
                    {game.currentQuestionIndex + 1 >= game.questions.length
                      ? 'Voir le Podium Final'
                      : 'Question Suivante'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. FINISH PODIUM SCREEN */}
      {game.status === 'finished' && (
        <div className="space-y-8 text-center py-6">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#C9A227] px-3 py-1 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30">
              Résultats Officiels • Arène Terminée
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#0A1F44] dark:text-white">
              Podium d'Honneur de la Promotion
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {game.title}
            </p>
          </div>

          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0A1F44] via-[#0D2550] to-[#07132B] text-white border-2 border-[#C9A227]/50 shadow-2xl relative overflow-hidden">
            <div className="flex items-end justify-center gap-4 sm:gap-8 max-w-2xl mx-auto pt-10 pb-4">
              {/* 2nd Place */}
              {top5[1] && (
                <div className="flex-1 flex flex-col items-center">
                  <img
                    src={top5[1].avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${top5[1].name}`}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-300 mb-2 shadow-lg"
                  />
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{top5[1].name}</div>
                  <div className="text-[11px] font-mono font-black text-slate-300">{top5[1].score} pts</div>
                  <div className="w-full h-28 bg-slate-400/30 rounded-t-2xl mt-3 flex items-center justify-center font-black text-2xl text-slate-200 border-t-2 border-slate-300">
                    2
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {top5[0] && (
                <div className="flex-1 flex flex-col items-center animate-flash-podium z-10">
                  <div className="relative mb-2">
                    <Crown className="w-8 h-8 text-[#C9A227] absolute -top-8 left-1/2 -translate-x-1/2 drop-shadow-md animate-bounce" />
                    <img
                      src={top5[0].avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${top5[0].name}`}
                      alt=""
                      className="w-22 h-22 rounded-full object-cover border-4 border-[#C9A227] shadow-2xl"
                    />
                  </div>
                  <div className="text-sm font-black text-[#C9A227] truncate max-w-[140px] drop-shadow-sm">
                    {top5[0].name}
                  </div>
                  <div className="text-xs font-mono font-black text-white">{top5[0].score} pts</div>
                  <div className="w-full h-40 bg-gradient-to-t from-[#C9A227] to-[#E5C158] rounded-t-2xl mt-3 flex flex-col items-center justify-center font-black text-3xl text-[#0A1F44] border-t-4 border-[#FFF0A0] shadow-2xl">
                    <span>1</span>
                    <span className="text-[9px] uppercase tracking-widest font-bold">Champion</span>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top5[2] && (
                <div className="flex-1 flex flex-col items-center">
                  <img
                    src={top5[2].avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${top5[2].name}`}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-700 mb-2 shadow-lg"
                  />
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{top5[2].name}</div>
                  <div className="text-[11px] font-mono font-black text-amber-300">{top5[2].score} pts</div>
                  <div className="w-full h-20 bg-amber-800/30 rounded-t-2xl mt-3 flex items-center justify-center font-black text-2xl text-amber-500 border-t-2 border-amber-600">
                    3
                  </div>
                </div>
              )}
            </div>

            {top5.length > 3 && (
              <div className="mt-8 pt-6 border-t border-white/10 max-w-md mx-auto grid grid-cols-2 gap-3 text-xs">
                {top5.slice(3, 5).map((p, i) => (
                  <div key={p.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                    <span className="text-slate-400 font-bold">#{i + 4} {p.name}</span>
                    <span className="font-mono text-[#C9A227]">{p.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/app/games')}
              className="px-6 py-3 rounded-2xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-sm shadow-md transition cursor-pointer"
            >
              Retour au Hub des Jeux
            </button>
            <button
              onClick={triggerGoldenConfetti}
              className="px-6 py-3 rounded-2xl bg-[#C9A227] hover:bg-[#b8911e] text-[#0A1F44] font-black text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Relancer les Confettis</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
