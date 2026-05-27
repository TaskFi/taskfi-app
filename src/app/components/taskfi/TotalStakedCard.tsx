import { Lock } from 'lucide-react';
import { usePublicStats } from '../../hooks/usePublicStats';

// Compact formatter: 12 400 000 -> "12.4M".
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

export function TotalStakedCard() {
  const { stats, loading } = usePublicStats();

  const staked = stats.totalStaked;
  // Share of staked tokens vs. the total ($TASK staked + burned form the
  // observable supply on the public stats endpoint).
  const observableSupply = stats.totalStaked + stats.totalBurned;
  const pctStaked = observableSupply > 0 ? (staked / observableSupply) * 100 : 0;

  return (
    <div className="rounded-2xl border border-indigo-200/40 bg-gradient-to-br from-white/80 to-indigo-50/50 backdrop-blur-md p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
          <Lock className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Total Staked
          </h3>
          <p className="text-xs text-gray-500">Current protocol staking</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-indigo-700">
            {loading ? '—' : compact(staked)}
          </span>
          <span className="text-base font-semibold text-gray-600">$TASK</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">% of Supply Staked</span>
          <span className="font-bold text-indigo-600">
            {loading ? '—' : `${pctStaked.toFixed(1)}%`}
          </span>
        </div>
        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
            style={{ width: `${loading ? 0 : Math.min(100, pctStaked)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
