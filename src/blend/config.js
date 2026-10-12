// The Index Blend protocol on Robinhood Chain (chain id 4663).
// Contract addresses are public on-chain data; the ABIs are in this folder.
import routerAbi from "./blend-router.json";
import lensAbi from "./blend-lens.json";
import vaultAbi from "./basket-vault.json";
import hookAbi from "./blend-hook.json";

export const BLEND = {
  chainId: 4663,
  router: "0x70DDEa1f1C509cE6554de3E12370Bf8A29bA4604",
  lens: "0xbB95752f5F1464e2Bb4f17652daF68c7f75f6c05",
  hook: "0x219B93D7c067f3cCc9E25aecDbecf1279D1Fc888",
  usdg: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
};
export const ABIS = { router: routerAbi, lens: lensAbi, vault: vaultAbi, hook: hookAbi };

// The basket this storefront trades.
export const BASKETS = {
  mania: {
    slug: "mania",
    address: "0xd46f661325ba21f54e43d263df37c8ec6ada5791",
    symbol: "MANIA",
    name: "MANIA",
  },
};
