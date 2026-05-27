import {
  english,
  generateMnemonic,
  mnemonicToAccount,
  privateKeyToAccount,
} from 'viem/accounts';
import type { Hex } from 'viem';

export const VAULT_KEY = 'synergy_wallet_vault';
const PBKDF2_ITERATIONS = 900_000;

// --- Helpers ---

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

// --- Web Crypto API (PBKDF2 + AES-GCM) ---

/**
 * crypto.subtle only exists in a "secure context" (HTTPS, or
 * localhost / 127.0.0.1). When served over plain HTTP on a network IP it is
 * undefined: throw a readable error rather than a cryptic
 * "Cannot read properties of undefined".
 */
function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Wallet encryption is unavailable: open the app over HTTPS or http://localhost (a secure context is required for the Web Crypto API).',
    );
  }
  return crypto.subtle;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await getSubtle().importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return getSubtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptData(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await getSubtle().encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data),
  );
  const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(encrypted), salt.length + iv.length);
  return uint8ToBase64(packed);
}

async function decryptData(encryptedBase64: string, password: string): Promise<string> {
  const raw = base64ToUint8(encryptedBase64);
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const ciphertext = raw.slice(28);
  const key = await deriveKey(password, salt);
  const decrypted = await getSubtle().decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

// --- Wallet operations ---

export interface WalletData {
  address: string;
  privateKey: Hex;
  mnemonic?: string;
}

export function createWallet(): WalletData {
  const mnemonic = generateMnemonic(english);
  const account = mnemonicToAccount(mnemonic);
  const hdKey = account.getHdKey();
  if (!hdKey.privateKey) throw new Error('Failed to derive private key');
  return {
    address: account.address,
    privateKey: bytesToHex(hdKey.privateKey),
    mnemonic,
  };
}

export function walletFromMnemonic(mnemonic: string): WalletData {
  const trimmed = mnemonic.trim();
  const account = mnemonicToAccount(trimmed);
  const hdKey = account.getHdKey();
  if (!hdKey.privateKey) throw new Error('Failed to derive private key');
  return {
    address: account.address,
    privateKey: bytesToHex(hdKey.privateKey),
    mnemonic: trimmed,
  };
}

export function walletFromPrivateKey(key: string): WalletData {
  const hex = (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(hex);
  return {
    address: account.address,
    privateKey: hex,
  };
}

export function getAccount(privateKey: Hex) {
  return privateKeyToAccount(privateKey);
}

// --- Vault (localStorage) ---

interface StoredVault {
  address: string;
  encryptedData: string;
}

export function hasStoredVault(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null;
}

export function getStoredAddress(): string | null {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredVault).address;
  } catch {
    return null;
  }
}

export async function saveVault(wallet: WalletData, password: string): Promise<void> {
  const payload = JSON.stringify({ privateKey: wallet.privateKey, mnemonic: wallet.mnemonic });
  const encryptedData = await encryptData(payload, password);
  const vault: StoredVault = { address: wallet.address, encryptedData };
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export async function unlockVault(password: string): Promise<WalletData> {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error('No wallet found');
  const vault: StoredVault = JSON.parse(raw);
  const decrypted = await decryptData(vault.encryptedData, password);
  const { privateKey, mnemonic } = JSON.parse(decrypted);

  // Verify address matches decrypted key (tamper detection)
  const account = privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== vault.address.toLowerCase()) {
    throw new Error('Vault integrity check failed: address mismatch');
  }

  return { address: account.address, privateKey, mnemonic };
}

export async function verifyVaultPassword(password: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return false;
    const vault: StoredVault = JSON.parse(raw);
    await decryptData(vault.encryptedData, password);
    return true;
  } catch {
    return false;
  }
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
}
