import { http, createConfig } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { robinhoodChain } from "./chain";

// Wallets: browser extensions (injected), Coinbase Wallet, and WalletConnect for
// mobile wallets. WalletConnect needs a free project id (VITE_WC_PROJECT_ID, from
// cloud.reown.com); without one that option is simply left out.
const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID;

const connectors = [injected({ shimDisconnect: true }), coinbaseWallet({ appName: "MANIA" })];
if (wcProjectId) {
  connectors.push(
    walletConnect({
      projectId: wcProjectId,
      metadata: {
        name: "MANIA",
        description: "Trade the MANIA tokenized-stock basket",
        // Must equal the page origin or WalletConnect flags "Invalid App Configuration".
        url: typeof window !== "undefined" ? window.location.origin : "",
        icons: [typeof window !== "undefined" ? `${window.location.origin}/favicon.svg` : ""],
      },
      showQrModal: true,
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors,
  transports: { [robinhoodChain.id]: http() },
});
