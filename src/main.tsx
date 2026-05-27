import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { WalletProvider } from "./lib/wallet-context";
import { ConfigProvider } from "./app/contexts/ConfigContext";
import { MaintenanceGate } from "./app/MaintenanceGate";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <MaintenanceGate>
    <ConfigProvider>
      <WalletProvider>
        <App />
        <Toaster position="bottom-right" richColors />
      </WalletProvider>
    </ConfigProvider>
  </MaintenanceGate>,
);
