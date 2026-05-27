import { useEffect, useState, type ReactNode, type FormEvent } from 'react';

const MAINTENANCE_PASSWORD = 'taskfiethereum';
const STORAGE_KEY = 'taskfi.maintenance-unlocked';

interface MaintenanceGateProps {
  children: ReactNode;
}

export function MaintenanceGate({ children }: MaintenanceGateProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1') {
        setUnlocked(true);
      }
    } catch {
      /* localStorage unavailable */
    }
    setHydrated(true);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim() === MAINTENANCE_PASSWORD) {
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!hydrated) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#493FEE] via-[#5d52f0] to-[#766CF0] text-white relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#A5A0F6]/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl p-8 md:p-10 text-[#1A1B25]">
          <div className="flex justify-center mb-6">
            <img src="/logo-taskfi.png" alt="TaskFi" className="h-16 w-16 rounded-2xl shadow-md" />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBEAFE] text-[#493FEE] text-xs font-bold uppercase tracking-wider mb-3">
              Under construction
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">TaskFi is in maintenance</h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              We're polishing the experience before launch. Come back soon — or enter the access password
              if you have one.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Access password"
              className={`w-full px-4 py-3 rounded-xl border bg-white text-sm outline-none transition-all focus:ring-2 focus:ring-[#493FEE]/30 ${
                error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-[#493FEE]'
              }`}
              autoComplete="off"
            />
            {error && (
              <p className="text-xs text-red-600 font-medium">Incorrect password. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#493FEE] to-[#766CF0] text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
            >
              Enter
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-gray-400">
            This page is a soft gate, not a security boundary.
          </p>
        </div>
      </div>
    </div>
  );
}
