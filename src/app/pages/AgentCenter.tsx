import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Lock, Plus, Cpu, Bot, Brain,
  DollarSign, Hash, AlertTriangle, ExternalLink, Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useWallet } from '../../lib/wallet-context';
import { useRuntimeConfig } from '../contexts/ConfigContext';

interface PassportInfo {
  hasPassport: boolean;
  tokenId?: number;
  locked?: boolean;
  name?: string;
  endpoint?: string;
  level?: number;
  score?: number;
  missionsCompleted?: number;
  mintedAt?: string | null;
}

interface AgentProfile {
  walletAddress: string;
  role: string | null;
  onChain: {
    reputation: number;
    multiplier: number;
    totalMissions: number;
    wins: number;
    losses: number;
    pendingEarnings: string;
  };
  categories: string[];
  dbSubmissions: number;
}

function TrustBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : score >= 75 ? 'bg-[#4B3EEF]' : score >= 55 ? 'bg-amber-400' : 'bg-red-500';
  const textColor = score >= 90 ? 'text-green-700' : score >= 75 ? 'text-[#4B3EEF]' : score >= 55 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>{score}<span className="font-normal opacity-60">/100</span></span>
    </div>
  );
}

function formatTokenId(id: number | undefined): string {
  if (id == null) return '#----';
  return `#${String(id).padStart(4, '0')}`;
}

// USDC has 6 decimals on Base
function formatUsdc(raw: string): string {
  try {
    const big = BigInt(raw);
    const whole = big / 1_000_000n;
    const frac = (big % 1_000_000n) / 10_000n;
    return `$${whole.toLocaleString()}.${frac.toString().padStart(2, '0')}`;
  } catch {
    return '$0.00';
  }
}

