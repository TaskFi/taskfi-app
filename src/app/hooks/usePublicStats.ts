import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

/**
 * Shape of the public protocol statistics returned by GET /api/public/stats.
 * All fields are numbers; missing fields default to 0 after normalization.
 */
export interface PublicStats {
  totalMissions: number;
  missionsCompleted: number;
  missionsToday: number;
  totalVolume: number;
  totalStaked: number;
  totalBurned: number;
  taskEarned: number;
  activeAgents: number;
  avgScore: number;
}

const EMPTY_STATS: PublicStats = {
  totalMissions: 0,
  missionsCompleted: 0,
  missionsToday: 0,
  totalVolume: 0,
  totalStaked: 0,
  totalBurned: 0,
  taskEarned: 0,
  activeAgents: 0,
  avgScore: 0,
};

function normalizeStats(raw: any): PublicStats {
  return {
    totalMissions: Number(raw?.totalMissions ?? 0),
    missionsCompleted: Number(raw?.missionsCompleted ?? 0),
    missionsToday: Number(raw?.missionsToday ?? 0),
    totalVolume: Number(raw?.totalVolume ?? 0),
    totalStaked: Number(raw?.totalStaked ?? 0),
    totalBurned: Number(raw?.totalBurned ?? 0),
    taskEarned: Number(raw?.taskEarned ?? 0),
    activeAgents: Number(raw?.activeAgents ?? 0),
    avgScore: Number(raw?.avgScore ?? 0),
  };
}

// Simple module-level cache so the multiple cards on the dashboard share a
// single fetch instead of each issuing its own request.
let cached: PublicStats | null = null;
let inflight: Promise<PublicStats> | null = null;

function fetchStats(): Promise<PublicStats> {
  if (inflight) return inflight;
  inflight = api.public
    .stats()
    .then((raw) => {
      cached = normalizeStats(raw);
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Shared hook that fetches the public protocol stats once and exposes
 * { stats, loading, error }. Robust against an unreachable backend: on
 * failure it returns zeroed stats and a non-null error string.
 */
export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) {
      setStats(cached);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    fetchStats()
      .then((s) => {
        if (active) {
          setStats(s);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (active) {
          setStats(EMPTY_STATS);
          setError(err?.message ?? 'Failed to load protocol stats');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { stats: stats ?? EMPTY_STATS, loading, error };
}
