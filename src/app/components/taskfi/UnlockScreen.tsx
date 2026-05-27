import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useWallet } from '../../../lib/wallet-context';
import { showError } from '../../../lib/toast';

export function UnlockScreen() {
  const { address, unlock, deleteWallet } = useWallet();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const isTimeLocked = remainingSeconds > 0;

  // Visual countdown for lockout
  useEffect(() => {
    if (lockedUntil <= Date.now()) {
      setRemainingSeconds(0);
      return;
    }
    setRemainingSeconds(Math.ceil((lockedUntil - Date.now()) / 1000));
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setRemainingSeconds(0);
        clearInterval(interval);
      } else {
        setRemainingSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  async function handleUnlock() {
    if (!password) return;
    if (isTimeLocked) {
      showError(`Too many attempts. Try again in ${remainingSeconds}s`);
      return;
    }
    setLoading(true);
    try {
      await unlock(password);
      setFailedAttempts(0);
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 3) {
        const delay = Math.min(30_000, 2000 * Math.pow(2, newAttempts - 3));
        setLockedUntil(Date.now() + delay);
        showError(`Wrong password. Locked for ${Math.ceil(delay / 1000)}s`);
      } else {
        showError('Wrong password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5FF] p-4">
      <div className="w-full max-w-sm">
        {/* Icon + Title */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#493FEE] shadow-xl shadow-[#493FEE]/25">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1B25]">Welcome Back</h1>
          {truncated && (
            <p className="text-sm text-gray-500 mt-1 font-mono">{truncated}</p>
          )}
        </div>

        {/* Unlock Form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(73,63,238,0.14)]">
          <form
            onSubmit={e => { e.preventDefault(); handleUnlock(); }}
            className="space-y-4"
          >
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 pr-10 outline-none transition-all focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {failedAttempts >= 3 && (
              <p className="text-xs text-amber-600 text-center">
                {failedAttempts} failed attempts. {isTimeLocked ? `Wait ${remainingSeconds}s...` : 'Enter carefully.'}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || isTimeLocked}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#493FEE] py-3 font-semibold text-white shadow-lg shadow-[#493FEE]/20 transition-all duration-200 hover:bg-[#3a32be] hover:shadow-xl hover:shadow-[#493FEE]/30 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Unlocking...' : <>Unlock <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          {/* Import different wallet */}
          <div className="mt-4 border-t border-gray-100 pt-4 text-center">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                Forgot password? Import a different wallet
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-500 font-medium">This will erase the current wallet from this browser. Make sure you have your seed phrase saved.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteWallet}
                    className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
                  >
                    Erase & Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
