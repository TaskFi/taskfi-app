import type { Address } from 'viem';
import { getPublicClient, USDC_DECIMALS, TASK_DECIMALS } from './chain';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface TokenBalances {
  usdc: bigint | null;
  task: bigint | null;
}

/**
 * Read $TASK and USDC ERC-20 balances for the given wallet. Returns null
 * for a token when the read fails or the contract address is not known —
 * callers should display a dash rather than 0.
 *
 * The contract addresses are passed in (not hardcoded) so the dashboard can
 * follow whatever the backend `/api/public/config` returns at runtime.
 */
export async function getTokenBalances(
  wallet: Address,
  taskAddress: Address | null,
  usdcAddress: Address | null,
): Promise<TokenBalances> {
  const client = getPublicClient();
  if (!client) {
    return { usdc: null, task: null };
  }

  const [usdc, task] = await Promise.all([
    usdcAddress
      ? client
          .readContract({
            address: usdcAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet],
          })
          .catch(() => null)
      : Promise.resolve(null),
    taskAddress
      ? client
          .readContract({
            address: taskAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [wallet],
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    usdc: typeof usdc === 'bigint' ? usdc : null,
    task: typeof task === 'bigint' ? task : null,
  };
}

function formatUnits(raw: bigint, decimals: number, fractionDigits = 2): string {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const frac = raw % base;
  if (fractionDigits === 0) return whole.toLocaleString();
  const scaled = (frac * 10n ** BigInt(fractionDigits)) / base;
  return `${whole.toLocaleString()}.${scaled.toString().padStart(fractionDigits, '0')}`;
}

export function formatUsdc(raw: bigint | null): string {
  return raw == null ? '—' : `$${formatUnits(raw, USDC_DECIMALS, 2)}`;
}

export function formatTask(raw: bigint | null): string {
  return raw == null ? '—' : formatUnits(raw, TASK_DECIMALS, 2);
}
