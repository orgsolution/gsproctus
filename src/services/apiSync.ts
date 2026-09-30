import { User, SchoolConfig, Post, DirectMessage, GameSession } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';

export interface ServerSyncData {
  users: User[];
  schoolConfig?: SchoolConfig;
  specialties?: string[];
}

// Fetch all online database records (combines Firestore and Express backend)
export async function fetchOnlineData(): Promise<ServerSyncData | null> {
  try {
    // 1. First try Firestore collection 'users'
    const usersCol = collection(db, 'users');
    const userSnaps = await getDocs(usersCol);
    const firestoreUsers: User[] = [];
    userSnaps.forEach((d) => {
      firestoreUsers.push(d.data() as User);
    });

    // 2. Fetch config & specialties from Firestore
    let schoolConfig: SchoolConfig | undefined = undefined;
    try {
      const cfgSnap = await getDoc(doc(db, 'config', 'school'));
      if (cfgSnap.exists()) {
        schoolConfig = cfgSnap.data() as SchoolConfig;
      }
    } catch {
      // fallback
    }

    let specialties: string[] | undefined = undefined;
    try {
      const specSnap = await getDoc(doc(db, 'specialties', 'list'));
      if (specSnap.exists() && Array.isArray(specSnap.data().items)) {
        specialties = specSnap.data().items;
      }
    } catch {
      // fallback
    }

    // Also sync with server endpoint for redundancy
    let serverUsers: User[] = [];
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          serverUsers = data.users;
        }
        if (!schoolConfig && data.schoolConfig) schoolConfig = data.schoolConfig;
        if (!specialties && data.specialties) specialties = data.specialties;
      }
    } catch {
      // Ignore
    }

    // Merge users
    const map = new Map<string, User>();
    serverUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));
    firestoreUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));

    return {
      users: Array.from(map.values()),
      schoolConfig,
      specialties,
    };
  } catch (err) {
    console.warn('[Online Firestore Sync] Offline or server unreachable:', err);
    // Fallback to Express server
    try {
      const res = await fetch('/api/sync');
      if (res.ok) return await res.json();
    } catch {
      // Ignore
    }
    return null;
  }
}

// Sync a batch of users to online database and Firestore
export async function syncBatchUsersOnline(users: User[]): Promise<boolean> {
  if (!users || users.length === 0) return true;
  try {
    for (const u of users) {
      if (u && u.id) {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
      }
    }
    fetch('/api/sync/batch-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Online Sync] Failed to batch sync users online:', err);
    return false;
  }
}

// Fetch a single user by email
export async function fetchUserOnline(email: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const col = collection(db, 'users');
    const snaps = await getDocs(col);
    for (const d of snaps.docs) {
      const u = d.data() as User;
      if (u.email && u.email.toLowerCase().trim() === cleanEmail) {
        return u;
      }
    }
  } catch (e) {
    console.warn('[Firestore] Error fetching user:', e);
  }

  try {
    const res = await fetch(`/api/sync/user/${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const json = await res.json();
      return json.user || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

// Sync a user account online in Firestore & server so they can log in from any device
export async function syncUserOnline(user: User): Promise<boolean> {
  try {
    if (user.id) {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    }
    fetch('/api/sync/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync user online:', err);
    return false;
  }
}

// Verify login with online database
export async function verifyOnlineLogin(email: string, passwordHash: string): Promise<User | null> {
  const cleanEmail = email.toLowerCase().trim();
  try {
    const col = collection(db, 'users');
    const snaps = await getDocs(col);
    for (const d of snaps.docs) {
      const u = d.data() as User;
      if (
        u.email &&
        u.email.toLowerCase().trim() === cleanEmail &&
        (!passwordHash || u.passwordHash === passwordHash)
      ) {
        return u;
      }
    }
  } catch {
    // Ignore
  }

  try {
    const res = await fetch('/api/sync/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, passwordHash }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.user || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

// Sync school configuration online in Firestore
export async function syncSchoolConfigOnline(config: SchoolConfig): Promise<boolean> {
  try {
    await setDoc(doc(db, 'config', 'school'), config, { merge: true });
    fetch('/api/sync/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync school config online:', err);
    return false;
  }
}

// Sync specialties online in Firestore
export async function syncSpecialtiesOnline(specialties: string[]): Promise<boolean> {
  try {
    await setDoc(doc(db, 'specialties', 'list'), { items: specialties }, { merge: true });
    fetch('/api/sync/specialties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ specialties }),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[Online Sync] Failed to sync specialties online:', err);
    return false;
  }
}

// Sync Post to Firestore
export async function syncPostToFirestore(post: Post): Promise<void> {
  try {
    await setDoc(doc(db, 'posts', post.id), post, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Error saving post:', err);
  }
}

// Real-time listener for posts
export function subscribeToPostsOnline(
  onUpdate: (posts: Post[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const q = query(collection(db, 'posts'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const posts: Post[] = [];
        snapshot.forEach((d) => {
          posts.push(d.data() as Post);
        });
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(posts);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] subscribeToPosts error:', err);
    return () => {};
  }
}

// Sync Direct Message to Firestore
export async function syncMessageToFirestore(message: DirectMessage): Promise<void> {
  try {
    await setDoc(doc(db, 'messages', message.id), message, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Error saving message:', err);
  }
}

// Real-time listener for user messages
export function subscribeToMessagesOnline(
  userId: string,
  onUpdate: (messages: DirectMessage[]) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const q = query(collection(db, 'messages'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: DirectMessage[] = [];
        snapshot.forEach((d) => {
          const m = d.data() as DirectMessage;
          if (m.senderId === userId || m.receiverId === userId) {
            msgs.push(m);
          }
        });
        msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        onUpdate(msgs);
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, 'messages');
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] subscribeToMessages error:', err);
    return () => {};
  }
}

// Sync Game to Firestore
export async function syncGameToFirestore(game: GameSession): Promise<void> {
  try {
    await setDoc(doc(db, 'games', game.code), game, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Error saving game:', err);
  }
}

// Real-time listener for Game session by PIN code
export function subscribeToGameOnline(
  gameCode: string,
  onUpdate: (game: GameSession) => void,
  onError?: (err: unknown) => void
): () => void {
  try {
    const docRef = doc(db, 'games', gameCode);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as GameSession);
        }
      },
      (error) => {
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.GET, `games/${gameCode}`);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('[Firestore] subscribeToGame error:', err);
    return () => {};
  }
}
