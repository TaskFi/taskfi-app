import { createPublicClient, http, type Address, type PublicClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';

/**
 * Chain + RPC selection for the dashboard.
 *
 * VITE_CHAIN_ID drives which chain we read from at build time:
 *   8453   -> Base mainnet
 *   84532  -> Base Sepolia testnet (default)
 *
 * The RPC URL for the selected chain comes from VITE_RPC_URL_BASE_MAINNET or
 * VITE_RPC_URL_BASE_SEPOLIA. Both end up in the public JS bundle (Vite inlines
 * all VITE_* vars), so a QuickNode endpoint here is callable by anyone who
 * loads the page. Quota abuse is the real risk; restricting the endpoint via
 * referrer + method allowlists in the QuickNode dashboard is recommended but
 * not enforced by this code.
 *
 * Contract addresses (TASK token, passport, …) are NOT in the build env —
 * they come from the backend at runtime via /api/public/config, so flipping
 * a deployment (dev fork redeploy, mainnet rollout) only requires a backend
 * .env edit, no front rebuild.
 */

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || '84532');

export const chain = CHAIN_ID === 8453 ? base : baseSepolia;
export const isMainnet = CHAIN_ID === 8453;

const RPC_URL = isMainnet
  ? (import.meta.env.VITE_RPC_URL_BASE_MAINNET as string | undefined)
  : (import.meta.env.VITE_RPC_URL_BASE_SEPOLIA as string | undefined);

let cachedClient: PublicClient | null = null;

/**
 * Returns a viem PublicClient bound to the active chain. Lazily constructed
 * so we only allocate when a page actually reads chain state.
 * Returns null when the RPC URL is not configured — callers should treat
 * that as "chain reads unavailable, fall back to backend".
 */
export function getPublicClient(): PublicClient | null {
  if (!RPC_URL) return null;
  if (!cachedClient) {
    cachedClient = createPublicClient({ chain, transport: http(RPC_URL) });
  }
  return cachedClient;
}

export const USDC_DECIMALS = 6;
export const TASK_DECIMALS = 18;

export type TokenAddress = Address | null;

export const chainExplorerUrl = (addressOrTx: string): string => {
  const baseUrl = isMainnet ? 'https://basescan.org' : 'https://sepolia.basescan.org';
  const path = addressOrTx.length === 66 ? 'tx' : 'address';
  return `${baseUrl}/${path}/${addressOrTx}`;
};
