import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useBalance, useConnect, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import TokenLogo from "../components/TokenLogo";
import { walletLabel, walletList } from "../wallets";
import { ABIS, BLEND } from "./config";

const MODES = [
  { key: "buy", label: "Buy" },
  { key: "sell", label: "Sell" },
  { key: "deposit", label: "Deposit" },
  { key: "redeem", label: "Redeem" },
];
const HELP = {
  buy: "Pay USDG, receive basket shares. One transaction buys every stock.",
  sell: "Sell basket shares back for USDG in one transaction.",
  deposit: "Already hold the stocks? Deposit all of them to mint shares directly.",
  redeem: "Burn shares and receive the underlying stocks in your wallet.",
};
const SLIPPAGE = [50, 100, 300];

const fmt = (n, max = 6) => {
  const v = Number(n);
  if (!isFinite(v)) return "0";
  if (v !== 0 && Math.abs(v) < 1) return v.toLocaleString(undefined, { maximumSignificantDigits: 5 });
  return v.toLocaleString(undefined, { maximumFractionDigits: max });
};
const usd = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function friendly(e) {
  const s = String(e?.shortMessage || e?.details || e?.message || e || "").toLowerCase();
  if (/user rejected|user denied|rejected the request/.test(s)) return "Transaction cancelled.";
  if (/insufficient funds/.test(s)) return "Not enough ETH to pay network fees.";
  if (/slippage|too little|insufficient output|min|max.?in|exceed/.test(s)) return "The price moved before your trade confirmed. Try again or raise slippage.";
  if (/revert/.test(s)) return "The trade couldn't be completed on-chain. Try a smaller amount.";
  return "Something went wrong. Please try again.";
}

