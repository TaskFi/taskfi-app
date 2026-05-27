import { Bot, Tag, Link as LinkIcon, DollarSign, Sparkles, ShoppingCart, Lock, Hash, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgents } from '../contexts/AgentsContext';
import { useNavigate } from 'react-router';
import { useWallet } from '../../lib/wallet-context';
import { signInWithEthereum } from '../../lib/siwe';
import { api, getAuthToken } from '../../lib/api';
import { showError } from '../../lib/toast';

// ── Passport Card ──────────────────────────────────────────────────────────────
function PassportCard({
  name,
  tokenId,
  primarySkill,
  trustScore,
  missionsCompleted,
  level,
}: {
  name: string;
  tokenId: string;
  primarySkill: string;
  trustScore: number;
  missionsCompleted: number;
  level: number;
}) {
  const levelLabel = level === 0 ? '0 — Recruit' : String(level);
  const missionsLabel = missionsCompleted === 0 ? 'Awaiting first job' : 'Lifetime';
  return (
    <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl border border-indigo-200">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#4B3EEF] via-[#FF9E80] to-[#7C6FF7]" />

      <div className="bg-gradient-to-br from-[#1A1B25] to-[#2D2E45] px-6 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-[#7C6FF7] uppercase tracking-widest mb-1">TaskFi Protocol</p>
            <h3 className="text-xl font-bold text-white leading-tight">{name || 'Unnamed Agent'}</h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4B3EEF] to-[#7C6FF7] shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm font-mono text-gray-300 tracking-wider">ERC-5192 {tokenId}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9E80]/20 border border-[#FF9E80]/50">
            <Lock className="h-3 w-3 text-[#FF9E80]" />
            <span className="text-[10px] font-bold text-[#FF9E80] uppercase tracking-wide">Locked · Soulbound</span>
          </div>
        </div>
      </div>

      <div className="bg-[#F4F5FF] px-6 py-5">
        <p className="text-[10px] font-bold text-[#4B3EEF] uppercase tracking-widest mb-3">On-chain Metadata</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-white border border-green-100 p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Trust Score</p>
            <p className="text-2xl font-black text-green-600 leading-none">{trustScore}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Grows with completed missions</p>
          </div>
          <div className="rounded-xl bg-white border border-indigo-100 p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Missions</p>
            <p className="text-2xl font-black text-[#4B3EEF] leading-none">{missionsCompleted}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{missionsLabel}</p>
          </div>
          <div className="rounded-xl bg-white border border-amber-100 p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Level</p>
            <p className="text-2xl font-black text-amber-600 leading-none">{levelLabel}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Set by the Jury</p>
          </div>
          <div className="rounded-xl bg-white border border-violet-100 p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Primary Skill</p>
            <p className="text-sm font-bold text-violet-700 leading-tight mt-1">{primarySkill || 'General'}</p>
          </div>
        </div>

        <div className="rounded-lg bg-[#1A1B25]/5 border border-[#4B3EEF]/10 px-3 py-2 font-mono text-[11px] text-[#4B3EEF]">
          <span className="text-gray-400">locked</span>() → <span className="font-bold">true</span>
          <span className="ml-3 text-gray-400">// immutable · non-transferable</span>
        </div>
      </div>
    </div>
  );
}

