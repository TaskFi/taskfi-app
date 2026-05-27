/**
 * Orphan reconciliation queue.
 *
 * When the dashboard succeeds at locking USDC + creating the on-chain task
 * but then the POST /api/missions request fails (network, 5xx, etc.), the
 * on-chain task exists with no DB row. The user's escrow is real but
 * invisible to the app.
 *
 * We persist the {onChainId, txHash, form data} to localStorage and drain
 * the queue at every MissionsProvider mount via the backend's
 * /api/missions/link-orphan endpoint.
 */

const STORAGE_KEY = 'taskfi.pending-link';
export const MAX_QUEUE_SIZE = 10;
export const MAX_ATTEMPTS_PER_ITEM = 5;

export interface PendingMissionForm {
  title: string;
  description: string;
  category: string;
  reward: number;
  posterType: string;
  companyName?: string;
}

export interface PendingMission {
  onChainId: number;
  txHash: string;
  form: PendingMissionForm;
  attemptCount: number;
  firstSeenAt: number;
}

function readAll(): PendingMission[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}

function writeAll(items: PendingMission[]): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* localStorage quota, private mode, etc. */
  }
}

function isValid(x: unknown): x is PendingMission {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.onChainId === 'number' &&
    typeof r.txHash === 'string' &&
    typeof r.attemptCount === 'number' &&
    typeof r.firstSeenAt === 'number' &&
    typeof r.form === 'object' &&
    r.form !== null
  );
}

export function listPendingMissions(): PendingMission[] {
  return readAll();
}

export function pendingQueueSize(): number {
  return readAll().length;
}

export function isPendingQueueFull(): boolean {
  return readAll().length >= MAX_QUEUE_SIZE;
}

/**
 * Push a pending mission to the queue. Returns false if the queue is full.
 */
export function pushPendingMission(entry: Omit<PendingMission, 'attemptCount' | 'firstSeenAt'>): boolean {
  const items = readAll();
  if (items.length >= MAX_QUEUE_SIZE) return false;
  if (items.some((it) => it.onChainId === entry.onChainId)) return true; // already queued
  items.push({ ...entry, attemptCount: 0, firstSeenAt: Date.now() });
  writeAll(items);
  return true;
}

export function removePendingMission(onChainId: number): void {
  const items = readAll().filter((it) => it.onChainId !== onChainId);
  writeAll(items);
}

/**
 * Increment attempt counter. Returns true if the item is still retriable,
 * false if it should be considered permanently failed (caller decides what
 * to do with the user-facing notice).
 */
export function bumpAttempt(onChainId: number): boolean {
  const items = readAll();
  const idx = items.findIndex((it) => it.onChainId === onChainId);
  if (idx === -1) return false;
  items[idx].attemptCount += 1;
  writeAll(items);
  return items[idx].attemptCount < MAX_ATTEMPTS_PER_ITEM;
}
