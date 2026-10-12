import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const get = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const useBasket = (address) =>
  useQuery({
    queryKey: ["basket", address],
    queryFn: () => get(`/api/blend/basket/${address}`),
    refetchInterval: 20000,
    staleTime: 10000,
  });

export const useEthUsd = () =>
  useQuery({
    queryKey: ["ethUsd"],
    queryFn: () => get("/api/blend/eth").then((d) => Number(d.ethUsd)),
    refetchInterval: 60000,
    staleTime: 30000,
  });

// ---- NAV history -----------------------------------------------------------
// Blend publishes daily closes per stock. A basket holds fixed units of each, so
// NAV(day) = Σ unitsPerShare × close. We load a year once and slice per range.
const DAY = 86400000;
const CANDLES = new Map(); // ticker -> Promise<[[ts, close]]>

function candles(ticker) {
  if (!CANDLES.has(ticker)) {
    const to = Date.now(), from = to - 370 * DAY;
    CANDLES.set(
      ticker,
      get(`/api/blend/candles?ticker=${ticker}&from=${from}&to=${to}`)
        .then((d) => d.bars || [])
        .catch(() => [])
    );
  }
  return CANDLES.get(ticker);
}

export const RANGES = [
  { key: "7D", days: 7 },
  { key: "30D", days: 30 },
  { key: "90D", days: 90 },
  { key: "1Y", days: 365 },
];

// Returns { loading, bars: { [ticker]: [[ts, close]] }, series(days) }
export function useNavHistory(legs) {
  const key = (legs || []).map((l) => l.symbol).join(",");
  const [bars, setBars] = useState(null);

  useEffect(() => {
    if (!legs?.length) return;
    let live = true;
    Promise.all(legs.map((l) => candles(l.symbol))).then((all) => {
      if (!live) return;
      setBars(Object.fromEntries(legs.map((l, i) => [l.symbol, all[i]])));
    });
    return () => { live = false; };
  }, [key]);

  return useMemo(() => {
    const series = (days, navNow) => {
      if (!bars || !legs?.length) return [];
      const cutoff = Date.now() - days * DAY;
      // Day index -> per-ticker close, then keep days where every leg has a close.
      const byDay = new Map();
      for (const l of legs) {
        for (const [ts, c] of bars[l.symbol] || []) {
          if (ts < cutoff) continue;
          const d = Math.floor(ts / DAY);
          if (!byDay.has(d)) byDay.set(d, { ts, closes: {} });
          byDay.get(d).closes[l.symbol] = c;
        }
      }
      const out = [];
      for (const [, v] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
        if (legs.every((l) => v.closes[l.symbol] != null)) {
          out.push({ ts: v.ts, nav: legs.reduce((s, l) => s + l.perShare * v.closes[l.symbol], 0) });
        }
      }
      if (navNow && out.length) out.push({ ts: Date.now(), nav: navNow });
      return out;
    };
    // Per-leg change over a window, for the constituents grid.
    const legChange = (symbol, days) => {
      const arr = (bars?.[symbol] || []).filter(([ts]) => ts >= Date.now() - days * DAY);
      return arr.length > 1 ? arr[arr.length - 1][1] / arr[0][1] - 1 : null;
    };
    return { loading: !bars, series, legChange };
  }, [bars, key]);
}

// Full company names (e.g. "Tesla, Inc.") keyed by token address, from Blend's
// asset list. Falls back to the ticker if unavailable.
export const useAssetNames = () =>
  useQuery({
    queryKey: ["assetNames"],
    queryFn: () =>
      get("/api/blend/assets").then((d) =>
        Object.fromEntries(
          (d.assets || []).map((a) => [a.address.toLowerCase(), String(a.name || a.symbol).replace(/\s*•\s*Robinhood Token\s*$/i, "")])
        )
      ),
    staleTime: 600000,
  });
