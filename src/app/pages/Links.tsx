import { Link2, Twitter, FileText, Globe, Book, Users, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { showSuccess } from '../../lib/toast';

interface ChainConfig {
  chainId: number;
  usdcAddress: string;
  taskTokenAddress: string | null;
  taskManagerAddress: string | null;
  paymentSplitterAddress: string | null;
  stakingRegistryAddress: string | null;
  reputationEngineAddress: string | null;
  agentPassportAddress?: string | null;
}

const APP_URL = 'https://app.taskfi.xyz';
const DOCS_URL = 'https://gitbook.taskfi.xyz';

function explorerBase(chainId: number): string {
  return chainId === 84532 ? 'https://sepolia.basescan.org' : 'https://basescan.org';
}

function explorerAddress(chainId: number, address: string | null | undefined): string | null {
  if (!address) return null;
  return `${explorerBase(chainId)}/address/${address}`;
}

function shortAddress(address: string | null | undefined): string {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function Links() {
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public
      .config()
      .then((c) => {
        if (!cancelled) setConfig(c as ChainConfig);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      showSuccess(`${label} copied`);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const chainId = config?.chainId ?? 84532;
  const networkLabel = chainId === 84532 ? 'Base Sepolia (testnet)' : chainId === 8453 ? 'Base Mainnet' : `Chain ${chainId}`;

  const contracts: { label: string; address: string | null | undefined }[] = [
    { label: '$TASK Token', address: config?.taskTokenAddress },
    { label: 'TaskManager', address: config?.taskManagerAddress },
    { label: 'PaymentSplitter', address: config?.paymentSplitterAddress },
    { label: 'StakingRegistry', address: config?.stakingRegistryAddress },
    { label: 'ReputationEngine', address: config?.reputationEngineAddress },
    { label: 'AgentPassport', address: config?.agentPassportAddress },
  ];

  const linkCategories = [
    {
      title: 'Official Resources',
      icon: Globe,
      color: 'from-indigo-600 to-purple-600',
      bgColor: 'from-indigo-50 to-purple-50',
      borderColor: 'border-indigo-200',
      links: [
        { name: 'App', url: APP_URL, icon: Globe, description: 'Open the TaskFi dashboard' },
        { name: 'Documentation', url: DOCS_URL, icon: Book, description: 'Technical docs and concepts' },
      ],
    },
    {
      title: 'Community',
      icon: Users,
      color: 'from-blue-600 to-cyan-600',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      links: [
        { name: 'X (Twitter)', url: 'https://x.com/TaskFi_xyz', icon: Twitter, description: 'Updates and announcements' },
      ],
    },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <Link2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25]">Important Links</h2>
            <p className="text-sm text-gray-600">App, docs, contracts and community</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {linkCategories.map((category, idx) => {
          const CategoryIcon = category.icon;
          return (
            <div key={idx}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r ${category.color}`}>
                  <CategoryIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1B25]">{category.title}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.links.map((link, linkIdx) => {
                  const LinkIcon = link.icon;
                  return (
                    <a
                      key={linkIdx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-xl border ${category.borderColor} bg-gradient-to-r ${category.bgColor} backdrop-blur-md p-5 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] group`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-gray-200 group-hover:border-indigo-300 transition-colors">
                          <LinkIcon className="h-5 w-5 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#1A1B25] group-hover:text-indigo-700 transition-colors mb-1">
                            {link.name}
                          </h4>
                          <p className="text-sm text-gray-600">{link.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                        <span>Visit</span>
                        <svg className="h-3 w-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-bold text-[#1A1B25] mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          On-chain Contracts
        </h3>
        <div className="rounded-xl border border-indigo-200/40 bg-white/80 backdrop-blur-md p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-600">Network</p>
            <p className="text-sm font-bold text-[#1A1B25]">{networkLabel}</p>
          </div>
          <div className="space-y-2">
            {contracts.map(({ label, address }) => {
              const explorerUrl = explorerAddress(chainId, address);
              return (
                <div
                  key={label}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#1A1B25] min-w-[140px]">{label}</span>
                    <code className="text-xs font-mono text-gray-700 break-all">{address ?? 'not deployed'}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    {address && (
                      <button
                        onClick={() => copy(label, address)}
                        className="px-2.5 py-1 rounded-md bg-white border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                        type="button"
                      >
                        {copied === label ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {shortAddress(address)}
                      </button>
                    )}
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Explorer
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
