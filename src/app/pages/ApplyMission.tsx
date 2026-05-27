import { ArrowLeft, Target, DollarSign, Clock, Bot, Zap, TrendingUp, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAgents } from '../contexts/AgentsContext';
import { api } from '../../lib/api';
import { showError, showSuccess } from '../../lib/toast';

interface MissionDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  reward: number;
  status: string;
  acceptanceDeadline: string | null;
  workDeadline: string | null;
  clientId: string;
  posterType: string;
  companyName?: string | null;
}

function normalizeReward(raw: any): number {
  if (raw == null) return 0;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isNaN(n) ? 0 : n;
}

export function ApplyMission() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { agents } = useAgents();

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    setLoading(true);
    api.missions
      .get(missionId)
      .then((raw) => {
        if (cancelled) return;
        setMission({
          id: String(raw.id ?? missionId),
          title: raw.title ?? 'Untitled mission',
          description: raw.description ?? '',
          category: raw.category ?? 'OTHER',
          reward: normalizeReward(raw.reward ?? raw.bountyAmount),
          status: raw.status ?? 'OPEN',
          acceptanceDeadline: raw.acceptanceDeadline ?? null,
          workDeadline: raw.workDeadline ?? null,
          clientId: raw.clientId ?? '',
          posterType: raw.posterType ?? 'INDIVIDUAL',
          companyName: raw.companyName,
        });
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message ?? 'Mission not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  const deadlineLabel = useMemo(() => {
    if (!mission) return '';
    const target = mission.workDeadline ?? mission.acceptanceDeadline;
    if (!target) return 'Open';
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0) return 'Closed';
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }, [mission]);

  const categoryLabel = useMemo(() => {
    if (!mission) return '';
    return mission.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [mission]);

  const userAgents = useMemo(() => {
    if (!mission) return [];
    const targetCategory = mission.category.toLowerCase();
    return agents
      .map((agent) => {
        const reputation = Math.max(0, Math.min(1000, agent.reputation));
        const reputationScore = Math.round((reputation / 1000) * 60);
        const categoryHit = agent.skills.some((skill) => {
          const s = skill.toLowerCase().replace(/[\s&]+/g, '_');
          return s === targetCategory || targetCategory.includes(s) || s.includes(targetCategory);
        });
        const matchScore = Math.min(100, reputationScore + (categoryHit ? 40 : 0));
        return { ...agent, matchScore, categoryHit };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [agents, mission]);

  const agentPayout = mission ? mission.reward * 0.7 : 0;
  const treasuryPayout = mission ? mission.reward * 0.3 : 0;
  const buybackShare = mission ? mission.reward * 0.2 : 0;
  const rewardPoolShare = mission ? mission.reward * 0.1 : 0;

  const handleSubmit = async () => {
    if (!missionId) return;
    setSubmitting(true);
    try {
      await api.missions.accept(missionId);
      setIsSubmitted(true);
      showSuccess('Application submitted');
      setTimeout(() => {
        navigate('/marketplace');
      }, 1800);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to apply';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-[#4B3EEF] bg-[#4B3EEF]/10 border-[#4B3EEF]/30';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getMatchBadge = (score: number) => {
    if (score >= 75) return { text: 'Excellent Match', color: 'bg-green-500' };
    if (score >= 50) return { text: 'Good Match', color: 'bg-[#4B3EEF]' };
    return { text: 'Low Match', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading mission…
        </div>
      </main>
    );
  }

  if (error || !mission) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-3">{error ?? 'Mission not found'}</p>
          <Link to="/marketplace" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Back to Marketplace
          </Link>
        </div>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ delay: 0.2, type: 'spring', duration: 0.8 }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-[#1A1B25] mb-3"
          >
            Application Submitted!
          </motion.h2>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-600 mb-6"
          >
            You'll be assigned the mission once the acceptance window closes.
          </motion.p>
        </motion.div>
      </main>
    );
  }

  const acceptanceClosed = mission.status !== 'OPEN';

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Apply to Mission</h2>
            <p className="text-sm text-gray-600">Select your agent and submit your application</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg"
          >
            <h3 className="text-xl font-bold text-[#1A1B25] mb-4">Mission Overview</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-2xl font-bold text-indigo-700 mb-2">{mission.title}</h4>
                <p className="text-sm text-gray-600">
                  Posted by{' '}
                  <span className="font-semibold text-gray-900">
                    {mission.posterType === 'ENTERPRISE'
                      ? mission.companyName ?? 'Enterprise'
                      : 'Individual'}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Bounty</p>
                    <p className="font-bold text-green-700">${mission.reward.toLocaleString()} USDC</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4B3EEF]/10 border border-[#4B3EEF]/30">
                  <Clock className="h-4 w-4 text-[#4B3EEF]" />
                  <div>
                    <p className="text-xs text-gray-600">Time Left</p>
                    <p className="font-bold text-[#4B3EEF]">{deadlineLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Category</p>
                    <p className="font-bold text-blue-700">{categoryLabel}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{mission.description}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg"
          >
            <h3 className="text-xl font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
              <Bot className="h-6 w-6 text-indigo-600" />
              Select Your Agent
            </h3>

            {userAgents.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                No agents available. The agent runner must be online and you must hold an Agent Passport.
              </p>
            ) : (
              <div className="space-y-3">
                {userAgents.map((agent) => {
                  const matchBadge = getMatchBadge(agent.matchScore);
                  const isSelected = selectedAgent === agent.id;
                  return (
                    <motion.button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                            } shadow-md`}
                          >
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{agent.name}</h4>
                            <p className="text-xs text-gray-600">{agent.specialization}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-lg border ${getMatchColor(agent.matchScore)}`}>
                          <p className="text-xs font-bold">{agent.matchScore}% Match</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Reputation</p>
                          <p className="text-sm font-bold text-gray-900">{agent.reputation}/1000</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Success Rate</p>
                          <p className="text-sm font-bold text-green-600">{agent.successRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Staked</p>
                          <p className="text-sm font-bold text-indigo-600">
                            {agent.currentStake.toLocaleString()} $TASK
                          </p>
                        </div>
                      </div>

                      {agent.matchScore >= 75 && (
                        <div
                          className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg ${matchBadge.color} text-white`}
                        >
                          <Sparkles className="h-4 w-4" />
                          <p className="text-xs font-semibold">{matchBadge.text} — Recommended</p>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg sticky top-4"
          >
            <h3 className="text-lg font-bold text-[#1A1B25] mb-4">Application Summary</h3>

            {selectedAgent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                  <p className="text-xs text-gray-600 mb-1">Selected Agent</p>
                  <p className="font-bold text-indigo-700">
                    {userAgents.find((a) => a.id === selectedAgent)?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Bounty Distribution</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded-lg bg-green-50">
                      <span className="text-xs text-gray-600">Winning Agent (70%)</span>
                      <span className="text-sm font-bold text-green-700">${agentPayout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-indigo-50">
                      <span className="text-xs text-gray-600">Treasury — Buyback (20%)</span>
                      <span className="text-sm font-bold text-indigo-700">${buybackShare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg bg-purple-50">
                      <span className="text-xs text-gray-600">Reward Pool (10%)</span>
                      <span className="text-sm font-bold text-purple-700">${rewardPoolShare.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    On-chain PaymentSplitter pays 70% to the winning agent and 30% to the treasury. The treasury
                    routes 20% to $TASK buyback and 10% to the reward pool off-chain.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Agent Stake</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm font-bold text-indigo-700">
                      {userAgents.find((a) => a.id === selectedAgent)?.currentStake.toLocaleString()} $TASK
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting || acceptanceClosed}
                  whileHover={submitting || acceptanceClosed ? {} : { scale: 1.05 }}
                  whileTap={submitting || acceptanceClosed ? {} : { scale: 0.95 }}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-bold shadow-lg transition-all relative overflow-hidden group ${
                    submitting || acceptanceClosed
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#4B3EEF] to-[#4B3EEF]/80 hover:shadow-xl'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 relative z-10" />
                  )}
                  <span className="relative z-10">
                    {acceptanceClosed ? 'Acceptance Window Closed' : submitting ? 'Submitting…' : 'Submit Application'}
                  </span>
                </motion.button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Select an agent to continue</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
