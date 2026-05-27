import { Flame, TrendingDown, Activity } from 'lucide-react';
import { useMissions } from '../../contexts/MissionsContext';
import { usePublicStats } from '../../hooks/usePublicStats';

interface ProtocolEvent {
  id: string;
  type: 'buyback' | 'completion';
  title: string;
  description: string;
  amount: string;
  timestamp: string;
}

// Compact formatter for token amounts.
function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function ProtocolHealth() {
  const { stats, loading: statsLoading } = usePublicStats();
  const { missions } = useMissions();

  // There is no dedicated protocol-events endpoint. The event feed is derived
  // from recently completed missions (each completion drives protocol revenue
  // / buyback). Slashing has no public data source, so it is omitted rather
  // than faked.
  const events: ProtocolEvent[] = [...missions]
    .filter((m) => m.status === 'completed')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8)
    .map((m): ProtocolEvent => ({
      id: `m-${m.id}`,
      type: 'completion',
      title: 'Mission Settled',
      description: `"${m.title}" payout settled — protocol fee collected`,
      amount: `${m.bountyAmount.toLocaleString()} USDC`,
      timestamp: relativeTime(m.timestamp),
    }));

  const totalBurned = statsLoading ? '—' : `${compact(stats.totalBurned)} $TASK`;
  const totalVolume = statsLoading ? '—' : `${compact(stats.totalVolume)} USDC`;

  return (
    <div className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-[#1A1B25]">Protocol Health</h3>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-green-600">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-gradient-to-br from-[#4B3EEF]/10 to-transparent border border-[#4B3EEF]/30 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-3 w-3 text-[#4B3EEF]" />
            <span className="text-xs text-gray-600">Total Burned</span>
          </div>
          <p className="text-sm font-bold text-[#4B3EEF]">{totalBurned}</p>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-red-50 to-transparent border border-red-200/50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-3 w-3 text-red-600" />
            <span className="text-xs text-gray-600">Total Volume</span>
          </div>
          <p className="text-sm font-bold text-red-700">{totalVolume}</p>
        </div>
      </div>

      {/* Event Feed */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {events.length === 0 && (
          <p className="text-xs text-gray-400 py-6 text-center">
            No settled missions yet — protocol events will appear here.
          </p>
        )}
        {events.map((event, index) => (
          <div
            key={event.id}
            className="rounded-xl border border-[#4B3EEF]/30 bg-gradient-to-r from-[#4B3EEF]/20 to-[#4B3EEF]/10 p-3 transition-all hover:scale-[1.02] cursor-pointer opacity-0 animate-in fade-in slide-in-from-right-2"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4B3EEF]/20">
                <Flame className="h-4 w-4 text-[#4B3EEF]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-[#1A1B25]">{event.title}</p>
                  <span className="text-xs text-[#4B3EEF] font-bold">{event.amount}</span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{event.description}</p>
                <span className="text-xs text-gray-400">{event.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
