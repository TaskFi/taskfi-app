import { Store, Bot, History, TrendingUp, Vote, Plus, Sparkles, LayoutDashboard, Users, Zap, User, BookOpen, Settings, Link2 } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import taskfiLogo from '@/imports/logo_taskfi.png';

// Navigation items configuration
const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/' },
  { icon: Store, label: 'Marketplace', path: '/marketplace' },
];

const agentItems = [
  { icon: Zap, label: 'Agent Hub', path: '/agent-center' },
  { icon: TrendingUp, label: 'Staking & Rewards', path: '/staking' },
];

const enterpriseItems = [
  { icon: Users, label: 'Mission Control', path: '/enterprise' },
];

const accountItems = [
  { icon: User, label: 'My Account', path: '/account' },
  { icon: Link2, label: 'Links', path: '/links' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-indigo-200/30 bg-white/60 backdrop-blur-xl p-6">
      {/* Logo */}
      <div className="mb-4 flex items-center gap-0">
        <img src={taskfiLogo} alt="TaskFi Logo" className="h-10 w-10 -mr-1" />
        <h1 className="text-2xl font-bold text-[#1A1B25]">TaskFi</h1>
      </div>

      {/* Primary Action Buttons */}
      <div className="space-y-3 mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          Agentic Economy
        </div>
        
        {/* Post a Mission - For Enterprises */}
        <Link
          to="/post-mission"
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4B3EEF] to-[#4B3EEF]/80 px-4 py-4 text-white font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform relative z-10" />
          <span className="relative z-10">Post a Mission</span>
        </Link>

        {/* Create Agent - For Builders */}
        <Link
          to="/create-agent"
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-[#EBEAFE] bg-gradient-to-r from-[#EBEAFE]/30 to-transparent px-4 py-4 text-[#1A1B25] font-bold hover:bg-[#EBEAFE]/50 transition-all hover:scale-105 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/0 via-indigo-100/50 to-indigo-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Sparkles className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform relative z-10" />
          <span className="relative z-10">Create Agent</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 mb-8">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#EBEAFE] to-[#EBEAFE]/50 text-[#1A1B25] shadow-sm'
                  : 'text-gray-600 hover:bg-[#EBEAFE]/30'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* For Agents Section */}
      <div className="mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          For Agents
        </div>
        <nav className="space-y-2">
          {agentItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-100 to-indigo-300 text-[#1A1B25] shadow-sm'
                    : 'text-gray-600 hover:bg-indigo-50/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* For Enterprises Section */}
      <div className="mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          For Enterprises
        </div>
        <nav className="space-y-2">
          {enterpriseItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4B3EEF]/20 to-[#3D32D9]/10 text-[#1A1B25] shadow-sm'
                    : 'text-gray-600 hover:bg-[#4B3EEF]/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Account Section */}
      <div className="mb-8">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
          Account
        </div>
        <nav className="space-y-2">
          {accountItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-100 to-indigo-300 text-[#1A1B25] shadow-sm'
                    : 'text-gray-600 hover:bg-indigo-50/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}