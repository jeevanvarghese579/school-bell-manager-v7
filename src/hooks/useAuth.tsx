import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react';
import type { DataProvider } from '@/services/DataProvider';
import { offlineProvider } from '@/services/OfflineProvider';
import { cloudProvider } from '@/services/CloudProvider';
import { firebaseAuth, isFirebaseConfigured } from '@/firebase/firebase';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { idb } from '@/storage/indexeddb';
import { DEFAULT_SETTINGS } from '@/models/types';

export type AuthMode = 'offline' | 'cloud';
export type AuthState =
  | { status: 'loading' }
  | { status: 'offline' }
  | { status: 'cloud'; userId: string; email: string | null };

interface AuthContextValue {
  state: AuthState;
  mode: AuthMode;
  provider: DataProvider;
  cloudConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueOffline: () => void;
  switchToCloud: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const cloudConfigured = isFirebaseConfigured();

  useEffect(() => {
    if (!firebaseAuth) {
      setState({ status: 'offline' });
      return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) setState({ status: 'cloud', userId: user.uid, email: user.email });
      else setState({ status: 'offline' });
    });
    return unsubscribe;
  }, []);

  const provider: DataProvider = state.status === 'cloud' ? cloudProvider : offlineProvider;

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.');
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!firebaseAuth) throw new Error('Firebase is not configured.');
    await sendPasswordResetEmail(firebaseAuth, email);
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseAuth) await firebaseSignOut(firebaseAuth);
    setState({ status: 'offline' });
  }, []);

  const continueOffline = useCallback(() => {
    setState({ status: 'offline' });
  }, []);

  const switchToCloud = useCallback(() => {
    if (firebaseAuth?.currentUser) setState({ status: 'cloud', userId: firebaseAuth.currentUser.uid, email: firebaseAuth.currentUser.email });
    else setState({ status: 'offline' });
  }, []);

  const mode: AuthMode = state.status === 'cloud' ? 'cloud' : 'offline';

  return (
    <AuthContext.Provider
      value={{ state, mode, provider, cloudConfigured, signIn, resetPassword, signOut, continueOffline, switchToCloud }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { DEFAULT_SETTINGS, idb };