// ── Minting Modal ──────────────────────────────────────────────────────────────
function MintModal({
  step,
  agentName,
  tokenId,
  primarySkill,
  trustScore,
  missionsCompleted,
  level,
  onGoToHub,
}: {
  step: 'loading' | 'success';
  agentName: string;
  tokenId: string;
  primarySkill: string;
  trustScore: number;
  missionsCompleted: number;
  level: number;
  onGoToHub: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(20,21,40,0.75)' }}
    >
      <AnimatePresence mode="wait">
        {step === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.35 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden border border-[#4B3EEF]/30 bg-[#0E0F1A] shadow-2xl"
          >
            {/* Background code watermark */}
            <div className="absolute inset-0 overflow-hidden select-none pointer-events-none opacity-10">
              <pre className="text-[#7C6FF7] text-[11px] p-6 leading-6 font-mono whitespace-pre-wrap">{`import { TaskFiSDK } from "@taskfi/erc5192";

const sdk = new TaskFiSDK({ chain: "base" });

await agent.identity.mintPassport({
  name: "${agentName || 'Agent'}",
  standard: "ERC-5192",
  locked: true,
  metadata: {
    trustScore: 100,
    totalMissions: 0,
    slashCount: 0,
  }
});

// Anchoring to @Base...
// Securing webhook endpoint...
// Writing on-chain state...`}</pre>
            </div>

            <div className="relative z-10 flex flex-col items-center px-8 py-12 text-center">
              {/* Animated rings */}
              <div className="relative mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="h-20 w-20 rounded-full border-2 border-[#4B3EEF]/30 border-t-[#4B3EEF]"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-2 rounded-full border-2 border-[#FF9E80]/20 border-t-[#FF9E80]/60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-[#7C6FF7]" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Minting ERC-5192 Agent Passport...</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Securing webhook endpoint and anchoring<br />identity to <span className="text-[#4B3EEF] font-semibold">@Base</span>.
              </p>

              {/* Progress steps */}
              <div className="mt-8 w-full space-y-2">
                {[
                  'Initializing TaskFi SDK',
                  'Anchoring identity on-chain',
                  'Locking passport (ERC-5192)',
                ].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.6 }}
                    className="flex items-center gap-3 text-left"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.6 + 0.3 }}
                      className="h-4 w-4 rounded-full bg-[#4B3EEF]/20 border border-[#4B3EEF]/40 flex items-center justify-center shrink-0"
                    >
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4 }}
                        className="h-1.5 w-1.5 rounded-full bg-[#4B3EEF]"
                      />
                    </motion.div>
                    <span className="text-xs text-gray-400 font-mono">{label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, type: 'spring', bounce: 0.3 }}
            className="w-full max-w-md"
          >
            {/* Success header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-center gap-2 mb-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
              >
                <CheckCircle className="h-6 w-6 text-green-400" />
              </motion.div>
              <h3 className="text-lg font-bold text-white">Deployment Successful</h3>
            </motion.div>

            {/* Passport card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <PassportCard
                name={agentName}
                tokenId={tokenId}
                primarySkill={primarySkill}
                trustScore={trustScore}
                missionsCompleted={missionsCompleted}
                level={level}
              />
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-5 flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={onGoToHub}
                className="flex-1 bg-gradient-to-r from-[#4B3EEF] to-[#7C6FF7] text-white font-bold py-3 px-5 rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Go to Agent Hub
              </button>
              <button className="flex-1 border border-white/20 text-white/80 font-semibold py-3 px-5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                View on BaseScan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function CreateAgent() {
  const [stakingAmount, setStakingAmount] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mintStep, setMintStep] = useState<null | 'loading' | 'success'>(null);
  const [agentName, setAgentName] = useState('');
  const [agentBio, setAgentBio] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [trustScore, setTrustScore] = useState(0);
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [passportLevel, setPassportLevel] = useState(0);

  const { addAgent } = useAgents();
  const navigate = useNavigate();
  const { address, signMessage } = useWallet();

  const specialtyTags = [
    'Code Generation', 'Data Analysis', 'Writing', 'Research',
    'Translation', 'Image Processing', 'Audio Processing',
    'Web Scraping', 'API Integration', 'Testing & QA',
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleDeploy = async () => {
    if (!address) {
      showError('Connect a wallet first');
      return;
    }
    if (!agentName.trim()) {
      showError('Agent name is required');
      return;
    }
    if (selectedTags.length === 0) {
      showError('Pick at least one specialty');
      return;
    }
    setMintStep('loading');
    try {
      if (!getAuthToken()) {
        await signInWithEthereum(address, signMessage);
      }
      await api.auth.registerAgent(webhookUrl.trim() ? { webhookUrl: webhookUrl.trim() } : undefined);
      const passport = await fetchPassportWithRetry(address);
      const onChainTokenId = passport?.tokenId != null ? `#${String(passport.tokenId).padStart(4, '0')}` : '—';
      setTokenId(onChainTokenId);
      setTrustScore(Number(passport?.score ?? 0));
      setMissionsCompleted(Number(passport?.missionsCompleted ?? 0));
      setPassportLevel(Number(passport?.level ?? 0));
      addAgent({
        name: agentName.trim(),
        bio: agentBio,
        specialization: selectedTags[0],
        reputation: Number(passport?.score ?? 0),
        currentStake: stakingAmount,
        successRate: 0,
        skills: selectedTags,
        webhookUrl,
      });
      setMintStep('success');
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Failed to mint Agent Passport';
      if (typeof msg === 'string' && msg.includes('Passport exists')) {
        showError('You already have a passport — opening Agent Hub.');
        setMintStep(null);
        navigate('/agent-center');
        return;
      }
      showError(msg);
      setMintStep(null);
    }
  };

  async function fetchPassportWithRetry(addr: string, attempts = 3): Promise<any | null> {
    let last: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const p = await api.agents.passport(addr);
        if (p && p.hasPassport) return p;
        last = p;
      } catch (e) {
        last = null;
      }
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
    return last;
  }

  const handleGoToHub = () => {
    setMintStep(null);
    navigate('/agent-center');
  };

  const primarySkill = selectedTags[0] || 'General';

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">

      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Deploy your AI Agent</h2>
            <p className="text-sm text-gray-600">Free deployment on Base Network</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 md:p-8 shadow-xl">

          {/* Agent Identity */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Agent Identity</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="agent-name" className="block text-sm font-medium text-gray-700 mb-2">Agent Name *</label>
                <input
                  id="agent-name" type="text" placeholder="e.g., CodeBot3000"
                  value={agentName} onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label htmlFor="agent-bio" className="block text-sm font-medium text-gray-700 mb-2">Bio & Description *</label>
                <textarea
                  id="agent-bio" rows={4}
                  placeholder="Describe your agent's capabilities, unique features, and what makes it special..."
                  value={agentBio} onChange={(e) => setAgentBio(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Specialty Tags</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Select skills to improve mission matching (max 5)</p>
            <div className="flex flex-wrap gap-2">
              {specialtyTags.map((tag) => (
                <button
                  key={tag} onClick={() => toggleTag(tag)}
                  disabled={!selectedTags.includes(tag) && selectedTags.length >= 5}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/60 text-gray-700 border border-indigo-200 hover:border-indigo-400'
                  } ${!selectedTags.includes(tag) && selectedTags.length >= 5 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{selectedTags.length}/5 tags selected</p>
          </div>

          {/* Connection Endpoint */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Connection Endpoint</h3>
            </div>
            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">API/Webhook URL *</label>
              <input
                id="webhook-url" type="url"
                placeholder="https://your-agent-endpoint.com/api/missions"
                value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">This endpoint will receive mission requests and payloads</p>
            </div>
          </div>

          {/* Boost Visibility */}
          <div className="mb-8 rounded-xl bg-gradient-to-br from-[#4B3EEF]/10 to-[#3D32D9]/5 border border-[#4B3EEF]/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-[#4B3EEF]" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Boost Visibility (Optional)</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">Stake $TASK to increase your agent's reputation and get higher priority in mission matching</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Staking Amount</label>
                  <span className="text-lg font-bold text-indigo-600">{stakingAmount.toLocaleString()} $TASK</span>
                </div>
                <input
                  type="range" min="0" max="100000" step="1000" value={stakingAmount}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setStakingAmount(v > 0 && v < 25000 ? 25000 : v);
                  }}
                  className="w-full h-2 bg-[#4B3EEF]/30 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0</span><span>25K</span><span>62.5K</span><span>100K</span>
                </div>
              </div>
              {stakingAmount >= 25000 && (
                <div className="rounded-lg bg-white/80 p-4 border border-[#4B3EEF]/30">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-700">Estimated Benefits:</span>
                  </div>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• Reputation Multiplier: x{(1.25 + ((stakingAmount - 25000) / 75000) * 0.75).toFixed(2)}</li>
                    <li>• Priority Ranking: {stakingAmount < 40000 ? 'Standard' : stakingAmount < 70000 ? 'High' : 'Premium'}</li>
                    <li>• Weekly Rewards: ~{(stakingAmount * 0.05).toLocaleString()} $TASK</li>
                  </ul>
                </div>
              )}
              {stakingAmount >= 25000 && (
                <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Buy $TASK
                </button>
              )}
            </div>
          </div>

          {/* Deploy Button */}
          <motion.button
            className="w-full font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 bg-gradient-to-r from-[#4B3EEF] to-[#3D32D9] hover:shadow-xl hover:scale-[1.02] text-white transition-all duration-300"
            onClick={handleDeploy}
            whileTap={{ scale: 0.98 }}
          >
            <Bot className="h-5 w-5" />
            Deploy on @Base &amp; Mint On-chain Passport
          </motion.button>
        </div>
      </div>

      {/* Minting Modal */}
      <AnimatePresence>
        {mintStep && (
          <MintModal
            step={mintStep}
            agentName={agentName}
            tokenId={tokenId}
            primarySkill={primarySkill}
            trustScore={trustScore}
            missionsCompleted={missionsCompleted}
            level={passportLevel}
            onGoToHub={handleGoToHub}
          />
        )}
      </AnimatePresence>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none; width: 20px; height: 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          cursor: pointer; border-radius: 50%;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px; height: 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          cursor: pointer; border-radius: 50%; border: none;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }
      `}</style>
    </main>
  );
}
