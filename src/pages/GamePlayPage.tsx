import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { GameSession, GamePlayer } from '../types';
import { syncGameToFirestore, subscribeToGameOnline } from '../services/apiSync';
import { Trophy, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const GamePlayPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { playChime } = useNotification();
  const [games, setGames] = useLocalStorage<GameSession[]>('proctus_games', []);
  const game = games.find(g => g.code === code);

  // Player identification
  const [playerName, setPlayerName] = useState(
    currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''
  );
  const [hasJoined, setHasJoined] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>(
    currentUser ? currentUser.id : `guest-${Date.now()}`
  );

  // Response state for current question
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedTimeMs, setSubmittedTimeMs] = useState<number | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!code) return;
    try {
      const channel = new BroadcastChannel(`proctus-game-${code}`);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const { type } = event.data;
        if (type === 'GAME_STARTED' || type === 'NEXT_QUESTION') {
          setSelectedOption(null);
          setSubmittedTimeMs(null);
          playChime('click');
        } else if (type === 'QUESTION_REVEAL' || type === 'GAME_FINISHED') {
          playChime('deal');
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }

    const interval = setInterval(() => {
      try {
        const freshGames: GameSession[] = JSON.parse(localStorage.getItem('proctus_games') || '[]');
        const freshGame = freshGames.find(g => g.code === code);
        if (freshGame) {
          setGames(freshGames);
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
      clearInterval(interval);
      unsubFirestore();
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [code]);

  useEffect(() => {
    if (game && currentUser && !hasJoined) {
      handleJoinGame();
    }
  }, [game, currentUser, hasJoined]);

  const handleJoinGame = () => {
    if (!game) return;
    const pId = currentUser ? currentUser.id : myPlayerId;
    const name = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : playerName || 'Étudiant Finance';

    const newPlayer: GamePlayer = {
      id: pId,
      name,
      avatar: currentUser?.avatar,
      cohort: currentUser?.cohort || '2025',
      specialty: currentUser?.specialty || 'Audit et Comptabilité',
      score: 0,
    };

    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          players: {
            ...g.players,
            [pId]: newPlayer,
          },
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updated = updatedGames.find(g => g.code === code);
    if (updated) syncGameToFirestore(updated);
    setHasJoined(true);
    setMyPlayerId(pId);
    playChime('click');

    broadcastChannelRef.current?.postMessage({
      type: 'PLAYER_JOINED',
      payload: { player: newPlayer },
    });
  };

  const handleSelectAnswer = (optionIndex: number) => {
    if (!game || selectedOption !== null) return;
    const qIndex = game.currentQuestionIndex;
    const question = game.questions[qIndex];
    if (!question) return;

    const startTime = game.questionStartTime || Date.now();
    const now = Date.now();
    const timeTakenMs = Math.max(100, now - startTime);
    const totalTimeMs = (question.timeLimit || 20) * 1000;
    const isCorrect = optionIndex === question.correctIndex;

    let points = 0;
    if (isCorrect) {
      const ratio = Math.min(1, Math.max(0, timeTakenMs / totalTimeMs));
      points = Math.round(1000 * (1 - ratio * 0.5));
    }

    setSelectedOption(optionIndex);
    setSubmittedTimeMs(timeTakenMs);
    playChime('click');

    const currentPlayer = game.players[myPlayerId] || {
      id: myPlayerId,
      name: playerName || 'Joueur',
      cohort: '2025',
      specialty: 'Audit et Comptabilité',
      score: 0,
    };

    const newScore = (currentPlayer.score || 0) + points;

    const updatedGames = games.map(g => {
      if (g.code === code) {
        return {
          ...g,
          players: {
            ...g.players,
            [myPlayerId]: {
              ...currentPlayer,
              score: newScore,
              lastAnswer: {
                questionIndex: qIndex,
                optionIndex,
                timeMs: timeTakenMs,
                correct: isCorrect,
                pointsAwarded: points,
              },
            },
          },
        };
      }
      return g;
    });

    setGames(updatedGames);
    const updated = updatedGames.find(g => g.code === code);
    if (updated) syncGameToFirestore(updated);

    broadcastChannelRef.current?.postMessage({
      type: 'PLAYER_ANSWERED',
      payload: {
        playerId: myPlayerId,
        questionIndex: qIndex,
        optionIndex,
        isCorrect,
        points,
      },
    });
  };

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Code de session introuvable</h2>
        <p className="text-xs text-slate-400 mb-4">Vérifiez le code PIN à 6 chiffres.</p>
        <button
          onClick={() => navigate('/app/games')}
          className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold cursor-pointer"
        >
          Retour aux jeux
        </button>
      </div>
    );
  }

  const myPlayerData = game.players[myPlayerId];
  const myLastAnswer = myPlayerData?.lastAnswer;

  if (!hasJoined && !currentUser) {
    return (
      <div className="min-h-screen bg-[#0A1F44] flex flex-col justify-center items-center p-4 text-white">
        <div className="w-full max-w-sm bg-white dark:bg-[#131E35] text-slate-800 dark:text-white p-6 rounded-3xl shadow-2xl border border-[#C9A227]/40 space-y-4">
          <div className="text-center">
            <span className="text-xs font-mono font-bold text-[#C9A227] uppercase">Rejoindre la Session</span>
            <h2 className="text-2xl font-black mt-1">PIN : {game.code}</h2>
            <p className="text-xs text-slate-500 mt-1">{game.title}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Votre Prénom et Nom
            </label>
            <input
              type="text"
              required
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold focus:outline-hidden focus:border-[#C9A227]"
            />
          </div>
          <button
            onClick={handleJoinGame}
            disabled={!playerName.trim()}
            className="w-full py-3 rounded-xl bg-[#C9A227] text-[#0A1F44] font-black text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            Entrer dans l'Arène
          </button>
        </div>
      </div>
    );
  }

  // 1. Lobby Waiting Screen for Player
  if (game.status === 'waiting') {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-[#0A1F44] text-[#C9A227] flex items-center justify-center shadow-xl border-2 border-[#C9A227] animate-pulse">
          <Clock className="w-10 h-10" />
        </div>
        <div className="space-y-2 max-w-md">
          <span className="text-xs font-mono font-bold uppercase text-[#C9A227] px-3 py-1 rounded-full bg-[#C9A227]/10">
            Connecté à la Session
          </span>
          <h2 className="text-2xl font-black text-[#0A1F44] dark:text-white">
            {myPlayerData?.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Vous êtes prêt ! Regardez l'écran de l'hôte : la question s'y affichera, et vos 4 buzzers de couleur apparaîtront dès le lancement.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500">
          PIN : <strong className="text-[#0A1F44] dark:text-white text-base">{game.code}</strong> • {game.title}
        </div>
      </div>
    );
  }

  // 2. Active Question Screen (4 GIANT COLOR BUTTONS)
  if (game.status === 'in_progress') {
    if (selectedOption !== null) {
      return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[#0A1F44] dark:text-white">
              Réponse Enregistrée
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vitesse : <strong className="font-mono text-[#C9A227]">{((submittedTimeMs || 0) / 1000).toFixed(2)}s</strong>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-xs text-slate-400 animate-pulse">
            Patientez jusqu'à la fin du compte à rebours sur l'écran hôte...
          </div>
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col p-2 sm:p-4">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold mb-2">
          <span className="text-[#C9A227] font-mono">Q{game.currentQuestionIndex + 1}/{game.questions.length}</span>
          <span className="font-mono text-[#0A1F44] dark:text-white">Score : {myPlayerData?.score || 0} pts</span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => handleSelectAnswer(0)}
            className="w-full h-full rounded-3xl bg-[#E63946] active:scale-95 text-white flex flex-col items-center justify-center transition-all duration-150 shadow-xl cursor-pointer hover:brightness-105"
          >
            <span className="text-6xl sm:text-8xl font-black drop-shadow-md">▲</span>
          </button>
          <button
            onClick={() => handleSelectAnswer(1)}
            className="w-full h-full rounded-3xl bg-[#1D3557] active:scale-95 text-white flex flex-col items-center justify-center transition-all duration-150 shadow-xl cursor-pointer hover:brightness-105"
          >
            <span className="text-6xl sm:text-8xl font-black drop-shadow-md">◆</span>
          </button>
          <button
            onClick={() => handleSelectAnswer(2)}
            className="w-full h-full rounded-3xl bg-[#F4A261] active:scale-95 text-white flex flex-col items-center justify-center transition-all duration-150 shadow-xl cursor-pointer hover:brightness-105"
          >
            <span className="text-6xl sm:text-8xl font-black drop-shadow-md">●</span>
          </button>
          <button
            onClick={() => handleSelectAnswer(3)}
            className="w-full h-full rounded-3xl bg-[#2A9D8F] active:scale-95 text-white flex flex-col items-center justify-center transition-all duration-150 shadow-xl cursor-pointer hover:brightness-105"
          >
            <span className="text-6xl sm:text-8xl font-black drop-shadow-md">■</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Question Reveal Screen for Player
  if (game.status === 'question_reveal') {
    const isCorrect = myLastAnswer?.correct;
    const pointsAwarded = myLastAnswer?.pointsAwarded || 0;

    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
            isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {isCorrect ? <CheckCircle2 className="w-14 h-14" /> : <XCircle className="w-14 h-14" />}
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-[#0A1F44] dark:text-white">
            {isCorrect ? 'Excellent !' : 'Incorrect !'}
          </h2>
          <div className="text-xl font-mono font-black text-[#C9A227]">
            {isCorrect ? `+${pointsAwarded} pts` : '+0 pt'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-sm max-w-sm w-full space-y-1">
          <div className="text-xs text-slate-400">Votre score total actuel</div>
          <div className="text-2xl font-mono font-black text-[#0A1F44] dark:text-white">
            {myPlayerData?.score || 0} pts
          </div>
        </div>
        <p className="text-xs text-slate-400 animate-pulse">
          L'hôte va bientôt passer à la question suivante...
        </p>
      </div>
    );
  }

  // 4. Final Podium Screen for Player
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-[#C9A227] text-[#0A1F44] flex items-center justify-center shadow-2xl animate-flash-podium">
        <Trophy className="w-12 h-12" />
      </div>
      <div className="space-y-1">
        <h2 className="text-3xl font-black text-[#0A1F44] dark:text-white">
          Partie Terminée
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Félicitations pour votre participation à l'Arène !
        </p>
      </div>
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-center max-w-sm w-full shadow-lg space-y-2">
        <div className="text-xs uppercase font-mono text-[#C9A227]">Votre Performance</div>
        <div className="text-4xl font-mono font-black text-[#0A1F44] dark:text-white">
          {myPlayerData?.score || 0} pts
        </div>
      </div>
      <button
        onClick={() => navigate('/app/games')}
        className="px-6 py-3 rounded-2xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-sm shadow-md transition cursor-pointer"
      >
        Retour aux Jeux
      </button>
    </div>
  );
};
