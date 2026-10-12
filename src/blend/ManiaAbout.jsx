import { useState } from "react";
import TokenLogo from "../components/TokenLogo";

// Plain-language explainer for MANIA.
const GET_USDG = "https://assetx.trade/#/trade?tab=rwa&chain=4663&buy=USDG";

// One accent per card so the acronym reads at a glance.
const COLORS = ["#2f7de1", "#ee6c4d", "#5aa626", "#8a63d2", "#e0a526"];

const LETTERS = [
  { l: "M", sym: "MU", name: "Micron Technology", why: "High-bandwidth memory and semiconductor infrastructure." },
  { l: "A", sym: "AMD", name: "AMD", why: "A major competitor in data-center and accelerated computing." },
  { l: "N", sym: "NVDA", name: "NVIDIA", why: "One of the central companies in today's AI-compute ecosystem." },
  { l: "I", sym: "INTC", name: "Intel", why: "A semiconductor and foundry story with major U.S. strategic relevance." },
  { l: "A", sym: "TSLA", sym2: "SPCX", name: "Tesla & SpaceX", why: "The final “A” is broader than one company: the infrastructure around next-generation AI and autonomous systems." },
];
const THEMES = ["AI compute", "Semiconductors", "Data-center infrastructure", "Advanced memory", "Foundry capacity", "Autonomous systems"];

const STEPS = [
  { n: "1", t: "Get USDG", d: "USDG is the dollar-pegged token used to buy MANIA on Robinhood Chain. Don't have any? Swap for it on AssetX.", link: [GET_USDG, "Get USDG →"] },
  { n: "2", t: "Buy one token", d: "Connect your wallet and buy MANIA. In a single transaction, the basket buys all seven stocks for you." },
  { n: "3", t: "Hold, sell or redeem", d: "Your MANIA moves with the seven stocks combined. Sell it back for USDG any time, or redeem it for the underlying stock tokens." },
];

const FAQ = [
  { q: "What is a basket?", a: "A basket is a single token that represents a fixed amount of several assets bundled together. Owning one share of MANIA means you own a slice of all seven stocks at once, instead of buying each one separately." },
  { q: "Do I own real shares of these companies?", a: "No. Tokenized stocks are blockchain tokens that give you price exposure to a stock. They are not company shares and typically carry no ownership, voting rights or dividends." },
  { q: "What does “NAV” mean?", a: "NAV (net asset value) is what everything inside one MANIA share is worth right now. It's the “fair” price of a share based on the stocks it holds." },
  { q: "Why does my quote say “above NAV”?", a: "When you buy through the market pools, you pay the fees and a small price impact on top of NAV. The quote already includes both, so what you see is what you pay. Smaller trades usually have less impact." },
  { q: "Does the basket rebalance?", a: "No. Each share holds fixed quantities of each stock. If one stock rises faster than the others, its weight grows. Weights drift with prices, and nothing is traded behind the scenes." },
  { q: "How do I sell or get my money out?", a: "Use the Sell tab to swap MANIA back into USDG in one transaction. If you'd rather hold the individual stock tokens, use Redeem, which sends you all seven." },
  { q: "What are Deposit and Redeem for?", a: "They're the direct route. If you already hold all seven stock tokens, Deposit turns them into MANIA. Redeem does the opposite. Most people should simply use Buy and Sell." },
  { q: "Can I lose money?", a: "Yes. Stock prices move, liquidity can be thin, and smart contracts carry risk. Only trade what you can afford to lose. This is not financial advice." },
  { q: "Who runs MANIA?", a: "The basket was created on The Index Blend, a protocol for on-chain portfolios. AssetX provides this trading interface; the contracts are Blend's and your wallet signs every transaction. AssetX never holds your funds." },
];

export default function ManiaAbout() {
  const [open, setOpen] = useState(0);
  return (
    <>
      <section className="bk-card bk-about" id="about">
        <span className="bk-eyebrow">New to baskets?</span>
        <h2>What is MANIA?</h2>
        <p className="bk-lead">
          MANIA is one token that holds a concentrated group of <b>semiconductor and AI-infrastructure stocks</b>. Instead
          of buying seven tokenized stocks one by one, you buy a single share of the basket. It lives on{" "}
          <span className="bk-inline-chain"><img src="/robinhood.png" alt="" />Robinhood Chain</span>, and you can trade it
          right here.
        </p>

        <div className="bk-letters">
          {LETTERS.map((x, i) => (
            <div className="bk-letter" key={i} style={{ "--c": COLORS[i] }}>
              <span className="bk-l">{x.l}</span>
              <div className="bk-letter-logos">
                <TokenLogo symbol={x.sym} size={26} />
                {x.sym2 && <TokenLogo symbol={x.sym2} size={26} />}
              </div>
              <b>{x.name}</b>
              <p>{x.why}</p>
            </div>
          ))}
        </div>
        <p className="bk-note-sm">The basket also holds TSMC (TSM), the foundry that manufactures chips for much of the industry.</p>

        <h3>The idea behind it</h3>
        <p className="bk-lead">
          A basket lets you act on a thesis without managing a pile of separate positions. Pick the assets, set the
          weights, and the whole portfolio becomes one on-chain instrument. MANIA expresses a view on:
        </p>
        <div className="bk-themes">{THEMES.map((t, i) => <span key={t} style={{ "--c": COLORS[i % COLORS.length] }}>{t}</span>)}</div>
      </section>

      <section className="bk-card bk-how">
        <h2>How it works</h2>
        <div className="bk-steps">
          {STEPS.map((s) => (
            <div className="bk-step" key={s.n} style={{ "--c": COLORS[[0, 2, 3][STEPS.indexOf(s)]] }}>
              <span className="bk-stepn">{s.n}</span>
              <b>{s.t}</b>
              <p>{s.d}</p>
              {s.link && <a href={s.link[0]} target="_blank" rel="noopener noreferrer">{s.link[1]}</a>}
            </div>
          ))}
        </div>
        <div className="bk-callouts">
          <div><b>Fixed quantities, no rebalancing</b><p>Each share holds set amounts of each stock. If one stock outperforms, it becomes a bigger part of the basket.</p></div>
          <div><b>One trade instead of seven</b><p>Buying and selling swap every stock atomically: the whole basket trades together or not at all.</p></div>
          <div><b>You stay in control</b><p>Your wallet signs every transaction. AssetX never holds your funds.</p></div>
        </div>
      </section>

      <section className="bk-card bk-faq">
        <h2>Questions, answered</h2>
        {FAQ.map((f, i) => (
          <div className={"bk-faq-i" + (open === i ? " open" : "")} key={f.q}>
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
              <span>{f.q}</span><i>{open === i ? "−" : "+"}</i>
            </button>
            {open === i && <p>{f.a}</p>}
          </div>
        ))}
      </section>
    </>
  );
}
