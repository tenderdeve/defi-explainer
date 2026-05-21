import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { mainnet } from "wagmi/chains";

// MetaMask (and any browser extension) connects through the `injectedWallet`
// connector, which talks to window.ethereum directly — no MetaMask SDK, no
// WalletConnect relay, no projectId required. The SDK-based `metaMaskWallet`
// silently stalls without a real WalletConnect projectId, so it is intentionally
// omitted. WalletConnect (QR / mobile) is added only when a real projectId is set.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const hasWalletConnect = !!projectId && projectId !== "placeholder_for_build";

const wallets = hasWalletConnect
  ? [injectedWallet, coinbaseWallet, walletConnectWallet]
  : [injectedWallet, coinbaseWallet];

export const config = getDefaultConfig({
  appName: "Lucid — DeFi Portfolio Explainer",
  projectId: projectId || "placeholder_for_build",
  chains: [mainnet],
  ssr: true,
  wallets: [{ groupName: "Popular", wallets }],
});
