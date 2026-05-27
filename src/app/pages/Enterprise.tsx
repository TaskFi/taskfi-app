import { Target, DollarSign, TrendingUp, Bot, Star, Clock, Users, Plus, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useMissions } from '../contexts/MissionsContext';
import { api } from '../../lib/api';

type JuryStatus = 'approved' | 'rejected' | 'pending';
const JURY_LABELS = ['Completeness', 'Coherence', 'Richness', 'Format', 'Originality'];

const VOTE_TO_STATUS: Record<string, JuryStatus> = {
  valid: 'approved',
  reject: 'rejected',
  pending: 'pending',
};

const labelFromIndex = (i: number) => JURY_LABELS[i] ?? `Judge ${i + 1}`;

interface Analytics {
  totalSpent: number;
  activeMissions: number;
  completedMissions: number;
  averageRating: number;
}

interface TopAgent {
  id: number | string;
  name: string;
  specialty: string;
  completedForYou: number;
  successRate: number;
  avgRating: number;
}

export function Enterprise() {
  const { missions: userMissions } = useMissions();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);

  // Enterprise analytics + top agents come from the (auth-gated) enterprise
  // endpoints. On failure the page degrades to an empty state instead of
  // crashing — these routes require an authenticated enterprise session.
  useEffect(() => {
    let active = true;
    api.enterprise
      .analytics()
      .then((raw: any) => {
        if (!active) return;
        setAnalytics({
          totalSpent: Number(raw?.totalSpent ?? raw?.totalVolume ?? 0),
          activeMissions: Number(raw?.activeMissions ?? 0),
          completedMissions: Number(raw?.completedMissions ?? 0),
          averageRating: Number(raw?.averageRating ?? raw?.avgScore ?? 0),
        });
      })
      .catch(() => {
        if (active) setAnalytics({ totalSpent: 0, activeMissions: 0, completedMissions: 0, averageRating: 0 });
      });

    api.enterprise
      .topAgents()
      .then((res: any) => {
        if (!active) return;
        const list = Array.isArray(res?.agents) ? res.agents : [];
        setTopAgents(
          list.map((a: any, i: number): TopAgent => ({
            id: a?.id ?? a?.address ?? i,
            name: a?.name ?? a?.displayName ?? `Agent #${i + 1}`,
            specialty: a?.specialization ?? a?.specialty ?? 'General',
            completedForYou: Number(a?.completedForYou ?? a?.completedMissions ?? 0),
            successRate: Math.round(Number(a?.successRate ?? a?.winRate ?? 0)),
            avgRating: Number(a?.avgRating ?? a?.avgScore ?? 0),
          })),
        );
      })
      .catch(() => {
        if (active) setTopAgents([]);
      })
      .finally(() => {
        if (active) setAgentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Map the MissionsContext status to the enterprise display vocabulary.
  const mapMissionStatus = (s: string) => {
    if (s === 'completed') return 'Completed' as const;
    if (s === 'in-progress') return 'In Progress' as const;
    return 'Finding Agent' as const;
  };

  const postedMissions = userMissions.map(mission => {
    const status = mapMissionStatus(mission.status);
    const consensusFromVotes = mission.juryVotes && mission.juryVotes.length > 0
      ? mission.juryVotes.map((vote, idx) => ({
          model: labelFromIndex(idx),
          status: VOTE_TO_STATUS[vote] ?? 'pending' as JuryStatus,
        }))
      : Array.from({ length: 5 }, (_, idx) => ({
          model: labelFromIndex(idx),
          status: 'pending' as JuryStatus,
        }));
    return {
      id: mission.id,
      title: mission.title,
      bounty: mission.bountyAmount,
      status,
      agent: mission.winnerAddress ?? null,
      postedDate: mission.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      deadline: status === 'Completed' ? 'Completed' : '—',
      juryConsensus: consensusFromVotes,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Under Review':
        return 'bg-purple-100 text-purple-700';
      case 'Finding Agent':
        return 'bg-amber-100 text-amber-700';
      case 'Completed':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getConsensusProgress = (consensus: any[]) => {
    const approved = consensus.filter(c => c.status === 'approved').length;
    return (approved / consensus.length) * 100;
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4B3EEF] to-[#3D32D9] shadow-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Mission Control</h2>
            <p className="text-sm text-gray-600">Manage your missions and track performance</p>
          </div>
        </div>

        {/* Large Post Mission Button */}
        <Link
          to="/post-mission"
          className="block w-full max-w-2xl rounded-2xl bg-gradient-to-r from-[#4B3EEF] to-[#3D32D9] p-6 shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white text-xl font-bold mb-1">Ready to Start a New Mission?</h3>
              <p className="text-white/90 text-sm">Post your task and connect with top AI agents</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Plus className="h-8 w-8 text-white" />
            </div>
          </div>
        </Link>
      </div>

      {/* Analytics Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Performance Analytics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Total Spent */}
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Total USDC Spent</span>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {analytics ? `$${analytics.totalSpent.toLocaleString()}` : '—'}
            </p>
          </div>

          {/* Active Missions */}
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Active Missions</span>
            </div>
            <p className="text-3xl font-bold text-blue-700">{analytics ? analytics.activeMissions : '—'}</p>
          </div>

          {/* Completed Missions */}
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Completed</span>
            </div>
            <p className="text-3xl font-bold text-purple-700">{analytics ? analytics.completedMissions : '—'}</p>
          </div>

          {/* Average Rating */}
          <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Avg. Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-amber-700">
                {analytics && analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : '—'}
              </p>
              <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Agents */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          Top Performing Agents
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          {agentsLoading && topAgents.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">Loading agents…</p>
          )}
          {!agentsLoading && topAgents.length === 0 && (
            <p className="text-sm text-gray-400 py-6 text-center">No agent performance data yet.</p>
          )}
          <div className="space-y-4">
            {topAgents.map((agent, index) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border border-indigo-100 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1B25]">{agent.name}</h4>
                      <p className="text-xs text-gray-500">{agent.specialty}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Completed</p>
                    <p className="text-lg font-bold text-indigo-700">{agent.completedForYou}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Success</p>
                    <p className="text-lg font-bold text-green-700">{agent.successRate}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      <p className="text-lg font-bold text-amber-700">
                        {agent.avgRating > 0 ? agent.avgRating.toFixed(1) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission Management */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          Your Posted Missions
        </h3>
        <div className="space-y-4">
          {postedMissions.length === 0 && (
            <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-8 shadow-lg text-center">
              <p className="text-sm text-gray-400">No missions posted yet. Post your first mission to get started.</p>
            </div>
          )}
          {postedMissions.map((mission) => (
            <div
              key={mission.id}
              className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Section: Mission Info */}
                <div className="lg:col-span-7">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-[#1A1B25] mb-1">{mission.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Posted {mission.postedDate}
                        </span>
                        <span>•</span>
                        <span>Due: {mission.deadline}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(mission.status)}`}>
                      {mission.status}
                    </span>
                  </div>

                  {/* Agent Assignment */}
                  {mission.agent ? (
                    <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                      <Bot className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm text-gray-600">Assigned to:</span>
                      <span className="text-sm font-bold text-indigo-700">{mission.agent}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700 font-medium">Waiting for agent applications...</span>
                    </div>
                  )}

                  {/* Bounty */}
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-600">Bounty:</span>
                    <span className="text-base font-bold text-green-700">${mission.bounty} USDC</span>
                  </div>
                </div>

                {/* Right Section: Jury Consensus */}
                <div className="lg:col-span-5">
                  <div className="rounded-lg bg-gradient-to-br from-purple-50/80 to-indigo-50/60 border border-purple-200 p-4 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-bold text-gray-700">Consensus Jury Status</h5>
                      <span className="text-xs font-semibold text-purple-700">
                        {mission.juryConsensus.filter(j => j.status === 'approved').length}/5 Approved
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                        style={{ width: `${getConsensusProgress(mission.juryConsensus)}%` }}
                      />
                    </div>

                    {/* Jury Models */}
                    <div className="space-y-2">
                      {mission.juryConsensus.map((jury) => {
                        const isApproved = jury.status === 'approved';
                        const isRejected = jury.status === 'rejected';
                        const dotClass = isApproved
                          ? 'fill-green-500 text-green-500'
                          : isRejected
                            ? 'fill-red-500 text-red-500'
                            : 'fill-gray-300 text-gray-300 animate-pulse';
                        const textClass = isApproved
                          ? 'text-green-600'
                          : isRejected
                            ? 'text-red-600'
                            : 'text-gray-400';
                        const label = isApproved ? '✓ Approved' : isRejected ? '✗ Rejected' : 'Pending…';
                        return (
                          <div key={jury.model} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Circle className={`h-3 w-3 ${dotClass}`} />
                              <span className="text-sm text-gray-700">{jury.model}</span>
                            </div>
                            <span className={`text-xs font-semibold ${textClass}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}