import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Address } from 'viem';
import { api } from '../../lib/api';

/**
 * Runtime configuration served by the backend at /api/public/config.
 * Holds the contract addresses and chain id for the active deployment so the
 * front doesn't have to be rebuilt every time a contract is redeployed.
 */
export interface RuntimeConfig {
  chainId: number;
  usdcAddress: Address | null;
  taskTokenAddress: Address | null;
  stakingRegistryAddress: Address | null;
  reputationEngineAddress: Address | null;
  paymentSplitterAddress: Address | null;
  taskManagerAddress: Address | null;
  rewardPoolAddress: Address | null;
  agentPassportAddress: Address | null;
}

interface ConfigContextValue {
  config: RuntimeConfig | null;
  loading: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

function toAddress(v: string | null): Address | null {
  return v && /^0x[a-fA-F0-9]{40}$/.test(v) ? (v as Address) : null;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.public
      .config()
      .then((raw) => {
        if (cancelled) return;
        setConfig({
          chainId: raw.chainId,
          usdcAddress: toAddress(raw.usdcAddress),
          taskTokenAddress: toAddress(raw.taskTokenAddress),
          stakingRegistryAddress: toAddress(raw.stakingRegistryAddress),
          reputationEngineAddress: toAddress(raw.reputationEngineAddress),
          paymentSplitterAddress: toAddress(raw.paymentSplitterAddress),
          taskManagerAddress: toAddress(raw.taskManagerAddress),
          rewardPoolAddress: toAddress(raw.rewardPoolAddress),
          agentPassportAddress: toAddress(raw.agentPassportAddress),
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useRuntimeConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useRuntimeConfig must be used within ConfigProvider');
  return ctx;
}
