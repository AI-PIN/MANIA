// Read-only proxy for the protocol's public data API. Browsers can't call it
// cross-origin, and proxying lets us cache at the edge. The upstream origin is
// configuration (BLEND_API_ORIGIN), not code.
// Only a fixed set of GET paths is allowed:
//   /api/blend/basket/0x…     basket state: NAV, legs, fees, capacity
//   /api/blend/eth            ETH/USD
//   /api/blend/assets         token names for the composition table
//   /api/blend/candles?ticker=TSLA&from=ms&to=ms   daily closes (chart)

const ADDR = /^0x[a-fA-F0-9]{40}$/;
const TICKER = /^[A-Z0-9.\-]{1,10}$/;

const json = (o, s = 200, cache = "no-store") =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": cache } });

export async function onRequestGet({ request, params, env }) {
  const ORIGIN = (env.BLEND_API_ORIGIN || "").replace(/\/+$/, "");
  if (!ORIGIN) return json({ error: "BLEND_API_ORIGIN is not configured" }, 503);
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const u = new URL(request.url);
  let target, ttl;

  if (parts[0] === "basket" && parts.length === 2 && ADDR.test(parts[1])) {
    target = `${ORIGIN}/api/blend/basket/${parts[1]}`; ttl = 15;
  } else if (parts[0] === "eth" && parts.length === 1) {
    target = `${ORIGIN}/api/blend/eth`; ttl = 30;
  } else if (parts[0] === "assets" && parts.length === 1) {
    target = `${ORIGIN}/api/blend/assets`; ttl = 600;
  } else if (parts[0] === "candles" && parts.length === 1) {
    const ticker = (u.searchParams.get("ticker") || "").toUpperCase();
    const from = u.searchParams.get("from") || "", to = u.searchParams.get("to") || "";
    if (!TICKER.test(ticker) || !/^\d{10,14}$/.test(from) || !/^\d{10,14}$/.test(to)) return json({ error: "bad params" }, 400);
    // Round the window to the hour so identical requests share one cache entry.
    const hr = 3600000;
    const f = Math.floor(Number(from) / hr) * hr, t = Math.ceil(Number(to) / hr) * hr;
    target = `${ORIGIN}/api/intel/candles?ticker=${ticker}&from=${f}&to=${t}&timespan=day&multiplier=1`; ttl = 600;
  } else {
    return json({ error: "not found" }, 404);
  }

  try {
    const r = await fetch(target, { headers: { accept: "application/json" }, cf: { cacheTtl: ttl, cacheEverything: true } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { "content-type": "application/json", "cache-control": `public, max-age=${Math.min(ttl, 15)}, s-maxage=${ttl}` },
    });
  } catch (e) {
    return json({ error: "upstream failed" }, 502);
  }
}