export function AgentCenter() {
  const { address } = useWallet();
  const { config } = useRuntimeConfig();
  const explorerBase = config?.chainId === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  const [passport, setPassport] = useState<PassportInfo | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.agents.passport(address).catch(() => ({ hasPassport: false })),
      api.agents.profile(address).catch(() => null),
    ])
      .then(([p, prof]) => {
        if (cancelled) return;
        setPassport(p);
        setProfile(prof);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const hasAgent = passport?.hasPassport === true;
  const trustScore = passport?.score ?? profile?.onChain.reputation ?? 0;
  const completed = passport?.missionsCompleted ?? profile?.onChain.wins ?? 0;
  const losses = profile?.onChain.losses ?? 0;
  const totalMissions = profile?.onChain.totalMissions ?? 0;
  const successRate = totalMissions > 0 ? Math.round((completed / totalMissions) * 100) : 0;
  const primarySkill = profile?.categories[0] ?? 'General';
  const pendingEarnings = profile?.onChain.pendingEarnings ?? '0';

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Agent Hub</h2>
            <p className="text-sm text-gray-600">Manage and optimize your AI agent portfolio</p>
          </div>
        </div>

        {/* ERC-5192 protocol notice */}
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#4B3EEF]/20 bg-[#EBEAFE]/60 px-5 py-4 max-w-2xl">
          <Lock className="h-4 w-4 text-[#4B3EEF] mt-0.5 shrink-0" />
          <p className="text-sm text-[#4B3EEF] leading-relaxed">
            All passports are <strong>permanently locked</strong> per ERC-5192 standard (<code className="font-mono bg-indigo-100 px-1 rounded text-xs">locked = true</code>). Token metadata is updated on-chain by the Jury after each mission. Passports cannot be transferred or burned.
          </p>
        </div>

        {!hasAgent && (
          <Link
            to="/create-agent"
            className="block w-full max-w-2xl rounded-2xl bg-gradient-to-r from-[#EBEAFE] to-[#d4d5f7] border-2 border-indigo-300 p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#1A1B25] text-xl font-bold mb-1">Create your AI Agent</h3>
                <p className="text-gray-700 text-sm">Deploy an agent, start earning from the marketplace — and mint your on-chain passport.</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg">
                <Plus className="h-8 w-8 text-white" />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ── Your Agent Portfolio ── */}
      <div className="mb-10">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          Your Agent Portfolio
        </h3>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading agent passport…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-sm text-red-700">
            Failed to load agent data: {error}
          </div>
        )}

        {!loading && !error && !address && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 text-center text-sm text-gray-500">
            Connect a wallet to view your agent portfolio.
          </div>
        )}

        {!loading && !error && address && !hasAgent && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 text-center">
            <Bot className="h-10 w-10 text-indigo-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#1A1B25] mb-1">No passport minted yet</p>
            <p className="text-xs text-gray-500 mb-4">Deploy an agent to mint your on-chain ERC-5192 passport.</p>
            <Link
              to="/create-agent"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4B3EEF] text-white text-sm font-semibold hover:bg-[#3D32D9] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Agent
            </Link>
          </div>
        )}

        {!loading && !error && hasAgent && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md shadow-lg overflow-hidden">
              {/* ERC-5192 identity strip */}
              <div className="flex items-center justify-between px-4 py-2 bg-[#F4F5FF] border-b border-indigo-100">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3 w-3 text-gray-400" />
                  <span className="text-[11px] font-mono text-gray-500 tracking-wide">
                    ERC-5192 {formatTokenId(passport?.tokenId)}
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A1B25]">
                  <Lock className="h-2.5 w-2.5 text-white" />
                  <span className="text-[9px] font-bold text-white uppercase tracking-wide">Soulbound</span>
                </div>
              </div>

              <div className="p-5">
                {/* Agent header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1B25]">{passport?.name ?? 'Agent'}</h4>
                      <p className="text-xs text-gray-500 font-mono">
                        {address?.slice(0, 6)}…{address?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-100">
                    <Brain className="h-3.5 w-3.5 text-indigo-700" />
                    <span className="text-xs font-bold text-indigo-700">L{passport?.level ?? 0}</span>
                  </div>
                </div>

                {/* Trust Score + Slash Count */}
                <div className="mb-4 rounded-lg border border-indigo-100 bg-[#F4F5FF] p-3 space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Trust Score</span>
                      {losses > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {losses} loss{losses > 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-green-600">Clean record</span>
                      )}
                    </div>
                    <TrustBar score={trustScore} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-500">Primary category:</span>
                    <span className="text-[11px] font-semibold text-[#4B3EEF]">{primarySkill}</span>
                  </div>
                </div>

                {/* Performance metrics */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-2">
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="text-base font-bold text-green-700">{formatUsdc(pendingEarnings)}</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-2">
                    <p className="text-xs text-gray-600">In-flight</p>
                    <p className="text-base font-bold text-blue-700">{Math.max(0, totalMissions - completed - losses)}</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 p-2">
                    <p className="text-xs text-gray-600">Completed</p>
                    <p className="text-base font-bold text-purple-700">{completed}</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-r from-[#4B3EEF]/10 to-[#3D32D9]/5 border border-[#4B3EEF]/30 p-2">
                    <p className="text-xs text-gray-600">Success</p>
                    <p className="text-base font-bold text-amber-700">{successRate}%</p>
                  </div>
                </div>

                {/* Categories */}
                {profile && profile.categories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.categories.slice(0, 5).map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {passport?.endpoint && (
                  <div className="mb-3 rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Endpoint</p>
                    <p className="text-xs font-mono text-gray-700 break-all">{passport.endpoint}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Link
                    to="/marketplace"
                    className="text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all text-sm"
                  >
                    Find Missions
                  </Link>
                  <a
                    href={`${explorerBase}/address/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-center inline-flex items-center justify-center gap-1 border border-indigo-200 text-indigo-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-50 transition-all text-sm"
                  >
                    BaseScan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {pendingEarnings !== '0' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatUsdc(pendingEarnings)} pending — claim from Staking & Rewards.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
