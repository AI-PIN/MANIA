// Friendly wallet names for wagmi connectors; each wallet once, browser wallets first.
export const walletLabel = (c) => {
  if (c.type === "walletConnect") return "WalletConnect (mobile wallets)";
  if (c.type === "coinbaseWallet") return "Coinbase Wallet";
  if (c.id === "injected") return "Browser wallet";
  return c.name;
};

export function walletList(connectors) {
  const seen = new Set();
  return [...connectors]
    .sort((a, b) => (a.type === "walletConnect") - (b.type === "walletConnect"))
    .filter((c) => (seen.has(walletLabel(c)) ? false : (seen.add(walletLabel(c)), true)));
}
