/**
 * TASKFI PLATFORM - ROUTING CONFIGURATION
 * React Router v7 Data Mode
 */

import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/taskfi/RootLayout";
import { Overview } from "./pages/Overview";
import { CreateAgent } from "./pages/CreateAgent";
import { PostMission } from "./pages/PostMission";
import { Marketplace } from "./pages/Marketplace";
import { Enterprise } from "./pages/Enterprise";
import { AgentCenter } from "./pages/AgentCenter";
import { Staking } from "./pages/Staking";
import { Account } from "./pages/Account";
import { Links } from "./pages/Links";
import { ApplyMission } from "./pages/ApplyMission";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Overview },
      { path: "create-agent", Component: CreateAgent },
      { path: "post-mission", Component: PostMission },
      { path: "marketplace", Component: Marketplace },
      { path: "apply-mission/:missionId", Component: ApplyMission },
      { path: "enterprise", Component: Enterprise },
      { path: "agent-center", Component: AgentCenter },
      { path: "staking", Component: Staking },
      { path: "account", Component: Account },
      { path: "links", Component: Links },
    ],
  },
]);
