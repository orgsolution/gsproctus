import { useState, useEffect } from 'react';
import {
  User,
  Post,
  DirectMessage,
  GameSession,
  DEFAULT_SPECIALTIES,
  DEFAULT_SCHOOL_CONFIG,
  SchoolConfig,
  ConfirmationEmail
} from '../types';

// Fast SHA-256 hash string for passwords in localStorage
export async function hashPassword(plain: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain + '_proctus_salt_2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return btoa(plain + '_proctus_fallback_salt');
  }
}

// Application is clean: virgin start
export const INITIAL_USERS: User[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_MESSAGES: DirectMessage[] = [];
export const INITIAL_GAMES: GameSession[] = [];
export const INITIAL_CONFIRMATION_EMAILS: ConfirmationEmail[] = [];

// Generic Custom Hook for typed LocalStorage persistence with multi-tab sync
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      // Dispatch custom storage event for same-tab updates
      window.dispatchEvent(new CustomEvent('proctus-localstorage-update', { detail: { key, value: valueToStore } }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key === key && e.newValue) {
        setStoredValue(JSON.parse(e.newValue));
      } else if ('detail' in e && e.detail.key === key) {
        setStoredValue(e.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('proctus-localstorage-update', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('proctus-localstorage-update', handleStorageChange as EventListener);
    };
  }, [key]);

  return [storedValue, setValue];
}

// Helper for managing customizable specialties / filières in localStorage
export function getSavedSpecialties(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SPECIALTIES;
  try {
    const raw = localStorage.getItem('proctus_specialties');
    if (!raw) {
      localStorage.setItem('proctus_specialties', JSON.stringify(DEFAULT_SPECIALTIES));
      return DEFAULT_SPECIALTIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem('proctus_specialties', JSON.stringify(DEFAULT_SPECIALTIES));
      return DEFAULT_SPECIALTIES;
    }
    // Ensure all required default specialties are present (especially Audit et Comptabilité, Douane, Trésor)
    let updated = [...parsed];
    let changed = false;
    for (const spec of DEFAULT_SPECIALTIES) {
      if (!updated.includes(spec)) {
        updated.push(spec);
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem('proctus_specialties', JSON.stringify(updated));
    }
    return updated;
  } catch {
    return DEFAULT_SPECIALTIES;
  }
}

export function saveSpecialties(specialties: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('proctus_specialties', JSON.stringify(specialties));
  window.dispatchEvent(new CustomEvent('proctus-specialties-update', { detail: specialties }));
}

// Helper for managing School Configuration (SuperAdmin only)
export function getSchoolConfig(): SchoolConfig {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_CONFIG;
  try {
    const raw = localStorage.getItem('proctus_school_config');
    if (!raw) {
      localStorage.setItem('proctus_school_config', JSON.stringify(DEFAULT_SCHOOL_CONFIG));
      return DEFAULT_SCHOOL_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SCHOOL_CONFIG, ...parsed };
  } catch {
    return DEFAULT_SCHOOL_CONFIG;
  }
}

export function saveSchoolConfig(config: SchoolConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('proctus_school_config', JSON.stringify(config));
  window.dispatchEvent(new CustomEvent('proctus-school-config-update', { detail: config }));
}

// Helper for sending and logging confirmation emails
export async function sendConfirmationEmail(params: {
  toEmail: string;
  recipientName: string;
  type: 'signup_confirmation' | 'password_reset';
  token?: string;
  extraInfo?: string;
}): Promise<ConfirmationEmail> {
  const token = params.token || Math.random().toString(36).substring(2, 8).toUpperCase();
  const subject =
    params.type === 'signup_confirmation'
      ? 'Bienvenue sur Proctus - Confirmation de votre inscription'
      : 'Proctus - Réinitialisation de votre mot de passe';

  const bodyText =
    params.type === 'signup_confirmation'
      ? `Bonjour ${params.recipientName},\n\nVotre inscription sur la plateforme d'élite Proctus (Promotion Finance) a bien été enregistrée.\n\nCode de confirmation : ${token}\n\nVous pouvez dès à présent accéder à votre espace membre, participer aux QCM Arena et consulter le fonds documentaire de la promotion.\n\nL'équipe administrative de Proctus.`
      : `Bonjour ${params.recipientName},\n\nNous avons reçu une demande de réinitialisation de mot de passe pour votre compte (${params.toEmail}).\n\nVotre code temporaire de sécurité est : ${token}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.`;

  const record: ConfirmationEmail = {
    id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    toEmail: params.toEmail,
    recipientName: params.recipientName,
    subject,
    sentAt: new Date().toISOString(),
    token,
    type: params.type,
    bodyText,
  };

  try {
    const existing = JSON.parse(localStorage.getItem('proctus_sent_emails') || '[]');
    existing.unshift(record);
    localStorage.setItem('proctus_sent_emails', JSON.stringify(existing.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('proctus-email-sent', { detail: record }));
  } catch (e) {
    console.warn('Error saving sent email record:', e);
  }

  // Also notify server endpoint if online
  try {
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {
      // offline fallback is seamless
    });
  } catch {
    // Ignore offline errors
  }

  return record;
}

export function getSentEmails(): ConfirmationEmail[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('proctus_sent_emails') || '[]');
  } catch {
    return [];
  }
}

