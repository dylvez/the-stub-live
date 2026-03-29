import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/services/firebase/config';
import type { UserData } from '@/types';

interface AuthContextValue {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

/** Create a UserData document in Firestore for a new user */
async function ensureUserDoc(firebaseUser: User): Promise<UserData> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return snapshot.data() as UserData;
  }

  // Create new user doc from Google profile
  const now = Timestamp.now();
  const newUser: UserData = {
    id: firebaseUser.uid,
    displayName: firebaseUser.displayName ?? 'Music Fan',
    handle: firebaseUser.email?.split('@')[0] ?? `user${Date.now()}`,
    avatar: firebaseUser.photoURL ?? '',
    bio: '',
    location: { city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.436, radiusMiles: 50 },
    musicPreferences: { genres: [], moods: [], freeformDescription: '' },
    appleMusicConnected: false,
    stats: { totalShows: 0, totalVenues: 0, totalArtists: 0, memberSince: now },
    following: [],
    followers: [],
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(userRef, newUser);
  return newUser;
}

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  // Handle redirect result on page load
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    getRedirectResult(auth).catch(() => {
      // Redirect result is empty on normal page loads — ignore
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const data = await ensureUserDoc(firebaseUser);
          setUserData(data);
        } catch (err) {
          console.warn('Failed to load/create user doc:', err);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle(): Promise<void> {
    if (!isFirebaseConfigured) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // If popup blocked (common on mobile/strict browsers), fall back to redirect
      if ((err as { code?: string }).code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        throw err;
      }
    }
  }

  async function signOut(): Promise<void> {
    if (!isFirebaseConfigured) return;
    await firebaseSignOut(auth);
    setUserData(null);
  }

  function refreshUserData(): void {
    if (!user) return;
    ensureUserDoc(user).then(setUserData).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signInWithGoogle, signOut, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
