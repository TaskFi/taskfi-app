import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  createWallet,
  walletFromMnemonic,
  walletFromPrivateKey,
  getAccount,
  hasStoredVault,
  getStoredAddress,
  saveVault,
  unlockVault,
  clearVault,
  verifyVaultPassword,
  VAULT_KEY,
  type WalletData,
} from './wallet';
import { setAuthToken } from './api';
import { chain } from './chain';
import { createWalletClient, http, type Hex, type WriteContractParameters, type Hash } from 'viem';

const RPC_URL = (import.meta.env.VITE_CHAIN_ID === '8453'
  ? (import.meta.env.VITE_RPC_URL_BASE_MAINNET as string | undefined)
  : (import.meta.env.VITE_RPC_URL_BASE_SEPOLIA as string | undefined));

type WriteContractInput = Omit<WriteContractParameters, 'account' | 'chain'>;

const AUTO_LOCK_MS = 15 * 60 * 1000; // 15 minutes

interface WalletContextValue {
  hasWallet: boolean;
  isUnlocked: boolean;
  pendingSetup: boolean;
  address: string | null;
  create: (password: string) => Promise<WalletData>;
  completeSetup: (password: string) => Promise<void>;
  importFromMnemonic: (mnemonic: string, password: string) => Promise<void>;
  importFromPrivateKey: (key: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  deleteWallet: () => void;
  signMessage: (message: string) => Promise<string>;
  writeContract: (params: WriteContractInput) => Promise<Hash>;
  getPrivateKey: () => Hex | null;
  getMnemonic: () => string | null;
  verifyPassword: (password: string) => Promise<boolean>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [hasWalletState, setHasWallet] = useState(hasStoredVault());
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [pendingSetup, setPendingSetup] = useState(false);

  const isUnlocked = walletData !== null;
  const address = walletData?.address ?? getStoredAddress();

  // --- Lock: single function used by both manual lock and auto-lock ---
  const lock = useCallback(() => {
    setWalletData(null);
    setAuthToken(null);
  }, []);

  // --- Auto-lock after inactivity ---
  useEffect(() => {
    if (!walletData) return;

    let timeout: ReturnType<typeof setTimeout>;
    function resetTimer() {
      clearTimeout(timeout);
      timeout = setTimeout(lock, AUTO_LOCK_MS);
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(timeout);
    };
  }, [walletData, lock]);

  // --- Multi-tab sync: detect vault changes from other tabs ---
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key !== VAULT_KEY) return;

      if (!e.newValue) {
        // Vault deleted in another tab
        setWalletData(null);
        setHasWallet(false);
        setPendingSetup(false);
        setAuthToken(null);
      } else {
        // Vault changed/created in another tab — lock to force re-auth
        setHasWallet(true);
        setWalletData(null);
        setAuthToken(null);
      }
    }
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- Create: saves vault but does NOT unlock (wait for seed confirmation) ---
  const create = useCallback(async (password: string): Promise<WalletData> => {
    const wallet = createWallet();
    await saveVault(wallet, password);
    setHasWallet(true);
    setPendingSetup(true);
    return wallet;
  }, []);

  // --- Called after user confirms seed phrase ---
  const completeSetup = useCallback(async (password: string) => {
    const wallet = await unlockVault(password);
    setWalletData(wallet);
    setPendingSetup(false);
  }, []);

  const importFromMnemonic = useCallback(async (mnemonic: string, password: string) => {
    const wallet = walletFromMnemonic(mnemonic);
    await saveVault(wallet, password);
    setWalletData(wallet);
    setHasWallet(true);
  }, []);

  const importFromPrivateKey = useCallback(async (key: string, password: string) => {
    const wallet = walletFromPrivateKey(key);
    await saveVault(wallet, password);
    setWalletData(wallet);
    setHasWallet(true);
  }, []);

  const unlock = useCallback(async (password: string) => {
    const wallet = await unlockVault(password);
    setWalletData(wallet);
  }, []);

  const deleteWallet = useCallback(() => {
    clearVault();
    setWalletData(null);
    setHasWallet(false);
    setPendingSetup(false);
    setAuthToken(null);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletData) throw new Error('Wallet is locked');
    const account = getAccount(walletData.privateKey);
    return account.signMessage({ message });
  }, [walletData]);

  const writeContract = useCallback(async (params: WriteContractInput): Promise<Hash> => {
    if (!walletData) throw new Error('Wallet is locked');
    if (!RPC_URL) throw new Error('RPC endpoint not configured for this build');
    const account = getAccount(walletData.privateKey);
    const client = createWalletClient({ account, chain, transport: http(RPC_URL) });
    return client.writeContract({ ...params, account, chain });
  }, [walletData]);

  const getPrivateKey = useCallback(() => walletData?.privateKey ?? null, [walletData]);
  const getMnemonic = useCallback(() => walletData?.mnemonic ?? null, [walletData]);
  const verifyPassword = useCallback((password: string) => verifyVaultPassword(password), []);

  return (
    <WalletContext.Provider value={{
      hasWallet: hasWalletState,
      isUnlocked,
      pendingSetup,
      address,
      create,
      completeSetup,
      importFromMnemonic,
      importFromPrivateKey,
      unlock,
      lock,
      deleteWallet,
      signMessage,
      writeContract,
      getPrivateKey,
      getMnemonic,
      verifyPassword,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
