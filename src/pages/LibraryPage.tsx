import React, { useState, useEffect } from 'react';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  toggleFavoriteDocument,
} from '../services/indexedDb';
import { DocumentMeta, COHORT_YEARS } from '../types';
import { getSavedSpecialties } from '../services/storage';
import { useNotification } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import {
  parseGoogleDriveUrl,
  openPersonalGoogleDrive,
} from '../services/googleDrive';
import {
  BookOpen,
  Search,
  Plus,
  Star,
  ExternalLink,
  Download,
  Eye,
  FileText,
  Trash2,
  GraduationCap,
  HardDrive,
  CheckCircle2,
  X,
  Link as LinkIcon,
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { showToast, playChime } = useNotification();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyDriveHosted, setOnlyDriveHosted] = useState(false);
  const [specialtiesList, setSpecialtiesList] = useState<string[]>([]);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'drive' | 'file'>('drive');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadSubject, setUploadSubject] = useState('Audit et Comptabilité');
  const [uploadYear, setUploadYear] = useState('2025');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadedFileData, setUploadedFileData] = useState<{
    file?: File;
    name: string;
    type: string;
    size: number;
    base64: string;
    text: string;
  } | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null);

  // Scientific search query
  const [scientificQuery, setScientificQuery] = useState('');

  useEffect(() => {
    loadDocs();
    const list = getSavedSpecialties();
    setSpecialtiesList(list);
    if (list.length > 0) {
      setUploadSubject(list[0]);
    }
    const handleSpecUpdate = () => setSpecialtiesList(getSavedSpecialties());
    window.addEventListener('proctus-specialties-update', handleSpecUpdate);
    return () => {
      window.removeEventListener('proctus-specialties-update', handleSpecUpdate);
    };
  }, []);

  const loadDocs = async () => {
    const docs = await getAllDocuments();
    setDocuments(docs);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedFileData({
          file,
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          base64,
          text: `Document importé : ${file.name}. Matière : ${uploadSubject}.`,
        });
        if (!uploadTitle) {
          setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    let driveFileId: string | undefined = undefined;
    let driveWebViewLink: string | undefined = undefined;
    let isGoogleDriveHosted = false;

    if (uploadMode === 'drive') {
      if (!driveUrlInput.trim()) {
        showToast({ type: 'error', title: 'Lien Google Drive requis', message: 'Veuillez coller le lien de votre document Google Drive.' });
        return;
      }
      const parsed = parseGoogleDriveUrl(driveUrlInput.trim());
      if (!parsed.isValid) {
        showToast({ type: 'warning', title: 'Lien Drive', message: 'Veuillez entrer un lien Google Drive ou Google Docs valide.' });
        return;
      }
      driveFileId = parsed.fileId;
      driveWebViewLink = parsed.directUrl || driveUrlInput.trim();
      isGoogleDriveHosted = true;
    }

    const newDoc: DocumentMeta = {
      id: `doc-${Date.now()}`,
      title: uploadTitle.trim(),
      author: uploadAuthor.trim() || 'Membre de la Promotion',
      subject: uploadSubject,
      year: uploadYear,
      tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
      description: uploadDesc.trim() || (isGoogleDriveHosted ? 'Document hébergé sur Google Drive.' : 'Ouvrage de référence et synthèse de cours.'),
      fileName: uploadedFileData?.name || `${uploadTitle.trim()}.pdf`,
      fileType: isGoogleDriveHosted ? 'google-drive-link' : (uploadedFileData?.type || 'application/pdf'),
      fileSize: uploadedFileData?.size || 0,
      dataBase64: uploadedFileData?.base64,
      textSnippet: uploadedFileData?.text || uploadDesc || uploadTitle,
      isFavorite: false,
      driveFileId,
      driveWebViewLink,
      isGoogleDriveHosted,
      createdAt: new Date().toISOString(),
    };

    await saveDocument(newDoc);
    await loadDocs();
    setShowUploadModal(false);
    setUploadTitle('');
    setUploadAuthor('');
    setUploadDesc('');
    setUploadTags('');
    setDriveUrlInput('');
    setUploadedFileData(null);

    playChime('deal');
    showToast({
      type: 'deal',
      title: isGoogleDriveHosted ? 'Publié avec Google Drive !' : 'Document archivé',
      message: isGoogleDriveHosted
        ? 'Publié gratuitement via votre compte Google Drive personnel (0€ Google Cloud).'
        : 'Enregistré dans le coffre local IndexedDB.',
    });
  };

  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavoriteDocument(id);
    await loadDocs();
    playChime('click');
  };

  const handleDelete = async (doc: DocumentMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Voulez-vous supprimer ce document de la bibliothèque ?')) {
      await deleteDocument(doc.id);
      await loadDocs();
      showToast({ type: 'info', title: 'Document supprimé' });
    }
  };

  const handleLaunchScientificSearch = (engine: 'ssrn' | 'repec' | 'scholar' | 'arxiv' | 'jstor') => {
    const q = encodeURIComponent(scientificQuery.trim() || 'finance');
    let url = '';
    switch (engine) {
      case 'ssrn':
        url = `https://papers.ssrn.com/sol3/results.cfm?txtKey_Words=${q}`;
        break;
      case 'repec':
        url = `https://ideas.repec.org/cgi-bin/htsearch?q=${q}`;
        break;
      case 'scholar':
        url = `https://scholar.google.com/scholar?q=${q}+finance`;
        break;
      case 'arxiv':
        url = `https://arxiv.org/search/?query=${q}&searchtype=all&source=header`;
        break;
      case 'jstor':
        url = `https://www.jstor.org/action/doBasicSearch?Query=${q}`;
        break;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const filteredDocs = documents.filter(doc => {
    if (onlyFavorites && !doc.isFavorite) return false;
    if (onlyDriveHosted && !doc.isGoogleDriveHosted) return false;
    if (selectedSubject !== 'all' && !doc.subject.toLowerCase().includes(selectedSubject.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        doc.title.toLowerCase().includes(q) ||
        doc.author.toLowerCase().includes(q) ||
        doc.description.toLowerCase().includes(q) ||
        doc.tags.some(t => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0A1F44] via-[#152e5c] to-[#0A1F44] text-white border border-[#C9A227]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A227]/20 text-[#C9A227] text-xs font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            Fonds Documentaire Certifié • Publication 100% Gratuite
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t('library.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Publiez et consultez vos polycopiés et mémoires gratuitement via votre compte Google Drive personnel (15 Go inclus, sans aucun compte Google Cloud ni facturation requise).
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#C9A227] hover:bg-[#b8911e] text-[#0A1F44] font-black text-sm shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Publier un document</span>
        </button>
      </div>

      {/* Google Drive 100% Gratuit Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0A1F44] text-[#C9A227] flex items-center justify-center shrink-0 border border-[#C9A227]/40">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#0A1F44] dark:text-white">
                Publication via Google Drive Personnel
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Sans Google Cloud • 0€ Facturation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Utilisez votre propre Google Drive pour héberger vos fichiers et partagez-les en un clic. Aucun billing setup n'est nécessaire pour publier votre application.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openPersonalGoogleDrive}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A1F44] hover:bg-[#152e5c] text-[#C9A227] font-bold text-xs shadow-md transition cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Ouvrir mon Google Drive</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('library.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium focus:outline-hidden focus:border-[#C9A227]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">Toutes les matières</option>
              {specialtiesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                onlyFavorites
                  ? 'bg-[#C9A227]/20 border-[#C9A227] text-[#C9A227]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
              <span>Favoris</span>
            </button>
            <button
              onClick={() => setOnlyDriveHosted(!onlyDriveHosted)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                onlyDriveHosted
                  ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              <span>Google Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-[#C9A227] mx-auto opacity-75" />
          <h4 className="font-bold text-sm text-[#0A1F44] dark:text-white">
            Aucun document pour le moment
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Déposez vos polycopiés, mémoires ou liens Google Drive pour enrichir la bibliothèque de la promotion sans frais.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[#0A1F44] text-[#C9A227] text-xs font-bold hover:bg-[#152e5c] transition inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Déposer un document</span>
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => setPreviewDoc(doc)}
              className="p-5 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#C9A227]/60 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227] block">
                          {doc.subject}
                        </span>
                        {doc.isGoogleDriveHosted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-wider">
                            <HardDrive className="w-2.5 h-2.5" />
                            Google Drive
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-[#0A1F44] dark:text-white line-clamp-1">
                        {doc.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={e => handleToggleFav(doc.id, e)}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      doc.isFavorite
                        ? 'text-[#C9A227]'
                        : 'text-slate-300 dark:text-slate-700 hover:text-[#C9A227]'
                    }`}
                    title="Ajouter aux favoris"
                  >
                    <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                <span>{doc.author} • {doc.year}</span>
                <div className="flex items-center gap-2">
                  {doc.driveWebViewLink && (
                    <a
                      href={doc.driveWebViewLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="Ouvrir dans Google Drive"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </a>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setPreviewDoc(doc);
                    }}
                    className="flex items-center gap-1 font-semibold text-[#0A1F44] dark:text-[#C9A227] hover:underline cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Aperçu</span>
                  </button>
                  <button
                    onClick={e => handleDelete(doc, e)}
                    className="p-1 hover:text-red-500 transition cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Federated Financial Scientific Search Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#0A1F44] text-[#C9A227]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
              {t('library.externalSearchTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('library.externalSearchDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={scientificQuery}
            onChange={e => setScientificQuery(e.target.value)}
            className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-hidden focus:border-[#C9A227]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2">
          <button
            onClick={() => handleLaunchScientificSearch('ssrn')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#C9A227]/15 border border-slate-200 dark:border-slate-700 text-center transition group cursor-pointer"
          >
            <div className="font-black text-xs text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] flex items-center justify-center gap-1">
              <span>SSRN eLibrary</span>
              <ExternalLink className="w-3 h-3 text-[#C9A227]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Financial Economics</div>
          </button>
          <button
            onClick={() => handleLaunchScientificSearch('repec')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#C9A227]/15 border border-slate-200 dark:border-slate-700 text-center transition group cursor-pointer"
          >
            <div className="font-black text-xs text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] flex items-center justify-center gap-1">
              <span>RePEc / IDEAS</span>
              <ExternalLink className="w-3 h-3 text-[#C9A227]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Research in Economics</div>
          </button>
          <button
            onClick={() => handleLaunchScientificSearch('scholar')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#C9A227]/15 border border-slate-200 dark:border-slate-700 text-center transition group cursor-pointer"
          >
            <div className="font-black text-xs text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] flex items-center justify-center gap-1">
              <span>Google Scholar</span>
              <ExternalLink className="w-3 h-3 text-[#C9A227]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Finance Académique</div>
          </button>
          <button
            onClick={() => handleLaunchScientificSearch('arxiv')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#C9A227]/15 border border-slate-200 dark:border-slate-700 text-center transition group cursor-pointer"
          >
            <div className="font-black text-xs text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] flex items-center justify-center gap-1">
              <span>arXiv q-fin</span>
              <ExternalLink className="w-3 h-3 text-[#C9A227]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Quantitative Finance</div>
          </button>
          <button
            onClick={() => handleLaunchScientificSearch('jstor')}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#C9A227]/15 border border-slate-200 dark:border-slate-700 text-center transition group cursor-pointer"
          >
            <div className="font-black text-xs text-[#0A1F44] dark:text-white group-hover:text-[#C9A227] flex items-center justify-center gap-1">
              <span>JSTOR Finance</span>
              <ExternalLink className="w-3 h-3 text-[#C9A227]" />
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Journal of Finance</div>
          </button>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#C9A227]" />
                <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                  Publier un document
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Mode selection: Google Drive Link (100% Free) vs Local File */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('drive')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  uploadMode === 'drive'
                    ? 'bg-[#0A1F44] text-[#C9A227] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Google Drive (100% Gratuit)</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-[#0A1F44] text-[#C9A227] shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Fichier Local (IndexedDB)</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewDoc} className="space-y-4">
              {uploadMode === 'drive' ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Lien de partage Google Drive *
                    </label>
                    <button
                      type="button"
                      onClick={openPersonalGoogleDrive}
                      className="text-[11px] font-bold text-[#C9A227] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ouvrir Google Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      required
                      value={driveUrlInput}
                      onChange={e => {
                        setDriveUrlInput(e.target.value);
                        if (!uploadTitle && e.target.value) {
                          const parsed = parseGoogleDriveUrl(e.target.value);
                          if (parsed.isValid && parsed.type) {
                            setUploadTitle(`Document Google ${parsed.type}`);
                          }
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-[#C9A227]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Glissez votre fichier dans votre Google Drive personnel, cliquez sur <em>Partager • Copier le lien</em>, puis collez-le ici.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fichier local (PDF, DOCX, Synthèse)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#0A1F44] file:text-[#C9A227] hover:file:bg-[#152e5c] cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Titre du document *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#C9A227]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Auteur / Professeur
                  </label>
                  <input
                    type="text"
                    value={uploadAuthor}
                    onChange={e => setUploadAuthor(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matière / Filière
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={e => setUploadSubject(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                  >
                    {specialtiesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Promotion
                  </label>
                  <select
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                  >
                    {COHORT_YEARS.slice().reverse().map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mots-clés (séparés par virgules)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={e => setUploadTags(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description et Sommaire
                </label>
                <textarea
                  rows={3}
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold text-xs shadow-md cursor-pointer hover:bg-[#152e5c] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publier le document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Reader / Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-[#131E35] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A227]">
                    {previewDoc.subject}
                  </span>
                  {previewDoc.isGoogleDriveHosted && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold">
                      <HardDrive className="w-2.5 h-2.5" />
                      Google Drive
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-[#0A1F44] dark:text-white">
                  {previewDoc.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-line">
                {previewDoc.textSnippet}
              </div>

              {previewDoc.driveWebViewLink && (
                <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <iframe
                    src={parseGoogleDriveUrl(previewDoc.driveWebViewLink).previewUrl || previewDoc.driveWebViewLink}
                    title={previewDoc.title}
                    className="w-full h-full"
                    allow="autoplay"
                  />
                </div>
              )}

              {previewDoc.dataBase64 && previewDoc.fileType === 'application/pdf' && (
                <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <iframe
                    src={previewDoc.dataBase64}
                    title={previewDoc.title}
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span>Auteur : {previewDoc.author} ({previewDoc.year})</span>
              <div className="flex items-center gap-2">
                {previewDoc.driveWebViewLink && (
                  <a
                    href={previewDoc.driveWebViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Ouvrir dans Google Drive</span>
                  </a>
                )}
                {previewDoc.dataBase64 && (
                  <button
                    onClick={() => {
                      showToast({ type: 'success', title: 'Téléchargement lancé' });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A1F44] text-[#C9A227] font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
