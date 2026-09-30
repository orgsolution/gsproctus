/**
 * Service de gestion et de publication via Google Drive Personnel (100% Gratuit)
 * Aucune dépendance à Google Cloud Platform, aucun compte de facturation requis.
 */

export interface GoogleDriveParsedInfo {
  isValid: boolean;
  fileId?: string;
  type?: 'file' | 'document' | 'spreadsheet' | 'presentation' | 'folder' | 'unknown';
  previewUrl?: string;
  directUrl?: string;
  downloadUrl?: string;
}

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  createdAt: string;
}

const STORAGE_KEY_DRIVE_LINKS = 'proctus_user_drive_publications';

/**
 * Analyse et extrait l'identifiant et les URLs exploitables depuis n'importe quel lien Google Drive.
 * Fonctionne avec tous les types de fichiers partagés gratuitement depuis drive.google.com
 */
export function parseGoogleDriveUrl(url: string): GoogleDriveParsedInfo {
  if (!url || typeof url !== 'string') {
    return { isValid: false };
  }
  const cleanUrl = url.trim();

  // 1. Format classique : drive.google.com/file/d/{FILE_ID}/view
  const fileMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    const fileId = fileMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'file',
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directUrl: `https://drive.google.com/file/d/${fileId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // 2. Format query param : drive.google.com/open?id={FILE_ID} ou uc?id={FILE_ID}
  const idQueryMatch = cleanUrl.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (idQueryMatch && idQueryMatch[1]) {
    const fileId = idQueryMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'file',
      previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      directUrl: `https://drive.google.com/file/d/${fileId}/view`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
  }

  // 3. Format Google Docs : docs.google.com/document/d/{FILE_ID}/...
  const docsMatch = cleanUrl.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docsMatch && docsMatch[1]) {
    const fileId = docsMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'document',
      previewUrl: `https://docs.google.com/document/d/${fileId}/preview`,
      directUrl: `https://docs.google.com/document/d/${fileId}/edit`,
      downloadUrl: `https://docs.google.com/document/d/${fileId}/export?format=pdf`,
    };
  }

  // 4. Format Google Sheets : docs.google.com/spreadsheets/d/{FILE_ID}/...
  const sheetsMatch = cleanUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i);
  if (sheetsMatch && sheetsMatch[1]) {
    const fileId = sheetsMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'spreadsheet',
      previewUrl: `https://docs.google.com/spreadsheets/d/${fileId}/preview`,
      directUrl: `https://docs.google.com/spreadsheets/d/${fileId}/edit`,
      downloadUrl: `https://docs.google.com/spreadsheets/d/${fileId}/export?format=pdf`,
    };
  }

  // 5. Format Google Slides : docs.google.com/presentation/d/{FILE_ID}/...
  const slidesMatch = cleanUrl.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i);
  if (slidesMatch && slidesMatch[1]) {
    const fileId = slidesMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'presentation',
      previewUrl: `https://docs.google.com/presentation/d/${fileId}/preview`,
      directUrl: `https://docs.google.com/presentation/d/${fileId}/edit`,
      downloadUrl: `https://docs.google.com/presentation/d/${fileId}/export/pdf`,
    };
  }

  // 6. Format Dossier : drive.google.com/drive/folders/{FOLDER_ID}
  const folderMatch = cleanUrl.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/i);
  if (folderMatch && folderMatch[1]) {
    const fileId = folderMatch[1];
    return {
      isValid: true,
      fileId,
      type: 'folder',
      previewUrl: `https://drive.google.com/embeddedfolderview?id=${fileId}`,
      directUrl: `https://drive.google.com/drive/folders/${fileId}`,
    };
  }

  // URL Drive générique
  if (cleanUrl.includes('drive.google.com') || cleanUrl.includes('docs.google.com')) {
    return {
      isValid: true,
      directUrl: cleanUrl,
      type: 'unknown',
    };
  }

  return { isValid: false };
}

/**
 * Ouvre l'espace personnel Google Drive de l'utilisateur dans un nouvel onglet
 */
export function openPersonalGoogleDrive(): void {
  window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener,noreferrer');
}

/**
 * Ouvre la création d'un document ou l'envoi de fichier sur Google Drive
 */
export function openGoogleDriveUploadGuide(): void {
  window.open('https://support.google.com/drive/answer/2494822', '_blank', 'noopener,noreferrer');
}

/**
 * Récupère la liste des publications enregistrées via lien Google Drive
 */
export function getSavedDrivePublications(): DriveUploadResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRIVE_LINKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Sauvegarde une nouvelle publication Google Drive dans l'historique
 */
export function saveDrivePublication(item: DriveUploadResult): void {
  const current = getSavedDrivePublications();
  const updated = [item, ...current.filter(i => i.id !== item.id)];
  localStorage.setItem(STORAGE_KEY_DRIVE_LINKS, JSON.stringify(updated));
}

/**
 * Supprime une publication Google Drive de l'historique local
 */
export function removeDrivePublication(id: string): void {
  const current = getSavedDrivePublications();
  const updated = current.filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEY_DRIVE_LINKS, JSON.stringify(updated));
}
