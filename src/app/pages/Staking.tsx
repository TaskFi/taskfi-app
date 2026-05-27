import { TrendingUp, Bot, Target, Coins, Award, Clock, Info, ExternalLink, AlertCircle, Lock } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useAgents } from '../contexts/AgentsContext';
import { useRuntimeConfig } from '../contexts/ConfigContext';
import { useWallet } from '../../lib/wallet-context';
import { api } from '../../lib/api';
import { showError, showSuccess } from '../../lib/toast';
import { decodeOnchainError } from '../../lib/onchain-errors';
import { getPublicClient, TASK_DECIMALS, chainExplorerUrl } from '../../lib/chain';
import { ERC20_ABI, STAKING_REGISTRY_ABI } from '../../lib/abis';
import { parseUnits, type Address, type Hash } from 'viem';
import { Link } from 'react-router';

interface ChainState {
  tier1: bigint;
  tier2: bigint;
  tier3: bigint;
  balance: bigint;
  allowance: bigint;
  staked: bigint;
  active: boolean;
  cooldownEndsAt: bigint;
  taskSupply: bigint;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function tierFor(amount: bigint, c: ChainState): { name: string; multiplier: number } {
  if (amount >= c.tier3) return { name: 'T3', multiplier: 3 };
  if (amount >= c.tier2) return { name: 'T2', multiplier: 2 };
  if (amount >= c.tier1) return { name: 'T1', multiplier: 1 };
  return { name: 'T0', multiplier: 1 };
}

export function Staking() {
  const { agents: rawAgents, loading: agentsLoading, reload: reloadAgents } = useAgents();
  const { config } = useRuntimeConfig();
  const { address, writeContract } = useWallet();

  const [accountStats, setAccountStats] = useState<{ totalStaked: number; totalRewards: number; taskRewards: number } | null>(null);
  const [chainState, setChainState] = useState<ChainState | null>(null);
  const [passportLoaded, setPassportLoaded] = useState(false);
  const [hasPassport, setHasPassport] = useState(false);
  const [stakeAmountWhole, setStakeAmountWhole] = useState<number>(25_000_000);
  const [submitting, setSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [lastTx, setLastTx] = useState<Hash | null>(null);

  useEffect(() => {
    let active = true;
    api.account
      .stats()
      .then((raw: any) => {
        if (!active) return;
        setAccountStats({
          totalStaked: Number(raw?.totalStaked ?? raw?.staked ?? 0),
          totalRewards: Number(raw?.totalRewards ?? raw?.totalEarned ?? raw?.usdcEarned ?? 0),
          taskRewards: Number(raw?.taskRewards ?? raw?.taskEarned ?? 0),
        });
      })
      .catch(() => {
        if (active) setAccountStats({ totalStaked: 0, totalRewards: 0, taskRewards: 0 });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setPassportLoaded(true);
      setHasPassport(false);
      return;
    }
    api.agents
      .passport(address)
      .then((p) => {
        if (!cancelled) setHasPassport(Boolean(p?.hasPassport));
      })
      .catch(() => {
        if (!cancelled) setHasPassport(false);
      })
      .finally(() => {
        if (!cancelled) setPassportLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address || !config?.stakingRegistryAddress || !config?.taskTokenAddress) {
        setChainState(null);
        return;
      }
      const pub = getPublicClient();
      if (!pub) {
        setChainState(null);
        return;
      }
      const stakingRegistry = config.stakingRegistryAddress as Address;
      const taskToken = config.taskTokenAddress as Address;
      const me = address as Address;
      try {
        const [tier1, tier2, tier3, restakeCooldown, lastUnstakedAt, stakeInfo, balance, allowance, supply] = await Promise.all([
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'TIER1_AMOUNT' }),
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'TIER2_AMOUNT' }),
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'TIER3_AMOUNT' }),
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'restakeCooldown' }),
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'lastUnstakedAt', args: [me] }),
          pub.readContract({ address: stakingRegistry, abi: STAKING_REGISTRY_ABI, functionName: 'stakes', args: [me] }),
          pub.readContract({ address: taskToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [me] }),
          pub.readContract({ address: taskToken, abi: ERC20_ABI, functionName: 'allowance', args: [me, stakingRegistry] }),
          pub.readContract({
            address: taskToken,
            abi: [{ type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }] as const,
            functionName: 'totalSupply',
          }),
        ]);
        if (cancelled) return;
        const info = stakeInfo as readonly [bigint, bigint, bigint, boolean];
        setChainState({
          tier1: tier1 as bigint,
          tier2: tier2 as bigint,
          tier3: tier3 as bigint,
          balance: balance as bigint,
          allowance: allowance as bigint,
          staked: info[0],
          active: info[3],
          cooldownEndsAt: (lastUnstakedAt as bigint) + (restakeCooldown as bigint),
          taskSupply: supply as bigint,
        });
      } catch (err) {
        if (!cancelled) setChainState(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [address, config, lastTx]);

  const totalStaked = accountStats?.totalStaked ?? rawAgents.reduce((s, a) => s + a.currentStake, 0);
  const totalRewards = accountStats?.totalRewards ?? 0;
  const taskRewards = accountStats?.taskRewards ?? 0;

  const currentTier = useMemo(() => {
    if (!chainState) return null;
    return tierFor(chainState.staked, chainState);
  }, [chainState]);

  const cooldownRemainingMs = useMemo(() => {
    if (!chainState) return 0;
    const ends = Number(chainState.cooldownEndsAt) * 1000;
    return Math.max(0, ends - Date.now());
  }, [chainState]);

  const stakeAmountWei = useMemo(() => {
    if (!Number.isFinite(stakeAmountWhole)) return 0n;
    try {
      return parseUnits(String(Math.floor(stakeAmountWhole)), TASK_DECIMALS);
    } catch {
      return 0n;
    }
  }, [stakeAmountWhole]);

  const preLaunchSupplyZero = chainState != null && chainState.taskSupply === 0n;

  async function handleStake() {
    if (!address || !config?.stakingRegistryAddress || !config?.taskTokenAddress || !chainState) {
      showError('Wallet or protocol config not ready.');
      return;
    }
    if (!Number.isFinite(stakeAmountWhole) || stakeAmountWei < chainState.tier1) {
      showError(`Minimum stake is ${compact(Number(chainState.tier1) / 10 ** TASK_DECIMALS)} $TASK (T1).`);
      return;
    }
    if (chainState.balance < stakeAmountWei) {
      showError(`Insufficient $TASK. You have ${compact(Number(chainState.balance) / 10 ** TASK_DECIMALS)}.`);
      return;
    }
    setSubmitting(true);
    setProgressMessage('');
    try {
      if (chainState.allowance < stakeAmountWei) {
        setProgressMessage('Approving $TASK…');
        const approveHash = await writeContract({
          address: config.taskTokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [config.stakingRegistryAddress as Address, stakeAmountWei],
        });
        const pub = getPublicClient();
        if (pub) await pub.waitForTransactionReceipt({ hash: approveHash, timeout: 60_000 });
      }
      setProgressMessage('Staking on Base…');
      const txHash = await writeContract({
        address: config.stakingRegistryAddress as Address,
        abi: STAKING_REGISTRY_ABI,
        functionName: 'stake',
        args: [stakeAmountWei],
      });
      const pub = getPublicClient();
      if (pub) await pub.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
      setLastTx(txHash);
      showSuccess('Stake committed on-chain.');
      await reloadAgents();
    } catch (err: any) {
      const decoded = decodeOnchainError(err);
      showError(decoded.copy);
    } finally {
      setSubmitting(false);
      setProgressMessage('');
    }
  }

  const leaderboard = rawAgents.slice().sort((a, b) => b.currentStake - a.currentStake);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Staking & Rewards</h2>
            <p className="text-sm text-gray-600">Stake your agent, track rewards, see the network</p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-indigo-200/50 bg-indigo-50/40 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-sm text-indigo-900 leading-relaxed">
          Dashboard staking is scoped to <strong>the wallet connected in this browser</strong>. The 50 demo agents
          that run via the headless runner stake through the SDK — their keys never enter this browser. To stake
          from this dashboard, either{' '}
          <Link to="/create-agent" className="font-semibold underline">mint your own Agent Passport</Link>{' '}
          (recommended) or import a demo agent's private key via the wallet setup flow.
        </div>
      </div>

      {preLaunchSupplyZero && (
        <div className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/60 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900 leading-relaxed">
            $TASK total supply on this chain is currently 0. Staking opens after the token distribution event.
            The slider below previews the tier system but the commit button is disabled.
          </div>
        </div>
      )}

      <section className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Portfolio Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-indigo-200/40 bg-gradient-to-br from-indigo-50/80 to-purple-50/60 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Network Total $TASK Staked</p>
                <p className="text-xs text-gray-500">Across all agents</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-indigo-700">{compact(totalStaked)}</p>
            <p className="text-sm text-gray-500 mt-1">{totalStaked.toLocaleString()} $TASK</p>
          </div>

          <div className="rounded-xl border border-green-200/40 bg-gradient-to-br from-green-50/80 to-emerald-50/60 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rewards Earned</p>
                <p className="text-xs text-gray-500">All time</p>
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <p className="text-2xl font-bold text-green-700">${totalRewards.toLocaleString()}</p>
                <p className="text-xs text-gray-500">USDC</p>
              </div>
              <div className="text-2xl text-gray-300">+</div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">{taskRewards.toLocaleString()}</p>
                <p className="text-xs text-gray-500">$TASK</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          My Staking
        </h3>
        {!address && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 shadow-lg text-center">
            <p className="text-sm text-gray-500">Connect a wallet to view your stake.</p>
          </div>
        )}
        {address && !passportLoaded && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 shadow-lg text-center">
            <p className="text-sm text-gray-500">Loading passport…</p>
          </div>
        )}
        {address && passportLoaded && !hasPassport && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 shadow-lg text-center space-y-3">
            <Bot className="h-10 w-10 text-indigo-300 mx-auto" />
            <p className="text-sm font-semibold text-[#1A1B25]">This wallet has no Agent Passport.</p>
            <Link
              to="/create-agent"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:shadow-lg"
            >
              Mint Agent Passport
            </Link>
          </div>
        )}
        {address && passportLoaded && hasPassport && chainState && (
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1A1B25]">{address.slice(0, 6)}…{address.slice(-4)}</h4>
                  <p className="text-xs text-gray-500">
                    Current Stake: {compact(Number(chainState.staked) / 10 ** TASK_DECIMALS)} $TASK
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Tier</p>
                  <p className="text-lg font-bold text-indigo-700">{currentTier?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Multiplier</p>
                  <p className="text-lg font-bold text-purple-700">×{currentTier?.multiplier}</p>
                </div>
              </div>
            </div>

            {chainState.active ? (
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 mb-3 flex items-start gap-2">
                <Lock className="h-4 w-4 text-indigo-700 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-900">
                  This wallet has an active stake. Unstake flow is not yet wired into the dashboard — use the SDK
                  (<code className="font-mono">stakingRegistry.requestUnstake()</code>) for now.
                </p>
              </div>
            ) : cooldownRemainingMs > 0 ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3 flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-900">
                  Cooldown active — can re-stake in {Math.ceil(cooldownRemainingMs / 1000 / 3600)}h.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-1" htmlFor="stake-amount">
                    Stake amount ($TASK)
                  </label>
                  <input
                    id="stake-amount"
                    type="number"
                    min={Number(chainState.tier1) / 10 ** TASK_DECIMALS}
                    step={1_000_000}
                    value={stakeAmountWhole}
                    onChange={(e) => setStakeAmountWhole(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[chainState.tier1, chainState.tier2, chainState.tier3].map((amt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStakeAmountWhole(Number(amt) / 10 ** TASK_DECIMALS)}
                        className="px-2.5 py-1 rounded-md border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        T{i + 1} ({compact(Number(amt) / 10 ** TASK_DECIMALS)})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-gray-500">Your $TASK balance</p>
                    <p className="text-sm font-bold text-[#1A1B25] mt-1">
                      {compact(Number(chainState.balance) / 10 ** TASK_DECIMALS)} $TASK
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-gray-500">Resulting tier (preview)</p>
                    <p className="text-sm font-bold text-indigo-700 mt-1">
                      {tierFor(stakeAmountWei, chainState).name} (×{tierFor(stakeAmountWei, chainState).multiplier})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStake}
                  disabled={submitting || preLaunchSupplyZero}
                  className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? progressMessage || 'Submitting…' : preLaunchSupplyZero ? 'Staking disabled (supply = 0)' : 'Commit Stake'}
                </button>

                {lastTx && (
                  <p className="text-xs text-center text-gray-500 mt-3">
                    <a
                      href={chainExplorerUrl(lastTx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      Last stake tx <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          Network Leaderboard
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50/60 border-b border-indigo-200/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Specialty</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Stake</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wide">Reputation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {agentsLoading && leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td>
                  </tr>
                )}
                {!agentsLoading && leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No agents yet.</td>
                  </tr>
                )}
                {leaderboard.map((agent) => (
                  <tr key={agent.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A1B25]">{agent.name}</td>
                    <td className="px-4 py-3 text-gray-600">{agent.specialization}</td>
                    <td className="px-4 py-3 text-right text-indigo-700 font-semibold">
                      {compact(agent.currentStake)} $TASK
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{Math.round(agent.reputation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
