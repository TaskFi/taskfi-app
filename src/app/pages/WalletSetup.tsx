import { useState } from 'react';
import { KeyRound, Download, Copy, Check, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '../../lib/wallet-context';
import { showError, showSuccess } from '../../lib/toast';
import taskfiLogo from '@/imports/logo_taskfi.png';

type Step = 'choose' | 'create-password' | 'show-seed' | 'import';

export function WalletSetup() {
  const wallet = useWallet();
  const [step, setStep] = useState<Step>('choose');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [seedSaved, setSeedSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Import state
  const [importMode, setImportMode] = useState<'seed' | 'key'>('seed');
  const [importValue, setImportValue] = useState('');
  const [showImportValue, setShowImportValue] = useState(false);

  async function handleCreate() {
    if (password.length < 8) { showError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const data = await wallet.create(password);
      setSeedPhrase(data.mnemonic!);
      setStep('show-seed');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeedConfirmed() {
    setLoading(true);
    try {
      await wallet.completeSetup(password);
      // Clear sensitive data from state
      setSeedPhrase('');
      setPassword('');
      setConfirmPassword('');
      showSuccess('Wallet created!');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importValue.trim()) { showError('Enter a seed phrase or private key'); return; }
    if (password.length < 8) { showError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match'); return; }
    setLoading(true);
    try {
      if (importMode === 'seed') {
        await wallet.importFromMnemonic(importValue, password);
      } else {
        await wallet.importFromPrivateKey(importValue, password);
      }
      // Clear sensitive data from state
      setImportValue('');
      setPassword('');
      setConfirmPassword('');
      showSuccess('Wallet imported successfully!');
    } catch {
      showError('Invalid ' + (importMode === 'seed' ? 'seed phrase' : 'private key'));
    } finally {
      setLoading(false);
    }
  }

  function copySeed() {
    navigator.clipboard.writeText(seedPhrase);
    showSuccess('Seed phrase copied! Clear your clipboard after pasting.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5FF] p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#493FEE] shadow-xl shadow-[#493FEE]/25">
            <img src={taskfiLogo} alt="TaskFi" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1B25]">TaskFi</h1>
          <p className="text-gray-500 mt-1">Embedded Wallet</p>
        </div>

        {/* Step: Choose */}
        {step === 'choose' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('create-password')}
              className="w-full rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_10px_30px_-8px_rgba(73,63,238,0.14)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#493FEE]/10 text-[#493FEE]">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1B25]">Create New Wallet</p>
                  <p className="text-sm text-gray-500">Generate a new wallet with a seed phrase</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('import')}
              className="w-full rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 hover:shadow-[0_10px_30px_-8px_rgba(73,63,238,0.14)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#493FEE]/10 text-[#493FEE]">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1A1B25]">Import Existing Wallet</p>
                  <p className="text-sm text-gray-500">Use a seed phrase or private key</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Step: Create - Set Password */}
        {step === 'create-password' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(73,63,238,0.14)]">
            <button onClick={() => { setStep('choose'); setPassword(''); setConfirmPassword(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#493FEE] mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-xl font-bold tracking-tight text-[#1A1B25] mb-1">Set a Password</h2>
            <p className="text-sm text-gray-500 mb-6">This password encrypts your wallet in this browser. You'll need it each time you visit.</p>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (min. 8 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 pr-10 outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
              />
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full rounded-xl bg-[#493FEE] py-3 font-semibold text-white shadow-lg shadow-[#493FEE]/20 transition-all duration-200 hover:bg-[#3a32be] hover:shadow-xl hover:shadow-[#493FEE]/30 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Step: Show Seed Phrase */}
        {step === 'show-seed' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(73,63,238,0.14)]">
            <h2 className="text-xl font-bold tracking-tight text-[#1A1B25] mb-1">Your Recovery Phrase</h2>
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-sm text-red-700 font-medium">
                Write down these 12 words and keep them safe. This is the ONLY way to recover your wallet. Never share them with anyone.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {seedPhrase.split(' ').map((word, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-[#F8F9FC] px-3 py-2">
                  <span className="text-xs text-gray-400 font-mono w-4">{i + 1}</span>
                  <span className="text-sm font-semibold text-[#1A1B25]">{word}</span>
                </div>
              ))}
            </div>

            <button
              onClick={copySeed}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-[#A5A0F6] text-sm font-semibold text-[#493FEE] transition-colors duration-200 hover:bg-[#A5A0F6]/10 mb-4"
            >
              <Copy className="h-4 w-4" /> Copy to clipboard
            </button>

            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={seedSaved}
                onChange={e => setSeedSaved(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#493FEE] focus:ring-[#493FEE]"
              />
              <span className="text-sm text-gray-600">I have saved my recovery phrase in a safe place</span>
            </label>

            <button
              onClick={handleSeedConfirmed}
              disabled={!seedSaved || loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#493FEE] py-3 font-semibold text-white shadow-lg shadow-[#493FEE]/20 transition-all duration-200 hover:bg-[#3a32be] hover:shadow-xl hover:shadow-[#493FEE]/30 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Unlocking...' : <><Check className="h-4 w-4" /> Enter Dashboard</>}
            </button>
          </div>
        )}

        {/* Step: Import */}
        {step === 'import' && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_-8px_rgba(73,63,238,0.14)]">
            <button onClick={() => { setStep('choose'); setImportValue(''); setPassword(''); setConfirmPassword(''); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#493FEE] mb-4 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h2 className="text-xl font-bold tracking-tight text-[#1A1B25] mb-4">Import Wallet</h2>

            {/* Toggle */}
            <div className="flex rounded-xl border border-[#A5A0F6]/40 p-1 mb-4">
              <button
                onClick={() => { setImportMode('seed'); setImportValue(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'seed' ? 'bg-[#493FEE] text-white' : 'text-gray-500 hover:text-[#493FEE]'}`}
              >
                Seed Phrase
              </button>
              <button
                onClick={() => { setImportMode('key'); setImportValue(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'key' ? 'bg-[#493FEE] text-white' : 'text-gray-500 hover:text-[#493FEE]'}`}
              >
                Private Key
              </button>
            </div>

            <div className="space-y-4">
              {importMode === 'seed' ? (
                <textarea
                  placeholder="Enter your 12 or 24 word seed phrase..."
                  rows={3}
                  value={importValue}
                  onChange={e => setImportValue(e.target.value)}
                  className="w-full resize-none rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
                />
              ) : (
                <div className="relative">
                  <input
                    type={showImportValue ? 'text' : 'password'}
                    placeholder="Enter private key (0x...)"
                    value={importValue}
                    onChange={e => setImportValue(e.target.value)}
                    className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 pr-10 font-mono text-sm outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
                  />
                  <button type="button" onClick={() => setShowImportValue(!showImportValue)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showImportValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Set a password (min. 8 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 pr-10 outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-[#A5A0F6]/40 bg-white px-4 py-3 outline-none transition-all placeholder:text-gray-400 focus:border-[#493FEE] focus:ring-2 focus:ring-[#493FEE]/15"
              />
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full rounded-xl bg-[#493FEE] py-3 font-semibold text-white shadow-lg shadow-[#493FEE]/20 transition-all duration-200 hover:bg-[#3a32be] hover:shadow-xl hover:shadow-[#493FEE]/30 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