// Complete storage wipe available ONLY to the SuperAdmin
export async function clearAllStorageForSuperAdmin(): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.clear();
  localStorage.setItem('proctus_users', JSON.stringify([]));
  localStorage.setItem('proctus_posts', JSON.stringify([]));
  localStorage.setItem('proctus_messages', JSON.stringify([]));
  localStorage.setItem('proctus_games', JSON.stringify([]));
  localStorage.setItem('proctus_specialties', JSON.stringify(DEFAULT_SPECIALTIES));
  localStorage.setItem('proctus_school_config', JSON.stringify(DEFAULT_SCHOOL_CONFIG));

  try {
    if (window.indexedDB) {
      window.indexedDB.deleteDatabase('proctus_documents_vault');
    }
  } catch (err) {
    console.warn('Error clearing IndexedDB:', err);
  }
}

// Clean up any legacy demo data
export function purgeLegacyDemoData() {
  if (typeof window === 'undefined') return;
  try {
    const rawUsers = localStorage.getItem('proctus_users');
    if (rawUsers) {
      const parsedUsers = JSON.parse(rawUsers);
      if (Array.isArray(parsedUsers)) {
        const filteredUsers = parsedUsers.filter((u: User) =>
          !u.email.includes('@proctus.app') &&
          !u.id.startsWith('user-demo') &&
          !u.id.startsWith('user-sophie') &&
          !u.id.startsWith('user-marc')
        );
        localStorage.setItem('proctus_users', JSON.stringify(filteredUsers));
      }
    }
    const curId = localStorage.getItem('proctus_current_user_id');
    if (curId && (curId.includes('demo') || curId.includes('sophie') || curId.includes('marc'))) {
      localStorage.removeItem('proctus_current_user_id');
    }
  } catch (err) {
    console.warn('Error purging legacy demo data:', err);
  }
}

// Initializer to ensure clean storage on first visit
export function initializeStorageIfEmpty() {
  if (typeof window === 'undefined') return;
  purgeLegacyDemoData();

  if (!localStorage.getItem('proctus_users')) {
    localStorage.setItem('proctus_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('proctus_posts')) {
    localStorage.setItem('proctus_posts', JSON.stringify([]));
  }
  if (!localStorage.getItem('proctus_messages')) {
    localStorage.setItem('proctus_messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('proctus_games')) {
    localStorage.setItem('proctus_games', JSON.stringify([]));
  }
  getSavedSpecialties(); // Will ensure Audit et Comptabilité, Douane, Trésor are saved
}
