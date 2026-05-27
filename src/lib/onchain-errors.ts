/**
 * Map viem's `ContractFunctionRevertedError` (and any other thrown error
 * shape we see from `writeContract` / `readContract`) to user-facing copy.
 *
 * Two flavors of revert exist on our contracts:
 *  - OpenZeppelin custom errors (selector-based). We match by the first
 *    4 bytes of `keccak256("Name(types...)")`. Example: `EnforcedPause()`
 *    = `0xd93c0665`.
 *  - Legacy `require(cond, "string")`. We match by substring on the error
 *    message string.
 *
 * Anything we don't recognize falls through to a generic "Transaction
 * reverted" toast — the raw error is still available in the dev console
 * for triage.
 */

const SELECTOR_TO_COPY: Record<string, string> = {
  '0xd93c0665': 'Protocol is paused. Try again later.',
};

const REQUIRE_STRING_TO_COPY: Array<{ match: string; copy: string }> = [
  { match: 'Reward too low', copy: 'Bounty must be at least 1 USDC.' },
  { match: 'Work window too long', copy: 'Work window cannot exceed 30 days.' },
  // The contract message is stale ("Min 24h work window") but the actual
  // minimum is the contract's `minWorkWindow` state var. User-facing copy
  // stays accurate.
  { match: 'Min 24h work window', copy: 'Work window too short. Try a longer deadline.' },
  { match: 'Below minimum tier', copy: 'Stake must be at least the Tier 1 amount.' },
  { match: 'Already staking', copy: 'This wallet already has an active stake.' },
  { match: 'Cooldown after unstake', copy: 'Cooldown is active. Try again later.' },
  { match: 'Passport exists', copy: 'You already have a passport.' },
  { match: 'No passport', copy: 'This wallet does not yet hold an Agent Passport.' },
  { match: 'insufficient funds', copy: 'Insufficient ETH for gas. Top up your wallet.' },
  { match: 'transfer amount exceeds balance', copy: 'Insufficient token balance for this transfer.' },
  { match: 'ERC20InsufficientAllowance', copy: 'Token allowance too low — approve again.' },
];

interface DecodedRevert {
  copy: string;
  raw: string;
}

/**
 * Decode a thrown error (from viem, fetch, or anywhere) into user-facing copy.
 * Always returns something — never null.
 */
export function decodeOnchainError(err: unknown): DecodedRevert {
  const raw = extractMessage(err);

  // Try selector match first (custom errors).
  const selector = extractSelector(err);
  if (selector && SELECTOR_TO_COPY[selector]) {
    return { copy: SELECTOR_TO_COPY[selector], raw };
  }

  // Fall back to require-string substring match.
  for (const { match, copy } of REQUIRE_STRING_TO_COPY) {
    if (raw.includes(match)) return { copy, raw };
  }

  // Generic fallback.
  if (selector) return { copy: `Transaction reverted (${selector}).`, raw };
  return { copy: raw.length > 0 ? raw : 'Transaction failed.', raw };
}

function extractMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  const e = err as Record<string, unknown>;
  const candidates = [
    e.shortMessage,
    (e.cause as Record<string, unknown> | undefined)?.shortMessage,
    (e.cause as Record<string, unknown> | undefined)?.reason,
    e.message,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }
  try {
    return String(err);
  } catch {
    return 'Unknown error.';
  }
}

function extractSelector(err: unknown): string | null {
  if (!err) return null;
  const e = err as Record<string, unknown>;
  const data = (e.cause as Record<string, unknown> | undefined)?.data ?? e.data;
  if (typeof data === 'string' && data.startsWith('0x') && data.length >= 10) {
    return data.slice(0, 10).toLowerCase();
  }
  return null;
}
