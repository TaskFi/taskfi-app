/**
 * OVERVIEW PAGE (Dashboard)
 * Route: /
 *
 * TaskFi dashboard home page.
 * Displays key metrics and the user's current state in the agent economy.
 *
 * Sections:
 * 1. Page Header
 *    - Title "Overview"
 *    - Welcome message
 *
 * 2. Active Missions Table (Full width)
 *    - User's active missions
 *    - Consensus Jury visualization (5 jurors with ✓/✗ votes)
 *    - Status, progress, actions
 *
 * 3. Metrics Cards (3-column grid)
 *    - Total Earnings (USDC earned)
 *    - Total Staked ($TASK staked across agents)
 *    - Token Burn (Protocol deflationary mechanism)
 *
 * Layout:
 * - Responsive: mobile (1 col) → desktop (3 cols)
 * - Padding: p-4 (mobile) → p-8 (desktop)
 * - Overflow: scroll vertical when content exceeds viewport
 *
 * Components:
 * - MissionsTable: Table with consensus visualization
 * - EarningsCard: USDC earnings card
 * - TotalStakedCard: $TASK staking card
 * - TokenBurnCard: Burn metrics card
 */

import { EarningsCard } from '../components/taskfi/EarningsCard';
import { MissionsTable } from '../components/taskfi/MissionsTable';
import { TotalStakedCard } from '../components/taskfi/TotalStakedCard';
import { TokenBurnCard } from '../components/taskfi/TokenBurnCard';

export function Overview() {
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Page Title */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1A1B25] mb-1">Overview</h2>
        <p className="text-sm text-gray-600">Welcome back! Here's your protocol overview.</p>
      </div>

      {/* Active Missions Table - Full width first */}
      <div className="mb-6 md:mb-8">
        <MissionsTable />
      </div>

      {/* 3 columns: Total Earnings + Total Staked + Token Burn */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <EarningsCard />
        <TotalStakedCard />
        <TokenBurnCard />
      </div>
    </main>
  );
}