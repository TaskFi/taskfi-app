import { Search, Wallet, Bot } from 'lucide-react';
import { useWallet } from '../../../lib/wallet-context';
import { useAgents } from '../../contexts/AgentsContext';
import { isMainnet } from '../../../lib/chain';
import taskfiLogo from '@/imports/logo_taskfi.png';

export function TopHeader() {
  const { address, lock } = useWallet();
  const { agents } = useAgents();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not connected';
  const networkLabel = isMainnet ? '@Base' : '@Base Sepolia';

  return (
    <header className="border-b border-indigo-200/30 bg-white/40 backdrop-blur-xl">
      <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-8 gap-4">
        <img
          src={taskfiLogo}
          alt="TaskFi"
          className="ml-1 h-8 w-8 rounded-lg object-contain shadow-md shadow-[#4B3EEF]/20 shrink-0"
        />
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 md:left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
            <input
              type="text"
              placeholder="Search missions..."
              className="w-full rounded-xl border border-indigo-200/50 bg-white/80 backdrop-blur-sm py-2 md:py-3 pl-9 md:pl-11 pr-3 md:pr-4 text-sm outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Active Agents - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3 rounded-xl border border-indigo-200/50 bg-white/80 backdrop-blur-sm px-4 py-2">
            <Bot className="h-4 w-4 text-indigo-600" />
            <div>
              <p className="text-xs text-gray-500">Active Agents</p>
              <p className="text-sm font-bold text-[#1A1B25]">{agents.length}</p>
            </div>
            <span className="text-xs font-semibold text-green-600">Live</span>
          </div>

          {/* Wallet Connection - click to lock the embedded wallet */}
          <button
            onClick={lock}
            title="Lock wallet"
            className="flex items-center gap-2 md:gap-3 rounded-xl bg-gradient-to-r from-[#4B3EEF] to-[#4B3EEF]/80 px-3 md:px-5 py-2 md:py-3 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Wallet className="h-4 w-4 relative z-10" />
            <div className="text-left relative z-10 hidden sm:block">
              <p className="text-xs opacity-90">{networkLabel}</p>
              <p className="text-sm font-bold">{shortAddress}</p>
            </div>
            <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          </button>
        </div>
      </div>
    </header>
  );
}