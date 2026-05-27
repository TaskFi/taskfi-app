import { User, Wallet, Shield, Bell, Globe, Save, Check, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { useWallet } from '../../lib/wallet-context';
import { api } from '../../lib/api';
import { showSuccess } from '../../lib/toast';
import { getTokenBalances, formatUsdc as formatUsdcBalance, formatTask } from '../../lib/balances';
import { getPublicClient } from '../../lib/chain';
import { useRuntimeConfig } from '../contexts/ConfigContext';

interface LocalProfile {
  displayName: string;
  email: string;
  bio: string;
}

const PROFILE_KEY_PREFIX = 'taskfi.profile.';
const NOTIF_KEY_PREFIX = 'taskfi.notifications.';

const DEFAULT_NOTIFS = {
  missionUpdates: true,
  juryVerdict: true,
  stakingRewards: true,
  newMissions: false,
  weeklyDigest: false,
};

function formatPendingUsdc(raw: string | null): string {
  if (!raw) return '—';
  try {
    return formatUsdcBalance(BigInt(raw));
  } catch {
    return '—';
  }
}

export function Account() {
  const { address, lock } = useWallet();
  const { config } = useRuntimeConfig();
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not connected';

  const profileKey = address ? `${PROFILE_KEY_PREFIX}${address.toLowerCase()}` : null;
  const notifKey = address ? `${NOTIF_KEY_PREFIX}${address.toLowerCase()}` : null;

  const [profile, setProfile] = useState<LocalProfile>({ displayName: '', email: '', bio: '' });
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFS);
  const [pendingEarnings, setPendingEarnings] = useState<string | null>(null);
  const [onChainBalances, setOnChainBalances] = useState<{ usdc: bigint | null; task: bigint | null }>({
    usdc: null,
    task: null,
  });
  const chainReadsEnabled = getPublicClient() !== null;
  const [saved, setSaved] = useState(false);

  // Load locally-stored profile + notifications per wallet
  useEffect(() => {
    if (!profileKey || !notifKey) return;
    try {
      const p = localStorage.getItem(profileKey);
      if (p) setProfile(JSON.parse(p));
      else setProfile({ displayName: '', email: '', bio: '' });
      const n = localStorage.getItem(notifKey);
      if (n) setNotifications({ ...DEFAULT_NOTIFS, ...JSON.parse(n) });
      else setNotifications(DEFAULT_NOTIFS);
    } catch {
      // localStorage unavailable or parse error — fall through to defaults
    }
  }, [profileKey, notifKey]);

  // Persist notifications immediately on toggle
  useEffect(() => {
    if (!notifKey) return;
    try {
      localStorage.setItem(notifKey, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications, notifKey]);

  // Load pending USDC earnings from the backend (best-effort)
  useEffect(() => {
    if (!address) {
      setPendingEarnings(null);
      return;
    }
    let cancelled = false;
    api.agents
      .pendingEarnings()
      .then((res) => {
        if (!cancelled) setPendingEarnings(res.pendingEarnings);
      })
      .catch(() => {
        if (!cancelled) setPendingEarnings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  // Load on-chain $TASK + USDC balances. The token addresses come from the
  // backend (/api/public/config), so contract redeploys don't require a
  // front rebuild.
  useEffect(() => {
    if (!address || !chainReadsEnabled || !config) {
      setOnChainBalances({ usdc: null, task: null });
      return;
    }
    let cancelled = false;
    getTokenBalances(address as Address, config.taskTokenAddress, config.usdcAddress)
      .then((b) => {
        if (!cancelled) setOnChainBalances(b);
      })
      .catch(() => {
        if (!cancelled) setOnChainBalances({ usdc: null, task: null });
      });
    return () => {
      cancelled = true;
    };
  }, [address, chainReadsEnabled, config]);

  function saveProfile() {
    if (!profileKey) return;
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile));
      setSaved(true);
      showSuccess('Profile saved locally');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">My Account</h2>
            <p className="text-sm text-gray-600">Manage your profile and preferences</p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600" />
          Profile Information
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          <p className="text-xs text-gray-500 mb-4">
            Stored locally in this browser, tied to the connected wallet address.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Display Name</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Your display name"
                disabled={!address}
                className="w-full px-4 py-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="you@example.com"
                disabled={!address}
                className="w-full px-4 py-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
              <textarea
                rows={4}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell people about your work…"
                disabled={!address}
                className="w-full px-4 py-2.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={!address}
            className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Wallet Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-indigo-600" />
          Wallet & Blockchain
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          {/* Connected Wallet */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Connected Wallet</label>
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1B25] font-mono">{shortAddress}</p>
                  <p className="text-xs text-gray-600">Base Network</p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full bg-green-600 text-white text-xs font-bold">
                {address ? 'Connected' : 'Locked'}
              </span>
            </div>
          </div>

          {/* Balances + pending earnings */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Token Balances</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <p className="text-xs text-gray-600 mb-1">USDC</p>
                <p className="text-2xl font-bold text-green-700">{formatUsdcBalance(onChainBalances.usdc)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {chainReadsEnabled ? 'On-chain balance' : 'RPC not configured'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
                <p className="text-xs text-gray-600 mb-1">$TASK</p>
                <p className="text-2xl font-bold text-indigo-700">{formatTask(onChainBalances.task)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {chainReadsEnabled ? 'On-chain balance' : 'RPC not configured'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                <p className="text-xs text-gray-600 mb-1">Pending USDC</p>
                <p className="text-2xl font-bold text-amber-700">{formatPendingUsdc(pendingEarnings)}</p>
                <p className="text-xs text-gray-500 mt-1">In escrow, claim from Staking &amp; Rewards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600" />
          Notification Preferences
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          <p className="text-xs text-gray-500 mb-3">
            Toggles are stored locally; in-app notifications honor them right away.
          </p>
          <div className="space-y-4">
            {[
              { key: 'missionUpdates', title: 'Mission Updates', desc: 'Get notified when your missions have updates' },
              { key: 'juryVerdict', title: 'Jury Verdict', desc: 'Alerts when consensus jury reaches a verdict' },
              { key: 'stakingRewards', title: 'Staking Rewards', desc: 'Notifications for rewards and claim eligibility' },
              { key: 'newMissions', title: 'New Missions', desc: 'Get alerted about new marketplace missions' },
              { key: 'weeklyDigest', title: 'Weekly Digest', desc: 'Weekly summary of activity and earnings' },
            ].map((item) => {
              const k = item.key as keyof typeof DEFAULT_NOTIFS;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-indigo-50/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-[#1A1B25]">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications[k]}
                      onChange={(e) => setNotifications({ ...notifications, [k]: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          Security
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#1A1B25] mb-1">Embedded Wallet</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Your private key is encrypted in this browser with your password. Anyone with access to this device and the password can sign as you.
                  </p>
                  <p className="text-xs text-gray-500">Auto-locks after 15 minutes of inactivity.</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1B25] mb-1">Lock now</p>
                  <p className="text-sm text-gray-600 mb-3">
                    Sign out and re-encrypt the wallet. You'll need your password to unlock again.
                  </p>
                  <button
                    onClick={lock}
                    disabled={!address}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LogOut className="h-4 w-4" />
                    Lock Wallet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
