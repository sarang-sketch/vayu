/** Firebase Authentication (Google Sign-In) with a safe demo fallback. */
import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { track } from '../lib/analytics';

interface AuthState {
  user: User | null;
  loading: boolean;
  demo: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
      track('sign_in', { method: 'google' });
    } catch {
      // Popup closed / blocked — keep anonymous session.
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    track('sign_out');
  }, []);

  return { user, loading, demo: !auth, signIn, signOut };
}
