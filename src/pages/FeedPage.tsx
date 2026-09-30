import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocalStorage, INITIAL_POSTS, INITIAL_MESSAGES, getSavedSpecialties } from '../services/storage';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Post, DirectMessage, User, COHORT_YEARS } from '../types';
import { UserProfileModal } from '../components/UserProfileModal';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  MessageCircle,
  Share2,
  Image,
  BarChart2,
  Send,
  Sparkles,
  Filter,
  Users,
  CheckCircle2,
  X,
  HardDrive,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import {
  parseGoogleDriveUrl,
  openPersonalGoogleDrive,
} from '../services/googleDrive';
import {
  syncPostToFirestore,
  subscribeToPostsOnline,
  syncMessageToFirestore,
  subscribeToMessagesOnline,
} from '../services/apiSync';

export const FeedPage: React.FC = () => {
  const { currentUser, users } = useAuth();
  const { showToast, playChime } = useNotification();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [posts, setPosts] = useLocalStorage<Post[]>('proctus_posts', INITIAL_POSTS);
  const [messages, setMessages] = useLocalStorage<DirectMessage[]>('proctus_messages', INITIAL_MESSAGES);

  // Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [specialtiesList, setSpecialtiesList] = useState<string[]>([]);

  useEffect(() => {
    setSpecialtiesList(getSavedSpecialties());
    const handleSpecUpdate = () => setSpecialtiesList(getSavedSpecialties());
    window.addEventListener('proctus-specialties-update', handleSpecUpdate);
    return () => window.removeEventListener('proctus-specialties-update', handleSpecUpdate);
  }, []);

  // Real-time Firestore sync for feed posts & direct messages
  useEffect(() => {
    const unsubPosts = subscribeToPostsOnline((onlinePosts) => {
      if (onlinePosts && onlinePosts.length > 0) {
        setPosts((prev) => {
          const map = new Map<string, Post>();
          prev.forEach((p) => map.set(p.id, p));
          onlinePosts.forEach((p) => map.set(p.id, p));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    });

    let unsubMsgs = () => {};
    if (currentUser) {
      unsubMsgs = subscribeToMessagesOnline(currentUser.id, (onlineMsgs) => {
        if (onlineMsgs && onlineMsgs.length > 0) {
          setMessages((prev) => {
            const map = new Map<string, DirectMessage>();
            prev.forEach((m) => map.set(m.id, m));
            onlineMsgs.forEach((m) => map.set(m.id, m));
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        }
      });
    }

    return () => {
      unsubPosts();
      unsubMsgs();
    };
  }, [currentUser, setPosts, setMessages]);

  // Post creation state
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [showDriveInput, setShowDriveInput] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsText, setPollOptionsText] = useState('');

  // Comment input per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);

  // Profile modal
  const [inspectedUser, setInspectedUser] = useState<User | null>(null);

  // DM Drawer / active chat
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');

  // Handle URL param ?chatWith=userId
  useEffect(() => {
    const chatTarget = searchParams.get('chatWith');
    if (chatTarget) {
      setActiveChatUserId(chatTarget);
    }
  }, [searchParams]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast({ type: 'warning', title: 'Image volumineuse', message: 'Veuillez choisir une image inférieure à 2 Mo.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postImage && !pollQuestion.trim() && !driveUrlInput.trim()) return;
    if (!currentUser) return;

    let driveFileId: string | undefined = undefined;
    let driveWebViewLink: string | undefined = undefined;
    if (showDriveInput && driveUrlInput.trim()) {
      const parsed = parseGoogleDriveUrl(driveUrlInput.trim());
      driveFileId = parsed.fileId;
      driveWebViewLink = parsed.directUrl || driveUrlInput.trim();
    }

    let poll = undefined;
    if (showPollCreator && pollQuestion.trim()) {
      const opts = pollOptionsText
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      if (opts.length >= 2) {
        poll = {
          question: pollQuestion.trim(),
          options: opts.map((opt, i) => ({
            id: `opt-${Date.now()}-${i}`,
            text: opt,
            voters: [],
          })),
        };
      }
    }

    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorName: `${currentUser.firstName} ${currentUser.lastName}`,
      authorAvatar: currentUser.avatar,
      authorCohort: currentUser.cohort,
      authorSpecialty: currentUser.specialty,
      content: postContent.trim(),
      imageUrl: postImage || undefined,
      poll,
      likes: [],
      comments: [],
      driveFileId,
      driveWebViewLink,
      createdAt: new Date().toISOString(),
    };

    setPosts([newPost, ...posts]);
    syncPostToFirestore(newPost);
    setPostContent('');
    setPostImage(null);
    setShowDriveInput(false);
    setDriveUrlInput('');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOptionsText('');

    playChime('deal');
    showToast({
      type: 'deal',
      title: driveWebViewLink ? 'Publication Google Drive partagée !' : 'Publication partagée',
      message: 'Visible par tous les membres de la promotion.',
    });
  };

  // Like Toggle
  const handleToggleLike = (postId: string) => {
    if (!currentUser) return;
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) return p;
        const liked = p.likes.includes(currentUser.id);
        const newLikes = liked
          ? p.likes.filter(id => id !== currentUser.id)
          : [...p.likes, currentUser.id];
        return { ...p, likes: newLikes };
      })
    );
    playChime('click');
  };

  // Poll Vote
  const handleVotePoll = (postId: string, optionId: string) => {
    if (!currentUser) return;
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId || !p.poll) return p;
        const hasVoted = p.poll.options.some(opt => opt.voters.includes(currentUser.id));
        if (hasVoted) return p;

        const updatedOptions = p.poll.options.map(opt => {
          if (opt.id === optionId) {
            return { ...opt, voters: [...opt.voters, currentUser.id] };
          }
          return opt;
        });

        return { ...p, poll: { ...p.poll, options: updatedOptions } };
      })
    );
    playChime('click');
    showToast({ type: 'success', title: 'Vote enregistré' });
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !currentUser) return;

    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: currentUser.id,
      authorName: `${currentUser.firstName} ${currentUser.lastName}`,
      authorAvatar: currentUser.avatar,
      authorCohort: currentUser.cohort,
      authorSpecialty: currentUser.specialty,
      content: text,
      createdAt: new Date().toISOString(),
    };

    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
    );
    setCommentInputs({ ...commentInputs, [postId]: '' });
    playChime('click');
  };

  // Send Direct Message
  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeChatUserId || !currentUser) return;

    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      receiverId: activeChatUserId,
      content: chatMessageText.trim(),
      createdAt: new Date().toISOString(),
      read: true,
    };

    setMessages([...messages, newMsg]);
    syncMessageToFirestore(newMsg);
    setChatMessageText('');
    playChime('click');
  };

  // Filtered posts
  const filteredPosts = posts.filter(post => {
    if (selectedSpecialty !== 'all' && post.authorSpecialty !== selectedSpecialty) return false;
    if (selectedCohort !== 'all' && post.authorCohort !== selectedCohort) return false;
    return true;
  });

  const activeChatPartner = users.find(u => u.id === activeChatUserId);
  const activeConversation = messages.filter(
    m =>
      currentUser &&
      activeChatUserId &&
      ((m.senderId === currentUser.id && m.receiverId === activeChatUserId) ||
        (m.senderId === activeChatUserId && m.receiverId === currentUser.id))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A1F44] dark:text-white tracking-tight flex items-center gap-2">
            <span>Réseaux</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] font-mono">
              Promotion {currentUser?.cohort}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fil d'actualité, analyses financières et échanges entre membres de la promotion
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#C9A227]" />
            <select
              value={selectedSpecialty}
              onChange={e => setSelectedSpecialty(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Toutes les filières</option>
              {specialtiesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 text-xs">
            <Users className="w-3.5 h-3.5 text-[#C9A227]" />
            <select
              value={selectedCohort}
              onChange={e => setSelectedCohort(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Toutes promotions</option>
              {COHORT_YEARS.slice().reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Post Creator + Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Creator Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <form onSubmit={handleCreatePost}>
              <div className="flex gap-3">
                <img
                  src={currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.firstName}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#C9A227]"
                />
                <div className="flex-1">
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder={t('feed.createPost')}
                    rows={3}
                    className="w-full text-sm bg-transparent resize-none focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />

                  {/* Image Preview if selected */}
                  {postImage && (
                    <div className="relative mb-3 inline-block">
                      <img
                        src={postImage}
                        alt="Upload preview"
                        className="max-h-52 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setPostImage(null)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Google Drive Link Attachment */}
                  {showDriveInput && (
                    <div className="p-3 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5" />
                          Lien Google Drive / Docs / Sheets (100% Gratuit)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openPersonalGoogleDrive}
                            className="text-[11px] text-[#C9A227] hover:underline flex items-center gap-1 cursor-pointer font-normal"
                          >
                            <span>Ouvrir Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDriveInput(false);
                              setDriveUrlInput('');
                            }}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="url"
                          value={driveUrlInput}
                          onChange={e => setDriveUrlInput(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* Poll Creator Section */}
                  {showPollCreator && (
                    <div className="p-3 mb-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                      <div className="font-bold text-[#C9A227] flex items-center justify-between">
                        <span>Création de sondage interactif</span>
                        <button
                          type="button"
                          onClick={() => setShowPollCreator(false)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        value={pollQuestion}
                        onChange={e => setPollQuestion(e.target.value)}
                        placeholder="Question du sondage"
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={pollOptionsText}
                        onChange={e => setPollOptionsText(e.target.value)}
                        placeholder="Options séparées par une virgule"
                        className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                        <Image className="w-4 h-4 text-[#C9A227]" />
                        <span>Photo / Chart</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowDriveInput(!showDriveInput)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          showDriveInput
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <HardDrive className="w-4 h-4 text-blue-500" />
                        <span>Google Drive</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPollCreator(!showPollCreator)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          showPollCreator
                            ? 'bg-[#C9A227]/20 text-[#C9A227]'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <BarChart2 className="w-4 h-4 text-[#C9A227]" />
                        <span>Sondage</span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!postContent.trim() && !postImage && !pollQuestion.trim() && !driveUrlInput.trim()}
                      className="px-5 py-2 rounded-xl bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                    >
                      {t('feed.publish')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Posts Feed */}
          <div className="space-y-4">
            {filteredPosts.length === 0 ? (
              <div className="p-10 text-center rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 space-y-3">
                <MessageCircle className="w-12 h-12 text-[#C9A227] mx-auto opacity-75" />
                <h4 className="font-bold text-sm text-[#0A1F44] dark:text-white">
                  Aucune publication pour le moment
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Soyez le premier à partager une analyse, une opportunité ou un sondage avec les membres de la promotion !
                </p>
              </div>
            ) : (
              filteredPosts.map(post => {
                const isLiked = currentUser ? post.likes.includes(currentUser.id) : false;
                const author = users.find(u => u.id === post.authorId);
                const totalVotes = post.poll
                  ? post.poll.options.reduce((acc, o) => acc + o.voters.length, 0)
                  : 0;
                const hasVoted = post.poll && currentUser
                  ? post.poll.options.some(o => o.voters.includes(currentUser.id))
                  : false;

                return (
                  <article
                    key={post.id}
                    className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#C9A227]/40 transition space-y-4"
                  >
                    {/* Post Header */}
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => author && setInspectedUser(author)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <img
                          src={post.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${post.authorName}`}
                          alt={post.authorName}
                          className="w-10 h-10 rounded-full object-cover border border-[#C9A227] group-hover:scale-105 transition"
                        />
                        <div>
                          <div className="font-bold text-sm text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] transition">
                            {post.authorName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {post.authorCohort} • {post.authorSpecialty} • {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                        ID-{post.id.slice(-4)}
                      </span>
                    </div>

                    {/* Post Body */}
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {post.content}
                    </p>

                    {/* Post Image */}
                    {post.imageUrl && (
                      <div className="space-y-2">
                        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                          <img src={post.imageUrl} alt="Contenu" className="w-full object-cover max-h-96" />
                        </div>
                        {post.driveWebViewLink && (
                          <div className="flex justify-end">
                            <a
                              href={post.driveWebViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition cursor-pointer"
                              title="Ouvrir le fichier original dans Google Drive"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                              <span>Ouvrir sur Google Drive</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Google Drive Link without Image */}
                    {!post.imageUrl && post.driveWebViewLink && (
                      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[#0A1F44] dark:text-white block truncate">
                              Document partagé sur Google Drive
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-mono">
                              {post.driveWebViewLink}
                            </span>
                          </div>
                        </div>
                        <a
                          href={post.driveWebViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 transition"
                        >
                          <span>Consulter</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Interactive Poll */}
                    {post.poll && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="font-bold text-xs text-[#0A1F44] dark:text-white flex items-center justify-between">
                          <span>{post.poll.question}</span>
                          <span className="text-[11px] text-slate-500">{totalVotes} votes</span>
                        </div>
                        <div className="space-y-2">
                          {post.poll.options.map(opt => {
                            const userSelected = currentUser ? opt.voters.includes(currentUser.id) : false;
                            const percent = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => handleVotePoll(post.id, opt.id)}
                                disabled={hasVoted}
                                className={`w-full relative text-left p-2.5 rounded-xl border text-xs font-semibold overflow-hidden transition ${
                                  userSelected
                                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0A1F44] dark:text-white'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#C9A227]/60'
                                } ${!hasVoted ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'}`}
                              >
                                {hasVoted && (
                                  <div
                                    className="absolute top-0 bottom-0 left-0 bg-[#C9A227]/20 transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                  />
                                )}
                                <div className="relative flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    {userSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#C9A227]" />}
                                    {opt.text}
                                  </span>
                                  {hasVoted && <span className="font-mono text-[11px] font-bold text-[#C9A227]">{percent}%</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions: Likes, Comments, Share */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                          isLiked
                            ? 'text-red-500 bg-red-50 dark:bg-red-950/40'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
                        <span>{post.likes.length}</span>
                      </button>
                      <button
                        onClick={() =>
                          setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4 text-[#C9A227]" />
                        <span>{post.comments.length} commentaires</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast({ type: 'success', title: 'Lien du deal copié' });
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                        title="Partager"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Comments section toggle */}
                    {activeCommentsPostId === post.id && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {post.comments.map(c => (
                          <div key={c.id} className="flex gap-2.5 text-xs">
                            <img
                              src={c.authorAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${c.authorName}`}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#C9A227]/40"
                            />
                            <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl">
                              <div className="font-bold text-[#0A1F44] dark:text-white">
                                {c.authorName} <span className="font-normal text-slate-400 text-[10px]">• {c.authorSpecialty}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{c.content}</p>
                            </div>
                          </div>
                        ))}

                        {/* Add Comment input */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            placeholder={t('feed.writeComment')}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddComment(post.id);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="p-2 rounded-xl bg-[#0A1F44] text-[#C9A227] hover:bg-[#152e5c] transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Direct Messages (DM 1-to-1) + Cohort Directory */}
        <div className="space-y-6">
          {/* DM Widget */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#C9A227]" />
                <span>{t('feed.dm')}</span>
              </h3>
              {activeChatPartner && (
                <button
                  onClick={() => setActiveChatUserId(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Tous
                </button>
              )}
            </div>

            {/* Conversation Active */}
            {activeChatPartner ? (
              <div className="flex flex-col h-80">
                <div
                  onClick={() => setInspectedUser(activeChatPartner)}
                  className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer"
                >
                  <img
                    src={activeChatPartner.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${activeChatPartner.firstName}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[#C9A227]"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#0A1F44] dark:text-white">
                      {activeChatPartner.firstName} {activeChatPartner.lastName}
                    </div>
                    <div className="text-[10px] text-emerald-500 font-semibold">En ligne</div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
                  {activeConversation.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs py-8">
                      Début de votre échange sécurisé avec {activeChatPartner.firstName}.
                    </div>
                  ) : (
                    activeConversation.map(m => {
                      const isMe = m.senderId === currentUser?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-2.5 rounded-2xl ${
                              isMe
                                ? 'bg-[#0A1F44] text-[#C9A227] rounded-br-none'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                            }`}
                          >
                            <p>{m.content}</p>
                            <div className="text-[9px] opacity-60 text-right mt-1">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendDM} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <input
                    type="text"
                    value={chatMessageText}
                    onChange={e => setChatMessageText(e.target.value)}
                    placeholder={t('feed.typeMessage')}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[#0A1F44] text-[#C9A227] hover:bg-[#152e5c] transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              /* Contact List */
              <div className="space-y-2">
                <div className="text-xs text-slate-400 pb-1">{t('feed.selectContact')} :</div>
                {users
                  .filter(u => u.id !== currentUser?.id)
                  .map(member => (
                    <div
                      key={member.id}
                      onClick={() => setActiveChatUserId(member.id)}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={member.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${member.firstName}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-[#C9A227]/40"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#0A1F44] dark:text-white">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-[10px] text-[#C9A227] font-medium">
                            Promo {member.cohort} • {member.specialty}
                          </div>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connecté" />
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Members Highlights */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#C9A227] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Promotion {currentUser?.cohort} • Camarades
            </h3>
            <div className="space-y-2.5">
              {users.map(u => (
                <div
                  key={u.id}
                  onClick={() => setInspectedUser(u)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.firstName}`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{u.specialty}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#C9A227] px-2 py-0.5 rounded-full bg-[#C9A227]/10">
                    {(u.totalScore || 0).toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Member Profile Modal */}
      <UserProfileModal
        user={inspectedUser}
        onClose={() => setInspectedUser(null)}
        onStartChat={user => {
          setInspectedUser(null);
          setActiveChatUserId(user.id);
        }}
      />
    </div>
  );
};
