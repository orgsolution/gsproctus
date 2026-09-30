import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserSpecialty, ConfirmationEmail, isSuperAdminEmail } from '../types';
import { useLocalStorage, hashPassword, INITIAL_USERS, sendConfirmationEmail } from '../services/storage';
import { fetchOnlineData, syncUserOnline, verifyOnlineLogin, fetchUserOnline, syncBatchUsersOnline } from '../services/apiSync';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isSuperAdmin: boolean;
  login: (email: string, passwordPlain: string) => Promise<boolean>;
  signup: (data: {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName: string;
    cohort: string;
    specialty: UserSpecialty;
    bio?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; error?: string; confirmationEmail?: ConfirmationEmail }>;
  loginWithGoogle: (data?: {
    email?: string;
    name?: string;
    picture?: string;
    cohort?: string;
    specialty?: string;
  }) => Promise<{ success: boolean; isNewUser?: boolean; confirmationEmail?: ConfirmationEmail; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; resetToken?: string; confirmationEmail?: ConfirmationEmail }>;
  resetPasswordWithToken: (email: string, token: string, newPasswordPlain: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  getUserById: (id: string) => User | undefined;
  lastConfirmationEmail: ConfirmationEmail | null;
  setLastConfirmationEmail: (email: ConfirmationEmail | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<User[]>('proctus_users', INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useLocalStorage<string | null>('proctus_current_user_id', null);
  const [lastConfirmationEmail, setLastConfirmationEmail] = useState<ConfirmationEmail | null>(null);

  const currentUser = users.find(u => u.id === currentUserId) || null;

  // RBAC: SuperAdmin check for acceuil.org@gmail.com and accueil.org@gmail.com
  const isSuperAdmin = Boolean(
    currentUser && isSuperAdminEmail(currentUser.email)
  );

  // Cross-device online synchronization on mount and periodically (Tablette, Téléphone, Ordinateur)
  useEffect(() => {
    const doSync = async () => {
      try {
        // 1. Send all local users from this device to the server so any account created offline or earlier is uploaded
        const rawLocal = localStorage.getItem('proctus_users');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            await syncBatchUsersOnline(parsed);
          }
        }

        // 2. Fetch the latest global state from the server
        const online = await fetchOnlineData();
        if (online && Array.isArray(online.users) && online.users.length > 0) {
          setUsers(prev => {
            const map = new Map<string, User>();
            prev.forEach(u => map.set(u.email.toLowerCase().trim(), u));
            online.users.forEach(u => {
              const key = u.email.toLowerCase().trim();
              const existing = map.get(key);
              if (!existing) {
                map.set(key, u);
              } else {
                map.set(key, { ...existing, ...u });
              }
            });
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Sync failed:', e);
      }
    };

    doSync();
    const interval = setInterval(doSync, 6000);
    window.addEventListener('focus', doSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', doSync);
    };
  }, [setUsers]);

  // Auto-enforce roles based on isSuperAdminEmail
  useEffect(() => {
    if (!currentUser) return;
    const isSuper = isSuperAdminEmail(currentUser.email);
    const targetRole: 'SuperAdmin' | 'SimpleUser' = isSuper ? 'SuperAdmin' : 'SimpleUser';
    if (currentUser.role !== targetRole) {
      const updated = users.map(u => u.id === currentUser.id ? { ...u, role: targetRole } : u);
      setUsers(updated);
    }
  }, [currentUser, users, setUsers]);

  const login = async (email: string, passwordPlain: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();
    const hashed = await hashPassword(passwordPlain);
    const isSuper = isSuperAdminEmail(cleanEmail);

    let found = users.find(
      u => u.email.toLowerCase().trim() === cleanEmail && (u.passwordHash === hashed || isSuper)
    );

    // If account not found locally (e.g. created on tablet, connecting from phone), check online DB!
    if (!found) {
      const onlineUser = await verifyOnlineLogin(cleanEmail, hashed);
      if (onlineUser) {
        found = onlineUser;
        setUsers(prev => {
          const filtered = prev.filter(u => u.email.toLowerCase().trim() !== cleanEmail);
          return [...filtered, onlineUser];
        });
      }
    }

    // Direct check by email on the online server if user exists online (e.g. created via Google on tablet)
    if (!found) {
      const onlineUser = await fetchUserOnline(cleanEmail);
      if (onlineUser) {
        if (isSuper || onlineUser.authProvider === 'google' || !onlineUser.passwordHash || onlineUser.passwordHash === hashed) {
          const updatedWithPass: User = {
            ...onlineUser,
            passwordHash: hashed || onlineUser.passwordHash,
            role: isSuper ? 'SuperAdmin' : onlineUser.role,
          };
          found = updatedWithPass;
          setUsers(prev => [...prev.filter(u => u.email.toLowerCase().trim() !== cleanEmail), updatedWithPass]);
          await syncUserOnline(updatedWithPass);
        }
      }
    }

    // Direct SuperAdmin auto-provision fallback if connecting with SuperAdmin email
    if (!found && isSuper) {
      const superUser: User = {
        id: `user-super-${Date.now()}`,
        email: cleanEmail,
        passwordHash: hashed,
        firstName: 'Admin',
        lastName: 'Proctus',
        cohort: '2025',
        specialty: 'Audit et Comptabilité',
        role: 'SuperAdmin',
        bio: 'SuperAdministrateur Officiel de la Promotion',
        avatar: `https://unavatar.io/google/${encodeURIComponent(cleanEmail)}`,
        badges: ['SuperAdmin', 'Direction', 'Certifié'],
        totalScore: 500,
        gamesPlayed: 10,
        emailConfirmed: true,
        authProvider: 'credentials',
        createdAt: new Date().toISOString(),
      };
      found = superUser;
      setUsers(prev => [...prev.filter(u => u.email.toLowerCase().trim() !== cleanEmail), superUser]);
      await syncUserOnline(superUser);
    }

    if (found) {
      if (isSuperAdminEmail(cleanEmail) && found.role !== 'SuperAdmin') {
        const updated = users.map(u => u.id === found.id ? { ...u, role: 'SuperAdmin' as const } : u);
        setUsers(updated);
        await syncUserOnline({ ...found, role: 'SuperAdmin' });
      }
      setCurrentUserId(found.id);
      return true;
    }
    return false;
  };

  const signup = async (data: {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName: string;
    cohort: string;
    specialty: UserSpecialty;
    bio?: string;
    avatar?: string;
  }) => {
    const cleanEmail = data.email.toLowerCase().trim();
    const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Cet email est déjà enregistré.' };
    }

    const passwordHash = await hashPassword(data.passwordPlain);

    // Determine avatar
    let defaultAvatar = data.avatar;
    if (!defaultAvatar) {
      if (cleanEmail.endsWith('@gmail.com') || cleanEmail.includes('google')) {
        defaultAvatar = `https://unavatar.io/google/${encodeURIComponent(cleanEmail)}`;
      } else {
        defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.firstName + ' ' + data.lastName)}&backgroundColor=0A1F44&textColor=C9A227`;
      }
    }

    const role: 'SuperAdmin' | 'SimpleUser' = isSuperAdminEmail(cleanEmail) ? 'SuperAdmin' : 'SimpleUser';

    const newUser: User = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      passwordHash,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      cohort: data.cohort,
      specialty: data.specialty,
      role,
      bio: data.bio || '',
      avatar: defaultAvatar,
      badges: role === 'SuperAdmin' ? ['SuperAdmin', 'Élève - Stagiaire'] : ['Élève - Stagiaire', 'Promotion ' + data.cohort],
      totalScore: 0,
      gamesPlayed: 0,
      emailConfirmed: true,
      authProvider: 'credentials',
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    setCurrentUserId(newUser.id);
    await syncUserOnline(newUser);

    // Envoi de l'e-mail de confirmation après inscription
    const sentMail = await sendConfirmationEmail({
      toEmail: cleanEmail,
      recipientName: `${newUser.firstName} ${newUser.lastName}`,
      type: 'signup_confirmation',
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, confirmationEmail: sentMail };
  };

  const loginWithGoogle = async (googleData?: {
    email?: string;
    name?: string;
    picture?: string;
    cohort?: string;
    specialty?: string;
  }) => {
    const emailToUse = (googleData?.email || 'acceuil.org@gmail.com').toLowerCase().trim();
    const fullName = googleData?.name || (isSuperAdminEmail(emailToUse) ? 'Admin Proctus' : 'Étudiant Finance Google');
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Étudiant';
    const lastName = parts.slice(1).join(' ') || 'Finance';
    const avatar = googleData?.picture || `https://unavatar.io/google/${encodeURIComponent(emailToUse)}`;

    // 1. Check local storage first
    let existingUser = users.find(u => u.email.toLowerCase().trim() === emailToUse);

    // 2. If not found locally, query the online server directly
    if (!existingUser) {
      const onlineUser = await fetchUserOnline(emailToUse);
      if (onlineUser) {
        existingUser = onlineUser;
        setUsers(prev => [...prev.filter(u => u.email.toLowerCase().trim() !== emailToUse), onlineUser]);
      }
    }

    if (existingUser) {
      if (isSuperAdminEmail(emailToUse) && existingUser.role !== 'SuperAdmin') {
        const superUp: User = { ...existingUser, role: 'SuperAdmin' };
        existingUser = superUp;
        setUsers(prev => prev.map(u => u.id === superUp.id ? superUp : u));
        await syncUserOnline(superUp);
      }
      setCurrentUserId(existingUser.id);
      return { success: true, isNewUser: false };
    }

    // New registration via Google
    const dummyPasswordHash = await hashPassword(`google_oauth_${Date.now()}_secure`);
    const role: 'SuperAdmin' | 'SimpleUser' = isSuperAdminEmail(emailToUse) ? 'SuperAdmin' : 'SimpleUser';
    const cohort = googleData?.cohort || '2025';
    const specialty = googleData?.specialty || 'Audit et Comptabilité';

    const newUser: User = {
      id: `user-g-${Date.now()}`,
      email: emailToUse,
      passwordHash: dummyPasswordHash,
      firstName,
      lastName,
      cohort,
      specialty,
      role,
      bio: role === 'SuperAdmin' ? 'SuperAdministrateur Officiel de la Promotion' : 'Membre connecté via Google Workspace',
      avatar,
      badges: role === 'SuperAdmin' ? ['SuperAdmin', 'Google Auth', 'Élève - Stagiaire'] : ['Google Auth', 'Élève - Stagiaire'],
      totalScore: 0,
      gamesPlayed: 0,
      emailConfirmed: true,
      authProvider: 'google',
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, newUser];
    setUsers(updated);
    setCurrentUserId(newUser.id);
    await syncUserOnline(newUser);

    const sentMail = await sendConfirmationEmail({
      toEmail: emailToUse,
      recipientName: `${newUser.firstName} ${newUser.lastName}`,
      type: 'signup_confirmation',
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, isNewUser: true, confirmationEmail: sentMail };
  };

  const requestPasswordReset = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: 'Aucun compte associé à cette adresse e-mail.' };
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const pendingKey = `proctus_reset_${cleanEmail}`;
    sessionStorage.setItem(pendingKey, JSON.stringify({ token: resetToken, expires: Date.now() + 15 * 60 * 1000 }));

    const sentMail = await sendConfirmationEmail({
      toEmail: cleanEmail,
      recipientName: `${found.firstName} ${found.lastName}`,
      type: 'password_reset',
      token: resetToken,
    });
    setLastConfirmationEmail(sentMail);

    return { success: true, resetToken, confirmationEmail: sentMail };
  };

  const resetPasswordWithToken = async (email: string, token: string, newPasswordPlain: string) => {
    const cleanEmail = email.toLowerCase().trim();
    const pendingKey = `proctus_reset_${cleanEmail}`;
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) {
      return { success: false, error: 'Aucune demande de réinitialisation en cours pour cet email.' };
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.token !== token.trim()) {
        return { success: false, error: 'Code de réinitialisation invalide.' };
      }
      if (Date.now() > parsed.expires) {
        return { success: false, error: 'Ce code a expiré. Veuillez refaire une demande.' };
      }
      const newHash = await hashPassword(newPasswordPlain);
      const updated = users.map(u => (u.email.toLowerCase() === cleanEmail ? { ...u, passwordHash: newHash } : u));
      setUsers(updated);
      sessionStorage.removeItem(pendingKey);
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur lors de la réinitialisation du mot de passe.' };
    }
  };

  const logout = () => {
    setCurrentUserId(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updates };
    const updated = users.map(u => (u.id === currentUser.id ? updatedUser : u));
    setUsers(updated);
    syncUserOnline(updatedUser);
  };

  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isSuperAdmin,
        login,
        signup,
        loginWithGoogle,
        requestPasswordReset,
        resetPasswordWithToken,
        logout,
        updateProfile,
        getUserById,
        lastConfirmationEmail,
        setLastConfirmationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
