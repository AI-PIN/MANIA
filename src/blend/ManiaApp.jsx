import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useDisconnect } from "wagmi";
import TokenLogo from "../components/TokenLogo";
import NavChart from "./NavChart";
import TradePanel from "./TradePanel";
import ManiaAbout from "./ManiaAbout";
import RhChainLogo from "../components/RhChainLogo";
import { BLEND } from "./config";
import { RANGES, useAssetNames, useBasket, useNavHistory } from "./data";
import "./blend.css";

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (n, d = 2) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (n, d = 2) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(d)}%`;
const bps = (n) => `${(n / 100).toFixed(2)}%`;
const EXPLORER = "https://robinhoodchain.blockscout.com";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  if (!isConnected) return null; // connecting happens from the trade button
  return (
    <div className="bk-acct">
      <button className="bk-btn dark" onClick={() => setOpen((o) => !o)}>{short(address)} ▾</button>
      {open && (
        <div className="bk-acct-menu">
          <a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer">View on explorer ↗</a>
          <button onClick={() => { disconnect(); setOpen(false); }}>Disconnect</button>
        </div>
      )}
    </div>
  );
}

export default function ManiaApp({ config }) {
  const { data: basket, isLoading, error, refetch } = useBasket(config.address);
  const { address, isConnected } = useAccount();
  const [range, setRange] = useState("30D");
  const [view, setView] = useState("chart");
  const [compOpen, setCompOpen] = useState(true);
  const { data: names } = useAssetNames();

  useEffect(() => {
    document.title = "MANIA Basket — Buy, Sell & Redeem AI & Semiconductor Tokenized Stocks | AssetX";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      "MANIA is one token holding seven AI and semiconductor stocks: NVIDIA, AMD, Micron, Intel, TSMC, Tesla and SpaceX. Buy, sell and redeem on Robinhood Chain."
    );
  }, [config]);

  // Deep link: mania.assetx.trade/#about scrolls to the explainer once it has rendered.
  useEffect(() => {
    if (basket && location.hash === "#about") {
      setTimeout(() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, [!!basket]);

  const hist = useNavHistory(basket?.legs);
  const days = RANGES.find((r) => r.key === range).days;
  const points = useMemo(() => (basket ? hist.series(days, basket.navUsd) : []), [basket, hist, days]);
  const change = points.length > 1 ? points[points.length - 1].nav / points[0].nav - 1 : null;

  const pos = useBalance({ address, token: config.address, chainId: BLEND.chainId, query: { enabled: !!address } });
  const shares = pos.data ? Number(pos.data.formatted) : 0;

  return (
    <div className="bk">
      <header className="bk-top">
        <div className="bk-top-in">
          <div className="bk-brand">
            <a className="bk-brand-mark" href="/#/mania" aria-label={`${config.symbol} home`} onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>
              <span className="bk-mark"><i /><i /><i /><i /></span>
            </a>
            <div className="bk-brand-text">
              <a className="bk-brand-name" href="/#/mania" onClick={(e) => { e.preventDefault(); window.scrollTo(0, 0); }}>
                <b>{config.symbol}</b>
              </a>
            </div>
          </div>
          <nav>
            <a href="https://assetx.trade" target="_blank" rel="noopener noreferrer">AssetX</a>
            <WalletButton />
          </nav>
        </div>
      </header>

      <main className="bk-main">
        {isLoading && <div className="bk-card bk-center">Loading {config.symbol}…</div>}
        {error && !basket && (
          <div className="bk-card bk-center">
            Couldn't load the basket right now. <button className="bk-link" onClick={() => refetch()}>Try again</button>
          </div>
        )}

        {basket && (
          <>
            <section className="bk-card bk-hero">
              <div className="bk-hero-l">
                <div className="bk-logos">
                  {basket.legs.slice(0, 3).map((l) => <TokenLogo key={l.address} symbol={l.symbol} size={46} />)}
                </div>
                <div>
                  <h1>{basket.name} <span>/ {basket.symbol}</span></h1>
                  <p className="bk-meta">
                    by <a href={`${EXPLORER}/address/${basket.owner}`} target="_blank" rel="noopener noreferrer">{short(basket.owner)}</a>
                    {" · "}
                    <a href={`${EXPLORER}/token/${basket.address}`} target="_blank" rel="noopener noreferrer">{short(basket.address)}</a>
                  </p>
                  <span className="bk-chainpill"><span>Built on</span><RhChainLogo tone="black" height={20} /></span>
                </div>
              </div>
              <div className="bk-hero-r">
                <small>NAV per share</small>
                <b>{usd(basket.navUsd)}</b>
                {change != null && <span className={change >= 0 ? "up" : "down"}>{pct(change)} <i>{range}</i></span>}
              </div>
            </section>

            <div className="bk-grid">
              <section className="bk-card bk-chartcard">
                <div className="bk-chart-head">
                  <div className="bk-seg">
                    <button className={view === "chart" ? "on" : ""} onClick={() => setView("chart")} aria-label="Price chart">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /></svg>
                    </button>
                    <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")} aria-label="Constituents">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                    </button>
                  </div>
                  <div className="bk-ranges">
                    {RANGES.map((r) => (
                      <button key={r.key} className={range === r.key ? "on" : ""} onClick={() => setRange(r.key)}>{r.key}</button>
                    ))}
                  </div>
                </div>

                {view === "chart" ? (
                  <NavChart points={hist.loading ? null : points} />
                ) : (
                  <div className="bk-tiles">
                    {[...basket.legs].sort((a, b) => b.weight - a.weight).map((l) => {
                      const c = hist.legChange(l.symbol, days);
                      return (
                        <div className="bk-tile" key={l.address}>
                          <div className="bk-tile-top"><TokenLogo symbol={l.symbol} size={30} /><b>{l.symbol}</b><span>{(l.weight * 100).toFixed(1)}%</span></div>
                          <div className="bk-bar"><i style={{ width: `${Math.min(100, l.weight * 100 * 2.5)}%` }} /></div>
                          <div className="bk-tile-row"><span>Price</span><b>{usd(l.priceUsd)}</b></div>
                          {c != null && <div className="bk-tile-row"><span>{range}</span><b className={c >= 0 ? "up" : "down"}>{pct(c)}</b></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <aside className="bk-card bk-tradecard">
                <TradePanel basket={basket} onDone={() => { refetch(); pos.refetch?.(); }} />
              </aside>
            </div>

            {isConnected && shares > 0 && (
              <section className="bk-card bk-pos">
                <div><small>Your position</small><b>{shares.toLocaleString(undefined, { maximumFractionDigits: 6 })} {basket.symbol}</b></div>
                <div><small>Value</small><b>{usd(shares * basket.navUsd)}</b></div>
              </section>
            )}

            {config.slug === "mania" && <ManiaAbout />}

            <section className="bk-card bk-comp2">
              <button className="bk-comp-head" onClick={() => setCompOpen((o) => !o)} aria-expanded={compOpen}>
                <h2>Composition and protocol details</h2>
                <span aria-hidden="true">{compOpen ? "−" : "+"}</span>
              </button>
              {compOpen && (
                <div className="bk-comp-body">
                  <div className="bk-sum">
                    <div><small>Backed</small><b>{usd(basket.tvlUsd)}</b></div>
                    <div><small>Supply</small><b>{basket.supplyFloat.toFixed(4)}</b></div>
                    <div><small>Mint / redeem fee</small><b>{basket.mintFeeBps + basket.protocolMintFeeBps} / {basket.redeemFeeBps + basket.protocolRedeemFeeBps} bps</b></div>
                    <div><small>Quote</small><b>USDG</b></div>
                    <div><small>Owner</small><b>{short(basket.owner)}</b></div>
                  </div>
                  {basket.paused && <div className="bk-note warn"><b>Issuance is paused</b><span>Buying and depositing are paused. Selling and redeeming still work.</span></div>}
                  <div className="bk-table2">
                    <div className="bk-tr2 head"><span>Asset</span><span>NAV share</span><span>Units / share</span><span>Value</span><span>1% depth</span></div>
                    {[...basket.legs].sort((a, b) => b.weight - a.weight).map((l) => {
                      const full = names?.[l.address.toLowerCase()];
                      return (
                        <div className="bk-tr2" key={l.address}>
                          <span className="bk-asset2">
                            <TokenLogo symbol={l.symbol} size={36} />
                            <span><b title={full}>{full || l.symbol}</b><small>{l.symbol}</small></span>
                          </span>
                          <span>{(l.weight * 100).toFixed(1)}%</span>
                          <span>{l.perShare.toFixed(8)}</span>
                          <span>{usd(l.valueUsd)}</span>
                          <span>{usd(l.depthUsd, 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <p className="bk-risk">
              Tokenized stocks are blockchain tokens that track an underlying asset; they aren't company shares and carry no
              ownership, voting or dividend rights. Not available to residents of the United States and other restricted
              jurisdictions. Prices can move and liquidity can be thin — quotes include fees and price impact. Not financial advice.
              This storefront is an independent product of AssetX / AI·PIN, not affiliated with, endorsed or sponsored by Robinhood.{" "}
              <a href="https://assetx.trade/#/legal" target="_blank" rel="noopener noreferrer">Terms &amp; risks</a>
            </p>
          </>
        )}
      </main>

      <footer className="bk-footer">
        <span className="bk-built"><span>Built on</span><RhChainLogo tone="black" height={22} /></span>
        <span>Interface by <a href="https://assetx.trade" target="_blank" rel="noopener noreferrer">AssetX</a> · non-custodial</span>
      </footer>
    </div>
  );
}
