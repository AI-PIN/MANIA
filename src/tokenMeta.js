// Display names and logos for the tokens MANIA shows (the seven constituents + USDG).
// Unknown symbols fall back to the ticker and a generated monogram.
export const NAMES = {
  NVDA: "NVIDIA",
  AMD: "Advanced Micro Devices",
  MU: "Micron Technology",
  INTC: "Intel",
  TSM: "Taiwan Semiconductor",
  TSLA: "Tesla",
  SPCX: "SpaceX",
  USDG: "Global Dollar",
};

const LOGO_OVERRIDES = {
  SPCX: "/logos/SPCX.svg",
  USDG: "https://assets.coingecko.com/coins/images/51281/small/GDN_USDG_Token.png",
};

export const nameFor = (symbol) => NAMES[symbol] || symbol;

export function logoFor(symbol) {
  if (LOGO_OVERRIDES[symbol]) return LOGO_OVERRIDES[symbol];
  return `/logos/${symbol.replace(/x$/, "").toUpperCase()}.png`;
}

// Deterministic accent color for the monogram fallback.
export function monogramColor(symbol) {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 45%)`;
}
