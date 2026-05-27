/**
 * ROOT LAYOUT COMPONENT
 *
 * Top-level layout that wraps every page in the app.
 * Defines the global structure: Header + Sidebar + Content area.
 *
 * Wallet gate:
 * - No wallet (or setup in progress) -> <WalletSetup />
 * - Wallet locked                    -> <UnlockScreen />
 * - Wallet unlocked                  -> SIWE sign-in then the app
 *
 * Structure:
 * - Background: Frosted White (#F4F5FF)
 * - Sidebar: Primary navigation (hidden on mobile)
 * - TopHeader: Search bar + Wallet + Token price
 * - Outlet: Render slot for child pages (React Router)
 *
 * Note: <Outlet /> is the injection point for the pages defined in routes.ts
 */

import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { AgentsProvider } from '../../contexts/AgentsContext';
import { MissionsProvider } from '../../contexts/MissionsContext';
import { useWallet } from '../../../lib/wallet-context';
import { WalletSetup } from '../../pages/WalletSetup';
import { UnlockScreen } from './UnlockScreen';
import { signInWithEthereum } from '../../../lib/siwe';
import { showError } from '../../../lib/toast';

/**
 * Rendered once the wallet is unlocked. Fires the SIWE sign-in in the
 * background so the backend auth token is set when a backend is available.
 *
 * Crucially this does NOT block rendering: if the backend is unreachable
 * (or not deployed yet) the dashboard still loads. Authenticated calls
 * simply 401 and data contexts fall back to empty/public data.
 */
function AuthenticatedApp() {
  const { address, signMessage } = useWallet();

  useEffect(() => {
    if (!address) return;
    void signInWithEthereum(address, signMessage).catch((err: any) => {
      showError(err?.message ?? 'Sign-in failed — some data may be unavailable');
    });
  }, [address, signMessage]);

  return (
    <AgentsProvider>
      <MissionsProvider>
        <div className="min-h-screen bg-[#F4F5FF]">
          {/* Layout Container - Flexbox responsive */}
          <div className="flex h-screen flex-col lg:flex-row">
            {/* Sidebar Navigation - Hidden on mobile, visible on desktop */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Header with search, wallet, token price */}
              <TopHeader />

              {/* Page Content - Rendered here via React Router */}
              <Outlet />
            </div>
          </div>
        </div>
      </MissionsProvider>
    </AgentsProvider>
  );
}

export function RootLayout() {
  const { hasWallet, isUnlocked, pendingSetup } = useWallet();

  // Wallet gate.
  if (!hasWallet || pendingSetup) return <WalletSetup />;
  if (!isUnlocked) return <UnlockScreen />;

  return <AuthenticatedApp />;
}
