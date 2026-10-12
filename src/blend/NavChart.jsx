import { useMemo, useRef, useState } from "react";

const usd = (n) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const W = 640, H = 300, PAD = { l: 8, r: 8, t: 14, b: 14 };

// Minimal responsive area chart (no chart library). Hover/touch for a crosshair.
export default function NavChart({ points }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);

  const g = useMemo(() => {
    if (!points || points.length < 2) return null;
    const xs = points.map((p) => p.ts), ys = points.map((p) => p.nav);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const lo = Math.min(...ys), hi = Math.max(...ys);
    const padY = (hi - lo || hi * 0.02) * 0.12;
    const yMin = lo - padY, yMax = hi + padY;
    const X = (t) => PAD.l + ((t - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r);
    const Y = (v) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);
    const pts = points.map((p) => [X(p.ts), Y(p.nav)]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${H - PAD.b} L${pts[0][0].toFixed(1)} ${H - PAD.b} Z`;
    return { pts, line, area, yMin, yMax, Y };
  }, [points]);

  if (!g) return <div className="bk-chart-empty">Price history is loading…</div>;

  function move(e) {
    const rect = ref.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const x = (cx / rect.width) * W;
    let best = 0, bd = Infinity;
    g.pts.forEach((p, i) => { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  }

  const up = points[points.length - 1].nav >= points[0].nav;
  const col = up ? "var(--bk-green)" : "var(--bk-red)";
  const hp = hover != null ? g.pts[hover] : null;
  const hv = hover != null ? points[hover] : null;

  return (
    <div className="bk-chart" onMouseLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseMove={move} onTouchMove={move} onTouchEnd={() => setHover(null)}>
        <defs>
          <linearGradient id="bkfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.16" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} className="bk-gl" />
        ))}
        <path d={g.area} fill="url(#bkfill)" />
        <path d={g.line} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {hp && (
          <>
            <line x1={hp[0]} x2={hp[0]} y1="0" y2={H} className="bk-cross" vectorEffect="non-scaling-stroke" />
            <circle cx={hp[0]} cy={hp[1]} r="4" fill={col} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
      {hv && (
        <div className="bk-tip" style={{ left: `${(hp[0] / W) * 100}%` }}>
          <b>{usd(hv.nav)}</b>
          <span>{new Date(hv.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      )}
      <div className="bk-chart-ends">
        <div><small>Start</small><b>{usd(points[0].nav)}</b></div>
        <div><small>Now</small><b>{usd(points[points.length - 1].nav)}</b></div>
      </div>
    </div>
  );
}
