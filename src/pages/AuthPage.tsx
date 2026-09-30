import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import { COHORT_YEARS, ConfirmationEmail, isSuperAdminEmail } from '../types';
import { getSavedSpecialties } from '../services/storage';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Mail,
  User as UserIcon,
  GraduationCap,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  X,
  MailCheck,
  Send,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, requestPasswordReset, resetPasswordWithToken, currentUser } = useAuth();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cohort, setCohort] = useState('2025');
  const [specialtyList, setSpecialtyList] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState<string>('Audit et Comptabilité');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Confirmation email preview modal state
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);
  const [activePreviewEmail, setActivePreviewEmail] = useState<ConfirmationEmail | null>(null);

  // Google Account Chooser Modal state
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [googleEmailError, setGoogleEmailError] = useState('');

  useEffect(() => {
    const list = getSavedSpecialties();
    setSpecialtyList(list);
    if (list.length > 0) {
      setSpecialty(list[0]);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'signup') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.search]);

  // If already logged in, redirect to /app/feed
  useEffect(() => {
    if (currentUser) {
      navigate('/app/feed', { replace: true });
    }
  }, [currentUser, navigate]);

  // Handle custom photo upload on signup
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const success = await login(email, password);
        if (success) {
          navigate('/app/feed');
        } else {
          setError('Email ou mot de passe incorrect.');
        }
      } else {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
          setError('Veuillez renseigner tous les champs obligatoires.');
          setLoading(false);
          return;
        }

        const res = await signup({
          email,
          passwordPlain: password,
          firstName,
          lastName,
          cohort,
          specialty,
          bio,
          avatar: avatar || undefined,
        });

        if (res.success) {
          if (res.confirmationEmail) {
            setActivePreviewEmail(res.confirmationEmail);
            setShowEmailPreviewModal(true);
          } else {
            navigate('/app/feed');
          }
        } else {
          setError(res.error || 'Erreur lors de la création du compte.');
        }
      }
    } catch {
      setError('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign In handler
  const handleGoogleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setGoogleEmailError('Veuillez renseigner votre adresse e-mail Google.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setGoogleEmailError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    setGoogleEmailError('');
    setLoading(true);
    setError('');

    try {
      const namePart = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const res = await loginWithGoogle({
        email: cleanEmail,
        name: isSuperAdminEmail(cleanEmail) ? 'Admin Proctus' : (formattedName || 'Utilisateur Google'),
        cohort: '2025',
        specialty: specialty || 'Audit et Comptabilité',
      });

      setShowGoogleChooser(false);
      setCustomGoogleEmail('');

      if (res.success) {
        if (res.isNewUser && res.confirmationEmail) {
          setActivePreviewEmail(res.confirmationEmail);
          setShowEmailPreviewModal(true);
        } else {
          navigate('/app/feed');
        }
      } else {
        setError(res.error || 'Erreur de connexion Google.');
      }
    } catch {
      setError('Impossible de se connecter avec Google.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset step 1: Send Code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccessMsg('');
    if (!resetEmail.trim()) {
      setResetError('Veuillez entrer votre adresse e-mail.');
      return;
    }

    const res = await requestPasswordReset(resetEmail.trim());
    if (res.success) {
      setResetSuccessMsg(`Un code de sécurité à 6 chiffres a été envoyé à ${resetEmail.trim()}.`);
      if (res.confirmationEmail) {
        setActivePreviewEmail(res.confirmationEmail);
      }
      setResetStep('confirm');
    } else {
      setResetError(res.error || 'Adresse e-mail introuvable.');
    }
  };

  // Password Reset step 2: Submit new password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetCode.trim() || !newPassword.trim()) {
      setResetError('Veuillez remplir le code et le nouveau mot de passe.');
      return;
    }

    const res = await resetPasswordWithToken(resetEmail.trim(), resetCode.trim(), newPassword);
    if (res.success) {
      setResetSuccessMsg('Votre mot de passe a été réinitialisé avec succès !');
      setTimeout(() => {
        setShowResetModal(false);
        setResetStep('request');
        setResetCode('');
        setNewPassword('');
        setEmail(resetEmail);
        setIsLogin(true);
      }, 1800);
    } else {
      setResetError(res.error || 'Code invalide ou expiré.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1F44] flex flex-col justify-center items-center p-4 selection:bg-[#C9A227]/30 selection:text-white relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9A227]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/">
            <Logo size={52} showText={true} onBlue={true} />
          </Link>
          <p className="text-xs text-slate-300 mt-2">
            Plateforme réservée aux Élèves - Stagiaires.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#131E35] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 text-slate-800 dark:text-slate-100">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                isLogin
                  ? 'bg-[#0A1F44] text-[#C9A227] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth.submitLogin')}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                !isLogin
                  ? 'bg-[#0A1F44] text-[#C9A227] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth.submitSignup')}
            </button>
          </div>

          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#0A1F44] dark:text-white">
              {isLogin ? t('auth.loginTitle') : t('auth.signupTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isLogin ? t('auth.loginSubtitle') : t('auth.signupSubtitle')}
            </p>
          </div>

          {/* Option de Connexion via Google */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowGoogleChooser(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-3 transition shadow-xs cursor-pointer hover:border-[#C9A227]/60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLogin ? 'Se connecter avec Google' : 'S\'inscrire avec Google'}</span>
            </button>
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
              <span className="px-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                ou par identifiants
              </span>
              <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Photo upload avatar preview */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-full bg-[#0A1F44] text-[#C9A227] flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border-2 border-[#C9A227]">
                    {avatar ? (
                      <img src={avatar} alt="Aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Photo de profil (optionnelle)
                    </label>
                    <label className="inline-block text-[11px] px-3 py-1.5 rounded-lg bg-[#0A1F44] text-[#C9A227] font-semibold cursor-pointer hover:bg-[#142D57] transition">
                      Choisir une photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('auth.firstName')} *
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('auth.lastName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('auth.cohort')}
                    </label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <select
                        value={cohort}
                        onChange={(e) => setCohort(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                      >
                        {COHORT_YEARS.slice().reverse().map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t('auth.specialty')} *
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <select
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227] font-medium"
                      >
                        {specialtyList.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('auth.email')} *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {t('auth.password')} *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email || '');
                    setResetError('');
                    setResetSuccessMsg('');
                    setResetStep('request');
                    setShowResetModal(true);
                  }}
                  className="text-[11px] text-[#C9A227] hover:underline font-semibold cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <MailCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Un e-mail de confirmation officiel vous sera automatiquement adressé dès l'inscription.</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0A1F44] hover:bg-[#132B5B] text-[#C9A227] font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              <span>{loading ? t('common.loading') : isLogin ? t('auth.submitLogin') : t('auth.submitSignup')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick link to password reset */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => {
                setResetEmail(email || '');
                setShowResetModal(true);
              }}
              className="inline-flex items-center gap-1 hover:text-[#C9A227] transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>Réinitialiser mon mot de passe</span>
            </button>
            <span className="text-[11px] text-slate-400">Secured SSL</span>
          </div>
        </div>
      </div>

      {/* 1. Modal: Réinitialiser le mot de passe */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#131E35] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-[#0A1F44] text-[#C9A227]">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0A1F44] dark:text-white">
                  Réinitialiser le mot de passe
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resetStep === 'request'
                    ? 'Recevez un code de sécurité par e-mail'
                    : 'Entrez le code et définissez votre nouveau mot de passe'}
                </p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
            )}

            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Adresse e-mail de votre compte
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md transition hover:bg-[#132B5B] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer le code par e-mail</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Code de sécurité à 6 chiffres
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="w-full p-2.5 text-center font-mono text-base font-bold tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                  />
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>Envoyé à {resetEmail}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (activePreviewEmail) setShowEmailPreviewModal(true);
                      }}
                      className="text-[#C9A227] hover:underline cursor-pointer"
                    >
                      Voir l'e-mail
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ← Renvoyer un code
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md transition hover:bg-[#132B5B] cursor-pointer"
                  >
                    Valider le nouveau mot de passe
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. Modal: E-mail de confirmation après inscription */}
      {showEmailPreviewModal && activePreviewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#131E35] rounded-3xl shadow-2xl border-2 border-[#C9A227]/60 overflow-hidden relative text-left">
            <div className="bg-[#0A1F44] text-white p-4 flex items-center justify-between border-b border-[#C9A227]/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#C9A227] text-[#0A1F44]">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">E-mail de confirmation officiel</h4>
                  <p className="text-[11px] text-[#C9A227]">Expédié par le serveur de promotion Proctus</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEmailPreviewModal(false);
                  navigate('/app/feed');
                }}
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>De : <strong className="text-slate-800 dark:text-slate-200">Proctus Finance Promotion &lt;no-reply@proctus.app&gt;</strong></span>
                  <span className="font-mono text-[10px]">{new Date(activePreviewEmail.sentAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  À : <strong className="text-slate-800 dark:text-slate-200">{activePreviewEmail.recipientName} &lt;{activePreviewEmail.toEmail}&gt;</strong>
                </div>
                <div className="text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  Objet : <strong className="text-[#0A1F44] dark:text-[#C9A227]">{activePreviewEmail.subject}</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1A33] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 space-y-3 leading-relaxed">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Logo size={28} showText={true} />
                </div>
                <p className="whitespace-pre-line font-sans">
                  {activePreviewEmail.bodyText}
                </p>
                {activePreviewEmail.token && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-200">
                      Code de sécurité & validation
                    </span>
                    <div className="font-mono text-2xl font-black text-[#C9A227] tracking-widest">
                      {activePreviewEmail.token}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  E-mail transmis avec succès
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailPreviewModal(false);
                    navigate('/app/feed');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md transition hover:bg-[#132B5B] cursor-pointer"
                >
                  Accéder à la plateforme →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: S'inscrire / Se connecter avec Google (Seulement le champ Email) */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#131E35] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
            <button
              type="button"
              onClick={() => {
                setShowGoogleChooser(false);
                setGoogleEmailError('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <svg className="w-9 h-9 mx-auto mb-2.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="text-base font-bold text-[#0A1F44] dark:text-white">
                {isLogin ? 'Se connecter avec Google' : "S'inscrire avec Google"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Entrez votre adresse e-mail Google
              </p>
            </div>

            <form onSubmit={handleGoogleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Adresse e-mail Google
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={customGoogleEmail}
                    onChange={(e) => {
                      setCustomGoogleEmail(e.target.value);
                      if (googleEmailError) setGoogleEmailError('');
                    }}
                    placeholder="exemple@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                  />
                </div>
                {googleEmailError && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">
                    {googleEmailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion...</span>
                  </>
                ) : (
                  <span>Continuer</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