export default function TradePanel({ basket, onDone }) {
  const vault = basket.address;
  const legs = basket.legs || [];
  const nav = basket.navUsd;
  const { address, isConnected, chainId: walletChain } = useAccount();
  const { connectors, connect } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const pc = usePublicClient({ chainId: BLEND.chainId });

  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [slipBps, setSlipBps] = useState(100);
  const [showSlip, setShowSlip] = useState(false);
  const [q, setQ] = useState(null);          // quote / preview for current inputs
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState("");
  const [tx, setTx] = useState(null);
  const [legBal, setLegBal] = useState({});   // deposit: wallet balances per constituent
  const [menu, setMenu] = useState(false);

  const isUsdgIn = mode === "buy";
  const inDec = isUsdgIn ? 6 : 18;
  const parsed = useMemo(() => {
    if (!amount || Number(amount) <= 0) return null;
    try { return parseUnits(amount, inDec); } catch { return null; }
  }, [amount, inDec]);

  const usdgBal = useBalance({ address, token: BLEND.usdg, chainId: BLEND.chainId, query: { enabled: !!address } });
  const shareBal = useBalance({ address, token: vault, chainId: BLEND.chainId, query: { enabled: !!address } });
  const refetchBalances = () => { usdgBal.refetch?.(); shareBal.refetch?.(); };

  // PoolKey must come from the hook — never rebuilt locally (per Blend docs).
  const keyRef = useRef(null);
  const keyFor = useCallback(async () => {
    if (!keyRef.current) {
      keyRef.current = pc.readContract({ address: BLEND.hook, abi: ABIS.hook, functionName: "poolKeyFor", args: [vault, BLEND.usdg] });
    }
    return keyRef.current;
  }, [pc, vault]);

  // ---- live quote / preview ------------------------------------------------
  useEffect(() => {
    setQ(null); setErr(null);
    if (!parsed) { setLoading(false); return; }
    let live = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        let out;
        if (mode === "buy") {
          const key = await keyFor();
          const { result } = await pc.simulateContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "quoteBuy", args: [key, parsed], account: address });
          out = { shares: result };
        } else if (mode === "sell") {
          const key = await keyFor();
          const { result } = await pc.simulateContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "quoteSell", args: [key, parsed], account: address });
          out = { usdg: result };
        } else if (mode === "deposit") {
          const [tokens, required, fees] = await pc.readContract({ address: vault, abi: ABIS.vault, functionName: "previewMint", args: [parsed] });
          out = { tokens, required, fees };
          if (address) {
            const bals = await Promise.all(tokens.map((tk) => pc.readContract({ address: tk, abi: erc20Abi, functionName: "balanceOf", args: [address] })));
            if (live) setLegBal(Object.fromEntries(tokens.map((tk, i) => [tk.toLowerCase(), bals[i]])));
          }
        } else {
          const [tokens, outs, fees] = await pc.readContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "previewRedeem", args: [vault, parsed] });
          out = { tokens, outs, fees };
        }
        if (live) setQ(out);
      } catch (e) {
        if (live) setErr(mode === "buy" || mode === "sell" ? "No quote available for that size right now. Try a smaller amount." : "Couldn't preview that amount.");
      } finally {
        if (live) setLoading(false);
      }
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [mode, parsed, address, vault]);

  // ---- derived display -----------------------------------------------------
  const legBySym = useMemo(() => Object.fromEntries(legs.map((l) => [l.address.toLowerCase(), l])), [legs]);
  const shares = q?.shares != null ? Number(formatUnits(q.shares, 18)) : null;
  const usdgOut = q?.usdg != null ? Number(formatUnits(q.usdg, 6)) : null;
  const buyPremium = shares && parsed ? Number(formatUnits(parsed, 6)) / shares / nav - 1 : null;
  const sellDisc = usdgOut != null && parsed ? usdgOut / (Number(formatUnits(parsed, 18)) * nav) - 1 : null;
  const payUsd = mode === "buy" && parsed ? Number(formatUnits(parsed, 6)) : null;
  const overCapacity = payUsd != null && payUsd > basket.capacityUsd;

  const depositShort = useMemo(() => {
    if (mode !== "deposit" || !q?.tokens || !isConnected) return [];
    return q.tokens.filter((tk, i) => (legBal[tk.toLowerCase()] ?? 0n) < q.required[i] + q.fees[i]).map((tk) => legBySym[tk.toLowerCase()]?.symbol || "token");
  }, [mode, q, legBal]);

  const balForInput = mode === "buy" ? usdgBal.data : shareBal.data;
  const insufficient = isConnected && parsed && balForInput && balForInput.value < parsed;
  const paused = basket.paused && (mode === "buy" || mode === "deposit");

  function setMax() {
    if (mode === "buy" && usdgBal.data) setAmount(usdgBal.data.formatted);
    else if ((mode === "sell" || mode === "redeem") && shareBal.data) setAmount(shareBal.data.formatted);
    else if (mode === "deposit" && Object.keys(legBal).length) {
      // Largest share count every constituent balance can cover, minus fees.
      let min = Infinity;
      for (const l of legs) {
        const b = Number(formatUnits(legBal[l.address.toLowerCase()] ?? 0n, l.decimals));
        min = Math.min(min, b / (l.perShare * 1.01));
      }
      if (isFinite(min) && min > 0) setAmount(String(Math.floor(min * 1e6) / 1e6));
    }
  }

  // ---- execution -----------------------------------------------------------
  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 20 * 60);
  const slip = (v) => (v * BigInt(10000 - slipBps)) / 10000n;
  const slipUp = (v) => (v * BigInt(10000 + slipBps) + 9999n) / 10000n;

  async function approveIfNeeded(token, spender, need, label) {
    const cur = await pc.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [address, spender] });
    if (cur >= need) return;
    setStatus(`Approve ${label} in your wallet…`);
    const h = await writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [spender, need], chainId: BLEND.chainId });
    setStatus(`Waiting for ${label} approval…`);
    await pc.waitForTransactionReceipt({ hash: h });
  }

  async function submit() {
    setErr(null); setTx(null);
    try {
      if (walletChain !== BLEND.chainId) await switchChainAsync({ chainId: BLEND.chainId });
      let hash;
      if (mode === "buy") {
        setStatus("Getting a fresh quote…");
        const key = await keyFor();
        const { result } = await pc.simulateContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "quoteBuy", args: [key, parsed], account: address });
        await approveIfNeeded(BLEND.usdg, BLEND.router, parsed, "USDG");
        setStatus("Confirm the purchase in your wallet…");
        hash = await writeContractAsync({ address: BLEND.router, abi: ABIS.router, functionName: "buy", args: [key, vault, parsed, slip(result), address, deadline()], chainId: BLEND.chainId });
      } else if (mode === "sell") {
        const key = await keyFor();
        const { result } = await pc.simulateContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "quoteSell", args: [key, parsed], account: address });
        await approveIfNeeded(vault, BLEND.router, parsed, basket.symbol);
        setStatus("Confirm the sale in your wallet…");
        hash = await writeContractAsync({ address: BLEND.router, abi: ABIS.router, functionName: "sell", args: [key, vault, parsed, slip(result), address, deadline()], chainId: BLEND.chainId });
      } else if (mode === "deposit") {
        const [tokens, required, fees] = await pc.readContract({ address: vault, abi: ABIS.vault, functionName: "previewMint", args: [parsed] });
        const maxIn = tokens.map((_, i) => slipUp(required[i] + fees[i]));
        for (let i = 0; i < tokens.length; i++) {
          const sym = legBySym[tokens[i].toLowerCase()]?.symbol || "token";
          await approveIfNeeded(tokens[i], vault, maxIn[i], `${sym} (${i + 1}/${tokens.length})`);
        }
        setStatus("Confirm the deposit in your wallet…");
        hash = await writeContractAsync({ address: vault, abi: ABIS.vault, functionName: "mint", args: [parsed, address, maxIn, deadline()], chainId: BLEND.chainId });
      } else {
        const [, outs] = await pc.readContract({ address: BLEND.lens, abi: ABIS.lens, functionName: "previewRedeem", args: [vault, parsed] });
        setStatus("Confirm the redemption in your wallet…");
        hash = await writeContractAsync({ address: vault, abi: ABIS.vault, functionName: "redeem", args: [parsed, address, outs.map(slip), deadline()], chainId: BLEND.chainId });
      }
      setStatus("Confirming on-chain…");
      const r = await pc.waitForTransactionReceipt({ hash });
      setStatus("");
      if (r.status === "success") {
        setTx(hash); setAmount(""); setQ(null);
        refetchBalances(); onDone?.();
      } else {
        setErr("The transaction reverted on-chain. Try a smaller amount or higher slippage.");
      }
    } catch (e) {
      setStatus("");
      setErr(friendly(e));
    }
  }

  // ---- CTA -----------------------------------------------------------------
  let cta = MODES.find((m) => m.key === mode).label;
  let disabled = false;
  if (!isConnected) cta = "Connect wallet";
  else if (walletChain !== BLEND.chainId) cta = "Switch to Robinhood Chain";
  else if (paused) { cta = "Paused"; disabled = true; }
  else if (!parsed) { cta = "Enter an amount"; disabled = true; }
  else if (insufficient) { cta = mode === "buy" ? "Insufficient USDG" : `Insufficient ${basket.symbol}`; disabled = true; }
  else if (mode === "deposit" && depositShort.length) { cta = `Missing ${depositShort.slice(0, 3).join(", ")}${depositShort.length > 3 ? "…" : ""}`; disabled = true; }
  else if (loading || (!q && !err)) { cta = "Getting price…"; disabled = true; }
  else if (err && !q) disabled = true;
  if (status) disabled = true;

  function onCta() {
    if (!isConnected) return setMenu((m) => !m);
    if (walletChain !== BLEND.chainId) return switchChainAsync({ chainId: BLEND.chainId }).catch(() => {});
    submit();
  }

  // ---- render --------------------------------------------------------------
  const inLabel = mode === "buy" ? "You pay" : mode === "deposit" || mode === "redeem" ? "Shares" : "You sell";
  const inSym = mode === "buy" ? "USDG" : basket.symbol;

  return (
    <div className="bk-trade">
      <div className="bk-tabs" role="tablist">
        {MODES.map((m) => (
          <button key={m.key} role="tab" aria-selected={mode === m.key} className={mode === m.key ? "on" : ""} onClick={() => { setMode(m.key); setAmount(""); setTx(null); setQ(null); setErr(null); }}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="bk-help">{HELP[mode]}</p>

      <div className="bk-leg">
        <div className="bk-leg-top">
          <span>{inLabel}</span>
          <button className="bk-max" onClick={setMax}>Max</button>
        </div>
        <div className="bk-leg-row">
          <input inputMode="decimal" placeholder="0.0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
          <span className="bk-pill"><TokenLogo symbol={inSym} size={22} />{inSym}</span>
        </div>
        <div className="bk-leg-sub">
          {mode === "buy" && parsed ? `≈ ${usd(Number(formatUnits(parsed, 6)))}` : (mode === "sell" || mode === "redeem" || mode === "deposit") && parsed ? `≈ ${usd(Number(amount) * nav)}` : " "}
          {isConnected && balForInput && mode !== "deposit" && <em>Balance: {fmt(balForInput.formatted, 4)}</em>}
        </div>
      </div>

      {(mode === "buy" || mode === "sell") && (
        <>
          <div className="bk-arrow">↓</div>
          <div className="bk-leg">
            <div className="bk-leg-top"><span>You receive</span></div>
            <div className="bk-leg-row">
              <input readOnly placeholder="0.0" value={loading ? "…" : mode === "buy" ? (shares != null ? fmt(shares) : "") : usdgOut != null ? fmt(usdgOut) : ""} />
              <span className="bk-pill"><TokenLogo symbol={mode === "buy" ? basket.symbol : "USDG"} size={22} />{mode === "buy" ? basket.symbol : "USDG"}</span>
            </div>
            <div className="bk-leg-sub">
              {mode === "buy" && buyPremium != null && <span>{Math.abs(buyPremium * 100).toFixed(2)}% {buyPremium >= 0 ? "above" : "below"} NAV · fees + impact included</span>}
              {mode === "sell" && sellDisc != null && <span>{Math.abs(sellDisc * 100).toFixed(2)}% {sellDisc >= 0 ? "above" : "below"} NAV · fees + impact included</span>}
            </div>
          </div>
        </>
      )}

      {(mode === "deposit" || mode === "redeem") && q?.tokens && (
        <div className="bk-legs-list">
          <div className="bk-legs-head">{mode === "deposit" ? "You deposit (incl. fees)" : "You receive (after fees)"}</div>
          {q.tokens.map((tk, i) => {
            const l = legBySym[tk.toLowerCase()];
            const amt = mode === "deposit" ? q.required[i] + q.fees[i] : q.outs[i];
            const short = mode === "deposit" && isConnected && (legBal[tk.toLowerCase()] ?? 0n) < amt;
            return (
              <div className={"bk-legrow" + (short ? " short" : "")} key={tk}>
                <TokenLogo symbol={l?.symbol || "?"} size={22} />
                <b>{l?.symbol}</b>
                <span className="num">{fmt(formatUnits(amt, l?.decimals ?? 18))}</span>
                {mode === "deposit" && isConnected && <em>{short ? "short" : "ok"}</em>}
              </div>
            );
          })}
        </div>
      )}

      <div className="bk-rows">
        <div><span>Slippage</span>
          <span className="bk-slip">
            {showSlip ? SLIPPAGE.map((b) => (
              <button key={b} className={slipBps === b ? "on" : ""} onClick={() => { setSlipBps(b); setShowSlip(false); }}>{b / 100}%</button>
            )) : <button onClick={() => setShowSlip(true)}>{slipBps / 100}% ✎</button>}
          </span>
        </div>
        <div><span>Trade capacity</span><b>{usd(basket.capacityUsd)}</b></div>
      </div>

      {overCapacity && <div className="bk-note warn"><b>Large order</b><span>This is above the basket's current trade capacity, so expect extra price impact.</span></div>}
      {paused && <div className="bk-note warn"><b>Issuance is paused</b><span>Buying and depositing are paused for this basket. You can still sell and redeem.</span></div>}
      {err && <div className="bk-note error"><b>{err}</b></div>}
      {status && <div className="bk-note info"><b>{status}</b></div>}
      {tx && <div className="bk-note ok"><b>✓ Done</b><a href={`https://robinhoodchain.blockscout.com/tx/${tx}`} target="_blank" rel="noopener noreferrer">View transaction ↗</a></div>}

      <div className="bk-cta-wrap">
        <button className="bk-cta" disabled={disabled} onClick={onCta}>{cta}</button>
        {menu && !isConnected && (
          <div className="bk-connect-menu">
            {walletList(connectors).map((c) => (
              <button key={c.uid} onClick={() => { connect({ connector: c }); setMenu(false); }}>{walletLabel(c)}</button>
            ))}
          </div>
        )}
      </div>

      <p className="bk-net"><img src="/robinhood.png" alt="" />Trades settle on Robinhood Chain</p>

      {mode === "buy" && (
        <p className="bk-foot">Need USDG? <a href="https://assetx.trade/#/trade?tab=rwa&chain=4663&buy=USDG" target="_blank" rel="noopener noreferrer">Swap ETH to USDG on AssetX →</a></p>
      )}
    </div>
  );
}
