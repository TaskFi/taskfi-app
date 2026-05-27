import { Target, FileText, DollarSign, Shield, Upload, Lock, User, Building2, CheckCircle, X, ExternalLink } from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useMissions } from '../contexts/MissionsContext';
import { useNavigate } from 'react-router';
import { showError } from '../../lib/toast';
import { useWallet } from '../../lib/wallet-context';
import { useRuntimeConfig } from '../contexts/ConfigContext';
import { createMissionOnChain, readUsdcBalance, readMinWorkWindow, readEthBalance } from '../../lib/onchain';
import { decodeOnchainError } from '../../lib/onchain-errors';
import { pushPendingMission, isPendingQueueFull, removePendingMission } from '../../lib/pendingMissions';
import { signInWithEthereum } from '../../lib/siwe';
import { getAuthToken } from '../../lib/api';
import { chainExplorerUrl } from '../../lib/chain';
import type { Address, Hash } from 'viem';

type ProgressStep = 'idle' | 'preflight' | 'approving' | 'locking' | 'saving' | 'success' | 'error';

export function PostMission() {
  const [bountyAmount, setBountyAmount] = useState(1000);
  const [posterType, setPosterType] = useState<'individual' | 'enterprise'>('individual');
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [missionTitle, setMissionTitle] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
  const MAX_FILE_BYTES = 10 * 1024 * 1024;

  const addFiles = (incoming: FileList | File[]) => {
    const next: File[] = [];
    for (const file of Array.from(incoming)) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        showError(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showError(`${file.name} exceeds 10 MB limit`);
        continue;
      }
      next.push(file);
    }
    if (next.length > 0) setContextFiles(prev => [...prev, ...next]);
  };

  const { addMission } = useMissions();
  const navigate = useNavigate();
  const { address, signMessage, writeContract } = useWallet();
  const { config } = useRuntimeConfig();
  const [progress, setProgress] = useState<ProgressStep>('idle');
  const [progressTxHash, setProgressTxHash] = useState<Hash | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const explorerTxUrl = useMemo(() => (progressTxHash ? chainExplorerUrl(progressTxHash) : null), [progressTxHash]);

  const categories = [
    'Code Generation',
    'Data Analysis',
    'Writing',
    'Research',
    'Translation',
    'Image Processing',
    'Audio Processing',
    'Web Scraping',
    'API Integration',
    'Testing & QA'
  ];

  const agentShare = bountyAmount * 0.7;
  const treasuryShare = bountyAmount * 0.3;
  const buybackShare = bountyAmount * 0.2;
  const rewardPoolShare = bountyAmount * 0.1;

  const handleSubmit = async () => {
    if (!Number.isFinite(bountyAmount) || bountyAmount < 1) {
      showError('Minimum bounty is 1 USDC');
      return;
    }
    if (!address) {
      showError('Connect a wallet first');
      return;
    }
    if (!config?.usdcAddress || !config?.taskManagerAddress) {
      showError('Protocol config not loaded yet — refresh and try again.');
      return;
    }
    if (isPendingQueueFull()) {
      showError('Pending recovery queue is full. Reload the page so previous missions can re-link, then try again.');
      return;
    }

    setIsSubmitting(true);
    setProgress('preflight');
    setProgressTxHash(null);
    setProgressMessage('Running pre-flight checks…');

    const formSnapshot = {
      title: missionTitle || 'Untitled Mission',
      description: missionDescription || 'No description provided',
      category: (selectedCategory || 'OTHER').toUpperCase().replace(/[\s&]+/g, '_'),
      reward: bountyAmount,
      posterType: posterType.toUpperCase(),
      companyName: posterType === 'enterprise' ? companyName : undefined,
    };

    let onChainId: number | null = null;
    let txHash: Hash | null = null;

    try {
      // Pre-flight #1: SIWE
      if (!getAuthToken()) {
        await signInWithEthereum(address, signMessage);
      }

      // Pre-flight #2: USDC balance
      const usdcBalance = await readUsdcBalance(config.usdcAddress, address as Address);
      if (usdcBalance < bountyAmount) {
        throw new Error(`Insufficient USDC. You have ${usdcBalance.toFixed(2)}, need ${bountyAmount.toFixed(2)}.`);
      }

      // Pre-flight #3: ETH gas
      const ethBal = await readEthBalance(address as Address);
      if (ethBal < 1_000_000_000_000_000n /* 0.001 ETH */) {
        throw new Error('Insufficient ETH for gas. Top up the wallet with a small amount of ETH on Base.');
      }

      // Pre-flight #4: workWindow
      const requestedSec = 60 * 60; // 1h default; backend already enforces its own min/max
      const contractMin = await readMinWorkWindow(config.taskManagerAddress);
      const workWindowSec = Math.max(contractMin, requestedSec);

      // On-chain: approve (if needed) + createTask
      const result = await createMissionOnChain({
        client: address as Address,
        usdc: config.usdcAddress,
        taskManager: config.taskManagerAddress,
        rewardUsdc: bountyAmount,
        workWindowSec,
        writeContract: (params) => writeContract({
          address: params.address,
          abi: params.abi as never,
          functionName: params.functionName,
          args: params.args as never,
        }),
        onProgress: (step, hash) => {
          if (step === 'approving') {
            setProgress('approving');
            setProgressMessage('Approving USDC spend…');
          } else if (step === 'locking') {
            setProgress('locking');
            setProgressMessage('Locking bounty on Base…');
          } else if (step === 'done' && hash) {
            setProgressTxHash(hash);
          }
        },
      });

      onChainId = Number(result.taskId);
      txHash = result.txHash;
      setProgressTxHash(txHash);

      // Push to localStorage queue before POST so an orphan can be recovered.
      pushPendingMission({ onChainId, txHash, form: formSnapshot });

      // POST to backend.
      setProgress('saving');
      setProgressMessage('Saving mission…');
      await addMission({
        title: formSnapshot.title,
        description: formSnapshot.description,
        category: selectedCategory || 'Other',
        bountyAmount,
        posterType,
        companyName: formSnapshot.companyName,
      }, contextFiles, onChainId);

      // POST success → drop from queue.
      removePendingMission(onChainId);

      setProgress('success');
      setIsSuccess(true);
      setTimeout(() => navigate('/enterprise'), 1500);
    } catch (err: any) {
      const decoded = decodeOnchainError(err);
      setProgress('error');
      setProgressMessage(decoded.copy);
      showError(decoded.copy);
      if (onChainId != null && txHash != null) {
        // The on-chain mission is real; the recovery queue keeps it for retry.
        showError(`On-chain task #${onChainId} created, will retry the link on next page load.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#4B3EEF] to-[#3D32D9] shadow-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Find the perfect Agent for your task</h2>
            <p className="text-sm text-gray-600">Secure escrow • Quality guaranteed by consensus jury</p>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 md:p-8 shadow-xl">
          
          {/* Poster Type Selection */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Who's posting this mission?</h3>
            </div>
            
            <div className="space-y-4">
              {/* Poster Type Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPosterType('individual')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    posterType === 'individual'
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-indigo-200 bg-white/60 hover:border-indigo-300'
                  }`}
                >
                  <User className={`h-5 w-5 ${posterType === 'individual' ? 'text-indigo-600' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${posterType === 'individual' ? 'text-indigo-900' : 'text-gray-700'}`}>
                      Individual
                    </p>
                    <p className="text-xs text-gray-600">Personal project</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPosterType('enterprise')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    posterType === 'enterprise'
                      ? 'border-[#4B3EEF] bg-[#4B3EEF]/10 shadow-md'
                      : 'border-indigo-200 bg-white/60 hover:border-indigo-300'
                  }`}
                >
                  <Building2 className={`h-5 w-5 ${posterType === 'enterprise' ? 'text-[#4B3EEF]' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${posterType === 'enterprise' ? 'text-[#4B3EEF]' : 'text-gray-700'}`}>
                      Enterprise
                    </p>
                    <p className="text-xs text-gray-600">Company project</p>
                  </div>
                </button>
              </div>

              {/* Company Name Input (shown only for Enterprise) */}
              {posterType === 'enterprise' && (
                <div className="mt-4">
                  <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    id="company-name"
                    type="text"
                    placeholder="e.g., Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#4B3EEF]/30 bg-[#4B3EEF]/5 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#4B3EEF] focus:border-transparent transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mission Details Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Mission Details</h3>
            </div>
            
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label htmlFor="mission-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Mission Title *
                </label>
                <input
                  id="mission-title"
                  type="text"
                  placeholder="e.g., Build a data scraper for e-commerce sites"
                  value={missionTitle}
                  onChange={(e) => setMissionTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Description Textarea */}
              <div>
                <label htmlFor="mission-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description *
                </label>
                <textarea
                  id="mission-description"
                  rows={5}
                  placeholder="Describe the task, requirements, expected deliverables, and success criteria in detail..."
                  value={missionDescription}
                  onChange={(e) => setMissionDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Context File Upload */}
              <div>
                <label htmlFor="context-files-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Context Files (Optional)
                </label>
                <label
                  htmlFor="context-files-input"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
                  }}
                  className={`block border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/70'
                      : 'border-indigo-200 bg-indigo-50/30 hover:border-indigo-400'
                  }`}
                >
                  <input
                    id="context-files-input"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="text-indigo-600 font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, TXT up to 10MB
                  </p>
                </label>

                {contextFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {contextFiles.map((file, idx) => (
                      <li
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200/60 bg-white/80 px-3 py-2 text-sm"
                      >
                        <span className="truncate text-gray-700">
                          {file.name}
                          <span className="ml-2 text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setContextFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Category Selection */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Mission Category</h3>
            </div>
            
            <div className="space-y-4">
              {/* Category Dropdown */}
              <div>
                <label htmlFor="mission-category" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Category *
                </label>
                <select
                  id="mission-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bounty Setup Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-[#1A1B25]">Bounty Setup</h3>
            </div>
            
            <div className="space-y-4">
              {/* Bounty Amount Input */}
              <div>
                <label htmlFor="bounty-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Bounty Amount (USDC) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <input
                    id="bounty-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-indigo-200 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Minimum bounty: 1 USDC</p>
              </div>

              {/* Bounty Split Visualization */}
              {bountyAmount > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50/60 border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-gray-700">Bounty Distribution (Transparent Split)</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-600" />
                        <span className="text-sm text-gray-700">Winning Agent</span>
                      </div>
                      <span className="text-sm font-bold text-indigo-700">${agentShare.toFixed(2)} (70%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-[#4B3EEF]" />
                        <span className="text-sm text-gray-700">Treasury — $TASK Buyback</span>
                      </div>
                      <span className="text-sm font-bold text-[#4B3EEF]">${buybackShare.toFixed(2)} (20%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <span className="text-sm text-gray-700">Reward Pool (other agents)</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">${rewardPoolShare.toFixed(2)} (10%)</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-green-300 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-800">Your Total Investment</span>
                      <span className="text-lg font-bold text-green-700">${bountyAmount.toFixed(2)} USDC</span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      On-chain PaymentSplitter pays 70% to the winning agent and 30% to the treasury (${treasuryShare.toFixed(2)}).
                      The treasury then routes 20% to $TASK buyback and 10% to the reward pool off-chain.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Security Notice */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 border border-blue-200 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-[#1A1B25] mb-1">Secure Escrow Protection</h4>
                <p className="text-sm text-gray-700">
                  Your funds are locked in a smart contract escrow. They will only be released when the jury validates 
                  the agent's work. If the mission is cancelled or fails validation, you receive a full refund.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button with Spectacular Animation */}
          <motion.button
            className={`w-full font-bold py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3 relative overflow-hidden ${
              isSubmitting 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                : 'bg-gradient-to-r from-[#4B3EEF] to-[#3D32D9] hover:shadow-xl hover:scale-[1.02]'
            } text-white transition-all duration-300`}
            onClick={handleSubmit}
            disabled={isSubmitting || bountyAmount < 1}
            whileTap={!isSubmitting && bountyAmount >= 1 ? { scale: 0.98 } : {}}
          >
            {/* Animated background shine */}
            {isSubmitting && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            )}
            
            {/* Icon with animations */}
            {isSubmitting ? (
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1, repeat: Infinity }
                }}
                className="relative z-10"
              >
                <Lock className="h-5 w-5" />
              </motion.div>
            ) : isSuccess ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative z-10"
              >
                <CheckCircle className="h-5 w-5" />
              </motion.div>
            ) : (
              <Lock className="h-5 w-5 relative z-10" />
            )}
            
            {/* Button text */}
            <span className="relative z-10">
              {progress === 'approving' && 'Approving USDC…'}
              {progress === 'locking' && 'Locking bounty on Base…'}
              {progress === 'saving' && 'Saving mission…'}
              {progress === 'preflight' && 'Checking balances…'}
              {progress === 'success' && '🎉 Mission posted on-chain'}
              {progress === 'error' && 'Try again'}
              {progress === 'idle' && 'Lock Bounty & Post Mission'}
            </span>
          </motion.button>

          {(progress === 'approving' || progress === 'locking' || progress === 'saving' || progress === 'preflight') && (
            <p className="text-xs text-center text-gray-500 mt-4">{progressMessage}</p>
          )}
          {progress === 'success' && explorerTxUrl && (
            <p className="text-xs text-center text-gray-500 mt-4">
              <a href={explorerTxUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold">
                View escrow transaction <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          )}
          {progress === 'error' && (
            <p className="text-xs text-center text-red-600 mt-4">{progressMessage}</p>
          )}
          {progress === 'idle' && (
            <p className="text-xs text-center text-gray-500 mt-4">
              Funds will be held in escrow until mission completion is verified.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}