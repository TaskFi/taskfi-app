import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../../lib/api';
import { showError } from '../../lib/toast';

export interface Agent {
  id: number;
  name: string;
  bio?: string;
  specialization: string;
  reputation: number;
  matchScore?: number;
  currentStake: number;
  successRate: number;
  skills: string[];
  webhookUrl?: string;
  totalMissions: number;
  wins: number;
  status: 'Active' | 'Inactive';
}

interface AgentsContextType {
  agents: Agent[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id' | 'totalMissions' | 'wins' | 'status'> & Partial<Pick<Agent, 'totalMissions' | 'wins' | 'status'>>) => void;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

/**
 * Normalize a raw leaderboard/agent entry from the TaskFi backend into the
 * Agent shape the dashboard pages expect.
 */
function normalizeAgent(raw: any, index: number): Agent {
  const skills: string[] = Array.isArray(raw?.skills)
    ? raw.skills
    : Array.isArray(raw?.tags)
      ? raw.tags
      : [];

  const totalMissions = Number(raw?.totalMissions ?? raw?.acceptances ?? 0);
  const wins = Number(raw?.wins ?? raw?.completedMissions ?? raw?.completed ?? 0);
  const rawStatus = String(raw?.status ?? 'Active').toLowerCase();
  const status: Agent['status'] = rawStatus === 'inactive' ? 'Inactive' : 'Active';

  return {
    id: typeof raw?.id === 'number' ? raw.id : index + 1,
    name: raw?.name ?? raw?.displayName ?? `Agent #${index + 1}`,
    bio: raw?.bio ?? raw?.description,
    specialization: raw?.specialization ?? raw?.specialty ?? skills[0] ?? 'General',
    reputation: Number(raw?.reputation ?? raw?.reputationScore ?? 0),
    matchScore: raw?.matchScore != null ? Number(raw.matchScore) : undefined,
    currentStake: Number(raw?.currentStake ?? raw?.stake ?? raw?.stakedAmount ?? raw?.staked ?? 0),
    successRate: Number(raw?.successRate ?? raw?.winRate ?? 0),
    skills,
    webhookUrl: raw?.webhookUrl,
    totalMissions,
    wins,
    status,
  };
}

export function AgentsProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.agents.leaderboard();
      setAgents((res.leaderboard ?? []).map(normalizeAgent));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Agent creation/registration happens on-chain via the dedicated flow.
  // Here we optimistically append the new agent to the local list so the UI
  // reflects it immediately after deployment.
  const addAgent = useCallback((newAgent: Omit<Agent, 'id' | 'totalMissions' | 'wins' | 'status'> & Partial<Pick<Agent, 'totalMissions' | 'wins' | 'status'>>) => {
    setAgents(prev => {
      const id = Math.max(0, ...prev.map(a => a.id)) + 1;
      return [
        ...prev,
        {
          totalMissions: 0,
          wins: 0,
          status: 'Active',
          ...newAgent,
          id,
        } as Agent,
      ];
    });
    // Best-effort backend registration; failure does not block the UI.
    api.auth.registerAgent().catch((err: any) => {
      showError(err?.message ?? 'Agent registration could not be confirmed on the backend');
    });
  }, []);

  return (
    <AgentsContext.Provider value={{ agents, loading, error, reload, addAgent }}>
      {children}
    </AgentsContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
}
