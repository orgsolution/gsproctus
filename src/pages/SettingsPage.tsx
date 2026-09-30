import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { COHORT_YEARS, DEFAULT_SPECIALTIES, ConfirmationEmail, SchoolConfig } from '../types';
import { getSavedSpecialties, saveSpecialties, getSentEmails, getSchoolConfig, saveSchoolConfig } from '../services/storage';
import { syncSchoolConfigOnline, syncSpecialtiesOnline, fetchOnlineData } from '../services/apiSync';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  Palette,
  Globe,
  User,
  LogOut,
  Save,
  Check,
  Camera,
  Layers,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  HardDrive,
  MailCheck,
  Mail,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  School,
  Award,
  Flame,
} from 'lucide-react';
import {
  parseGoogleDriveUrl,
  openPersonalGoogleDrive,
  openGoogleDriveUploadGuide,
  getSavedDrivePublications,
  saveDrivePublication,
  removeDrivePublication,
  DriveUploadResult,
  GoogleDriveParsedInfo,
} from '../services/googleDrive';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { currentUser, updateProfile, logout, isSuperAdmin } = useAuth();
  const { mode, setMode, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { showToast, playChime } = useNotification();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Profile Form state ("Mon compte")
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [linkedin, setLinkedin] = useState(currentUser?.linkedin || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [cohort, setCohort] = useState(currentUser?.cohort || '2025');
  const [specialty, setSpecialty] = useState(currentUser?.specialty || 'Audit et Comptabilité');

  // School and Sidebar Header Configuration (SuperAdmin only)
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>(getSchoolConfig);
  const [schoolName, setSchoolName] = useState(schoolConfig.schoolName || 'Haute École de Finance');
  const [headerSubtitle, setHeaderSubtitle] = useState(schoolConfig.headerSubtitle || 'Promotion Officielle');
  const [cohortLabel, setCohortLabel] = useState(schoolConfig.cohortLabel || '2025');
  const [badgeText, setBadgeText] = useState(schoolConfig.badgeText || 'Certifié');

  // Specialties Management
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');

  // Sent Emails Log
  const [sentEmails, setSentEmails] = useState<ConfirmationEmail[]>([]);

  // Google Drive free publication state
  const [driveFiles, setDriveFiles] = useState<DriveUploadResult[]>([]);
  const [testDriveUrl, setTestDriveUrl] = useState('');
  const [parsedDriveResult, setParsedDriveResult] = useState<GoogleDriveParsedInfo | null>(null);

  useEffect(() => {
    setSpecialties(getSavedSpecialties());
    setSentEmails(getSentEmails());
    setDriveFiles(getSavedDrivePublications());

    // Sync online database school configuration and specialties
    fetchOnlineData().then(online => {
      if (online) {
        if (online.schoolConfig) {
          setSchoolConfig(online.schoolConfig);
          setSchoolName(online.schoolConfig.schoolName || 'Haute École de Finance');
          setHeaderSubtitle(online.schoolConfig.headerSubtitle || 'Promotion Officielle');
          setCohortLabel(online.schoolConfig.cohortLabel || '2025');
          setBadgeText(online.schoolConfig.badgeText || 'Certifié');
          saveSchoolConfig(online.schoolConfig);
        }
        if (online.specialties && Array.isArray(online.specialties) && online.specialties.length > 0) {
          setSpecialties(online.specialties);
          saveSpecialties(online.specialties);
        }
      }
    });

    const handleEmailUpdate = () => setSentEmails(getSentEmails());
    window.addEventListener('proctus-email-sent', handleEmailUpdate);
    return () => {
      window.removeEventListener('proctus-email-sent', handleEmailUpdate);
    };
  }, []);

  const handleTestDriveLink = () => {
    if (!testDriveUrl.trim()) return;
    const parsed = parseGoogleDriveUrl(testDriveUrl.trim());
    setParsedDriveResult(parsed);
    if (parsed.isValid) {
      playChime('deal');
      showToast({
        type: 'deal',
        title: 'Lien Google Drive valide !',
        message: `Fichier détecté : ${parsed.type || 'document'}. Prêt pour la bibliothèque Proctus.`,
      });
    } else {
      showToast({
        type: 'warning',
        title: 'Format non reconnu',
        message: 'Assurez-vous de coller un lien Google Drive ou Google Docs.',
      });
    }
  };

  const handleAddDrivePublication = () => {
    if (!testDriveUrl.trim() || !parsedDriveResult?.isValid) return;
    const newPub: DriveUploadResult = {
      id: parsedDriveResult.fileId || `drive-${Date.now()}`,
      name: `Document Google Drive (${parsedDriveResult.type || 'Fichier'})`,
      mimeType: parsedDriveResult.type || 'google-drive',
      webViewLink: parsedDriveResult.directUrl || testDriveUrl.trim(),
      createdAt: new Date().toISOString(),
    };
    saveDrivePublication(newPub);
    setDriveFiles(getSavedDrivePublications());
    setTestDriveUrl('');
    setParsedDriveResult(null);
    playChime('success');
    showToast({
      type: 'success',
      title: 'Publication ajoutée',
      message: 'Lien enregistré dans votre espace Proctus.',
    });
  };

  const handleDeleteDriveFile = (file: DriveUploadResult) => {
    removeDrivePublication(file.id);
    setDriveFiles(getSavedDrivePublications());
    playChime('click');
    showToast({ type: 'info', title: 'Publication retirée de la liste' });
  };

  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'ht', label: 'Kreyòl ayisyen', flag: '🇭🇹' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
  ];

  const presetColors = ['#C9A227', '#E63946', '#2A9D8F', '#3B82F6', '#8B5CF6', '#F59E0B'];

  const handleIntegrateGmailPhoto = () => {
    if (!currentUser?.email) return;
    const gmailAvatarUrl = `https://unavatar.io/google/${encodeURIComponent(currentUser.email)}`;
    setAvatar(gmailAvatarUrl);
    updateProfile({ avatar: gmailAvatarUrl });
    playChime('success');
    showToast({
      type: 'success',
      title: 'Photo Gmail intégrée',
      message: 'La photo associée à votre compte Google a été synchronisée.',
    });
  };

  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
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
        updateProfile({ avatar: dataUrl });
        playChime('success');
        showToast({
          type: 'success',
          title: 'Photo mise à jour',
          message: 'Votre photo personnalisée a été enregistrée avec succès.',
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      firstName,
      lastName,
      bio,
      linkedin,
      avatar,
      cohort,
      specialty,
    });
    playChime('success');
    showToast({ type: 'success', title: 'Profil enregistré' });
  };

  const handleSaveSchoolConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SchoolConfig = {
      schoolName: schoolName.trim() || 'Haute École de Finance',
      headerSubtitle: headerSubtitle.trim() || 'Promotion Officielle',
      cohortLabel: cohortLabel.trim() || '2025',
      badgeText: badgeText.trim() || 'Certifié',
    };
    setSchoolConfig(updated);
    saveSchoolConfig(updated);
    syncSchoolConfigOnline(updated);
    playChime('success');
    showToast({
      type: 'success',
      title: 'En-tête du Sidebar enregistré',
      message: `Nom de l'école mis à jour : "${updated.schoolName}"`,
    });
  };

  const handleAddSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSpecialtyName.trim();
    if (!clean) return;
    if (specialties.some(s => s.toLowerCase() === clean.toLowerCase())) {
      showToast({ type: 'error', title: 'Cette filière existe déjà.' });
      return;
    }
    const updated = [...specialties, clean];
    setSpecialties(updated);
    saveSpecialties(updated);
    syncSpecialtiesOnline(updated);
    setNewSpecialtyName('');
    playChime('click');
    showToast({ type: 'success', title: 'Filière ajoutée' });
  };

  const handleDeleteSpecialty = (item: string) => {
    if (specialties.length <= 1) {
      showToast({ type: 'error', title: 'Impossible de supprimer la dernière filière.' });
      return;
    }
    const updated = specialties.filter(s => s !== item);
    setSpecialties(updated);
    saveSpecialties(updated);
    syncSpecialtiesOnline(updated);
    playChime('click');
    showToast({ type: 'info', title: 'Filière supprimée' });
  };

  const handleResetSpecialties = () => {
    setSpecialties(DEFAULT_SPECIALTIES);
    saveSpecialties(DEFAULT_SPECIALTIES);
    syncSpecialtiesOnline(DEFAULT_SPECIALTIES);
    playChime('click');
    showToast({ type: 'info', title: 'Filières réinitialisées par défaut' });
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('proctus_language', code);
    playChime('click');
    showToast({ type: 'info', title: 'Langue mise à jour' });
  };

  const handleClearLocalData = () => {
    if (confirm('Voulez-vous vider le cache local ? Vous serez déconnecté.')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-[#0A1F44] dark:text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-[#C9A227]" />
          <span>Paramètres et Personnalisation</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Personnalisez votre expérience, vos filières et votre profil de promotion
        </p>
      </div>

      {/* 1. Mon Compte (Profile & Identity) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="font-bold text-base text-[#0A1F44] dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#C9A227]" />
            <span>Mon compte</span>
          </h3>
          <div className="flex items-center gap-2">
            {currentUser?.emailConfirmed && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                <MailCheck className="w-3.5 h-3.5" />
                Email Confirmé
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#0A1F44]/10 dark:bg-white/10 text-[#0A1F44] dark:text-white font-semibold">
              {currentUser?.email}
            </span>
          </div>
        </div>

        {/* Photo de profil personnalisée ou Gmail */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            <img
              src={avatar || `https://unavatar.io/google/${encodeURIComponent(currentUser?.email || '')}`}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-3 border-[#C9A227] shadow-md bg-[#0A1F44]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName + ' ' + lastName)}&backgroundColor=0A1F44&textColor=C9A227`;
              }}
            />
          </div>
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <div className="text-xs font-bold text-[#0A1F44] dark:text-white">
                Photo de profil
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Intégrez la vraie photo de votre compte Gmail ou téléversez une photo personnalisée
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <button
                type="button"
                onClick={handleIntegrateGmailPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-[#0A1F44] dark:text-white hover:border-[#C9A227] transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Intégrer depuis mon compte Gmail</span>
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1F44] text-[#C9A227] text-xs font-bold hover:bg-[#152e5c] transition shadow-xs cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>Téléverser une photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Prénom
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Nom
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Année de promotion
              </label>
              <select
                value={cohort}
                onChange={e => setCohort(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
              >
                {COHORT_YEARS.slice().reverse().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Filière / Spécialité
              </label>
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
              >
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Biographie et Présentation
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Profil LinkedIn
            </label>
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md transition hover:bg-[#152e5c] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer mon compte</span>
            </button>
          </div>
        </form>
      </div>

      {/* Vue pour les utilisateurs standards : uniquement Mon Compte et Se Déconnecter */}
      {!isSuperAdmin && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              Déconnexion
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fermer votre session Proctus sur cet appareil
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold transition cursor-pointer border border-red-200 dark:border-red-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter de Proctus</span>
          </button>
        </div>
      )}

      {/* Sections d'administration réservées EXCLUSIVEMENT au SuperAdmin */}
      {isSuperAdmin && (
        <>
          {/* 2. SuperAdmin Only: Configuration de l'établissement & En-tête du Sidebar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#0A1F44] text-[#C9A227] border border-[#C9A227]/30">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                      En-tête du Sidebar & Nom de l'établissement
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#C9A227]/20 text-[#0A1F44] dark:text-[#C9A227] text-[10px] font-black uppercase tracking-wider">
                      SuperAdmin
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Modifiez le nom de l'école et l'en-tête affichés en haut du menu latéral pour l'ensemble des utilisateurs
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSchoolConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nom de l'école / Institution
                  </label>
                  <div className="relative">
                    <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="ex: Haute École de Finance, Université..."
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ce nom apparaît dans le grand badge officiel en tête du sidebar sur tous les appareils de la promotion.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sous-titre de l'en-tête
                  </label>
                  <input
                    type="text"
                    value={headerSubtitle}
                    onChange={(e) => setHeaderSubtitle(e.target.value)}
                    placeholder="ex: Promotion Officielle"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#C9A227]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Badge de certification
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="ex: Certifié, Agréé..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#C9A227]"
                  />
                </div>
              </div>

              {/* Aperçu en direct */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Aperçu en direct dans le Sidebar :
                </div>
                <div className="max-w-xs p-3.5 rounded-2xl bg-gradient-to-br from-[#0A1F44] to-[#152e5c] text-white shadow-md border border-[#C9A227]/30">
                  <div className="flex items-center justify-between text-xs text-[#C9A227] font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#F4A261]" />
                      {headerSubtitle || 'Promotion Officielle'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#C9A227]/20 text-[#C9A227] text-[10px] font-mono">
                      2025
                    </span>
                  </div>
                  <div className="font-bold text-sm text-white">
                    {schoolName || 'Haute École de Finance'}
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#C9A227]" />
                    Audit et Comptabilité • {badgeText || 'Certifié'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md transition hover:bg-[#152e5c] cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer l'en-tête du sidebar</span>
                </button>
              </div>
            </form>
          </div>

          {/* 3. Gestion des filières (Customizable Specialties) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                    Gestion des filières
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Personnalisez la liste des spécialités disponibles pour les inscriptions et les filtres (Audit et Comptabilité, Douane, Trésor...)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetSpecialties}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#C9A227]" />
                <span>Réinitialiser par défaut</span>
              </button>
            </div>

            {/* Add new specialty */}
            <form onSubmit={handleAddSpecialty} className="flex gap-2">
              <input
                type="text"
                value={newSpecialtyName}
                onChange={e => setNewSpecialtyName(e.target.value)}
                placeholder="Nouvelle filière (ex: Fiscalité Internationale)"
                className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs transition hover:bg-[#152e5c] cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une filière</span>
              </button>
            </form>

            {/* Badges list */}
            <div className="flex flex-wrap gap-2 pt-2">
              {specialties.map(item => (
                <div
                  key={item}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                    ['Audit et Comptabilité', 'Douane', 'Trésor'].includes(item)
                      ? 'bg-[#C9A227]/15 border-[#C9A227]/40 text-[#0A1F44] dark:text-[#C9A227] font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSpecialty(item)}
                    className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                    title="Supprimer la filière"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Registre des E-mails de Confirmation Envoyés */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#C9A227]" />
                <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                  Historique des e-mails de confirmation
                </h3>
              </div>
              <span className="text-xs font-mono text-[#C9A227]">
                {sentEmails.length} e-mails délivrés
              </span>
            </div>

            {sentEmails.length === 0 ? (
              <div className="text-xs text-slate-400 py-3 text-center">
                Aucun e-mail de confirmation émis pour le moment. Tout nouvel inscrit recevra automatiquement son e-mail officiel ici.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {sentEmails.map(em => (
                  <div
                    key={em.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[#0A1F44] dark:text-white truncate">
                        {em.subject}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Destinataire : <strong className="text-slate-600 dark:text-slate-300">{em.toEmail}</strong> ({em.recipientName})
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        ✓ Envoyé
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {new Date(em.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Compte Google Drive Personnel (Publication 100% Gratuite, Pas de Google Cloud) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#0A1F44] text-[#C9A227] border border-[#C9A227]/30">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                      Publication Google Drive Personnelle
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      100% Gratuit (0€ Cloud)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Utilisez votre compte Google Drive personnel (15 Go inclus sans frais) sans avoir besoin de Google Cloud
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openPersonalGoogleDrive}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <HardDrive className="w-4 h-4" />
                  <span>Ouvrir mon Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </div>

            {/* Free Cloud Billing Banner */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Publication sans facturation Cloud (Zero Cloud Billing Setup)</span>
              </div>
              <p className="leading-relaxed">
                Pour publier cette application sur <strong>Google AI Studio (Publish)</strong>, <strong>aucun compte de facturation Google Cloud ni carte bancaire n'est requis</strong>. Vos cours, polycopiés et synthèses sont hébergés gratuitement sur votre propre espace <strong>Google Drive</strong> personnel (15 Go gratuits par compte Google).
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                  ✓ Aucun projet payant Google Cloud
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                  ✓ Hébergement Google Drive 100% gratuit
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                  ✓ Coffre local sécurisé IndexedDB
                </span>
              </div>
            </div>

            {/* Test / Add Drive Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold text-[#0A1F44] dark:text-white flex items-center justify-between">
                <span>Tester ou ajouter un lien Google Drive :</span>
                <button
                  type="button"
                  onClick={openGoogleDriveUploadGuide}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Comment partager un fichier ?</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={testDriveUrl}
                  onChange={(e) => setTestDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestDriveLink}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[#0A1F44] dark:text-white font-bold text-xs transition cursor-pointer"
                  >
                    Vérifier
                  </button>
                  {parsedDriveResult?.isValid && (
                    <button
                      type="button"
                      onClick={handleAddDrivePublication}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Ajouter
                    </button>
                  )}
                </div>
              </div>

              {parsedDriveResult && (
                <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                  parsedDriveResult.isValid
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {parsedDriveResult.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>
                      {parsedDriveResult.isValid
                        ? `Format valide : ${parsedDriveResult.type} (ID: ${parsedDriveResult.fileId?.slice(0, 12)}...)`
                        : 'Lien Google Drive non reconnu. Veuillez copier le lien de partage du fichier.'}
                    </span>
                  </div>
                  {parsedDriveResult.previewUrl && (
                    <a
                      href={parsedDriveResult.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-xs ml-2"
                    >
                      Aperçu
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Files on Google Drive */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Publications enregistrées via Google Drive ({driveFiles.length})</span>
              </div>
              {driveFiles.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Aucun lien Google Drive enregistré pour le moment. Vous pouvez coller le lien d'un document dans la Bibliothèque ou le Réseau.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {driveFiles.map(file => (
                    <div
                      key={file.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-[#0A1F44] dark:text-white truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Type : {file.mimeType}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                          >
                            <span>Ouvrir sur Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDriveFile(file)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Retirer de la liste"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 6. Theme & Appearance Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#C9A227]" />
              <span>Apparence et Thème</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setMode('light')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  mode === 'light'
                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0A1F44] dark:text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sun className="w-5 h-5 text-amber-500" />
                <span className="text-xs">{t('settings.light')}</span>
              </button>
              <button
                onClick={() => setMode('dark')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  mode === 'dark'
                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0A1F44] dark:text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Moon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">{t('settings.dark')}</span>
              </button>
              <button
                onClick={() => setMode('system')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  mode === 'system'
                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0A1F44] dark:text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Laptop className="w-5 h-5 text-slate-500" />
                <span className="text-xs">{t('settings.system')}</span>
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 cursor-pointer ${
                  mode === 'custom'
                    ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0A1F44] dark:text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Palette className="w-5 h-5 text-[#C9A227]" />
                <span className="text-xs">{t('settings.custom')}</span>
              </button>
            </div>

            {/* Accent Color picker */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('settings.accentColor')}
                </div>
                <div className="text-[11px] text-slate-400">
                  Teinte dorée ou nuances personnalisées de la charte
                </div>
              </div>
              <div className="flex items-center gap-2">
                {presetColors.map(c => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition transform hover:scale-110 cursor-pointer shadow-xs ${
                      accentColor === c ? 'ring-2 ring-offset-2 ring-black dark:ring-white scale-110' : ''
                    }`}
                  >
                    {accentColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size choice */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('settings.fontSize')}
                </div>
                <div className="text-[11px] text-slate-400">
                  Densité de texte adaptée pour la lecture et les listes
                </div>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setFontSize('compact')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    fontSize === 'compact' ? 'bg-white dark:bg-slate-900 shadow-xs text-[#0A1F44] dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => setFontSize('normal')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    fontSize === 'normal' ? 'bg-white dark:bg-slate-900 shadow-xs text-[#0A1F44] dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    fontSize === 'large' ? 'bg-white dark:bg-slate-900 shadow-xs text-[#0A1F44] dark:text-white' : 'text-slate-500'
                  }`}
                >
                  Confort
                </button>
              </div>
            </div>
          </div>

          {/* 7. Languages Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#C9A227]" />
              <span>Langues</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {languages.map(l => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition cursor-pointer ${
                    i18n.language.startsWith(l.code)
                      ? 'border-[#C9A227] bg-[#C9A227]/15 text-[#C9A227] font-bold'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xl">{l.flag}</span>
                  <div>
                    <div className="text-xs font-bold">{l.label}</div>
                    <div className="text-[10px] opacity-60 uppercase">{l.code}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 8. Local Storage & PWA Section */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#C9A227]" />
              <span>Stockage Local et PWA</span>
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  Installation PWA Multiplateforme
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Disponible sur MacBook, PC Windows, Android, iPhone et iPad
                </div>
              </div>
              <PWAInstallButton showDetails={true} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleClearLocalData}
                className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
              >
                Vider le stockage local
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter de Proctus</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
