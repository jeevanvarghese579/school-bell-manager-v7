import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Bell, CloudOff } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: Props) {
  const { signIn, signUp, resetPassword, continueOffline, cloudConfigured } = useAuth();
  const { push } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        push('Signed in', 'success');
        onClose();
      } else if (mode === 'signup') {
        await signUp(email, password);
        push('Account created. You are signed in.', 'success');
        onClose();
      } else {
        await resetPassword(email);
        push('Password reset email sent', 'success');
        setMode('signin');
      }
    } catch (e: any) {
      const messages: Record<string, string> = { 'auth/email-already-in-use': 'That email is already in use.', 'auth/invalid-email': 'Enter a valid email address.', 'auth/weak-password': 'Password must be at least 6 characters.', 'auth/invalid-credential': 'Email or password is incorrect.', 'auth/network-request-failed': 'Network unavailable. Please try again.' };
      push(messages[e?.code] ?? 'Authentication failed. Check Firebase configuration and try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="School Bell Manager" maxWidth="max-w-sm">
      <div className="flex flex-col items-center mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--c-primary)] flex items-center justify-center mb-2">
          <Bell size={22} className="text-white" />
        </div>
        <p className="text-sm text-[var(--c-textSecondary)] text-center">
          {mode === 'signin' && 'Sign in to sync your bell schedules across devices.'}
          {mode === 'signup' && 'Create an account to sync your bell schedules.'}
          {mode === 'reset' && 'Enter your email to receive a reset link.'}
        </p>
      </div>

      {!cloudConfigured && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] text-xs text-[var(--c-textSecondary)] text-center">
          Cloud sync is not configured for this build. Offline mode is fully available.
        </div>
      )}

      <div className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
        />
        {mode !== 'reset' && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]"
          />
        )}
        {mode === 'signup' && <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[var(--c-surfaceSecondary)] border border-[var(--c-border)] text-sm text-[var(--c-textPrimary)] focus:outline-none focus:border-[var(--c-primary)]" />}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <Button variant="primary" onClick={submit} disabled={busy || !/^\S+@\S+\.\S+$/.test(email) || (mode !== 'reset' && (!password || (mode === 'signup' && (password.length < 6 || password !== confirmPassword))))}>
          {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
        </Button>

        <div className="flex justify-between text-xs text-[var(--c-textSecondary)]">
          {mode === 'signin' && (
            <>
              <button onClick={() => setMode('signup')} className="hover:text-[var(--c-primary)]">Create Account</button>
              <button onClick={() => setMode('reset')} className="hover:text-[var(--c-primary)]">Forgot Password?</button>
            </>
          )}
          {mode === 'signup' && <button onClick={() => setMode('signin')} className="hover:text-[var(--c-primary)]">Back to Sign In</button>}
          {mode === 'reset' && <button onClick={() => setMode('signin')} className="hover:text-[var(--c-primary)]">Back to Sign In</button>}
        </div>
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--c-border)]" />
        <span className="text-xs text-[var(--c-textSecondary)]">or</span>
        <div className="flex-1 h-px bg-[var(--c-border)]" />
      </div>

      <Button
        variant="secondary"
        onClick={() => {
          continueOffline();
          onClose();
        }}
        className="w-full"
      >
        <CloudOff size={16} /> Continue Offline
      </Button>
    </Modal>
  );
}
