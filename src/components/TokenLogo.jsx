import { useEffect, useState } from "react";
import { logoFor, monogramColor } from "../tokenMeta";

// Shared, module-level cache of logo load results.
//
// Why this exists: every pill and every dropdown row mounts its own <img> and
// they all request the same file at once. Remembering a success avoids
// re-requesting, and remembering a failure avoids hammering a 404.
//
// IMPORTANT: failures are cached with a TIMESTAMP and expire. Previously a
// "fail" was permanent for the page session, which meant symbols that failed
// under the old CDN kept showing monograms even after the logo source was
// fixed — only a hard reload cleared it. Successes are cached forever (a file
// that loaded once won't stop existing); failures retry after FAIL_TTL_MS.
const OK = new Map();          // symbol -> true
const FAILED = new Map();      // symbol -> timestamp of failure
const FAIL_TTL_MS = 60_000;    // retry a failed logo after a minute

function cachedState(key) {
  if (OK.get(key)) return "ok";
  const failedAt = FAILED.get(key);
  if (failedAt && Date.now() - failedAt < FAIL_TTL_MS) return "fail";
  return "try";
}

export default function TokenLogo({ symbol, size = 26, src }) {
  const key = (symbol || "").toUpperCase();
  const [state, setState] = useState(() => cachedState(key));
  const [attempt, setAttempt] = useState(0);

  // Reset when the symbol changes (the selector pill is a long-lived instance).
  useEffect(() => {
    setState(cachedState(key));
    setAttempt(0);
  }, [key]);

  const dim = { width: size, height: size };

  if (state === "fail") {
    return (
      <span
        className="logo mono"
        style={{ ...dim, background: monogramColor(key), fontSize: Math.round(size * 0.38) }}
      >
        {key.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      key={`${key}-${attempt}`}
      className="logo"
      style={dim}
      src={src || logoFor(key)}
      alt={key}
      loading="lazy"
      onLoad={() => {
        OK.set(key, true);
        FAILED.delete(key);
        if (state !== "ok") setState("ok");
      }}
      onError={() => {
        // One retry before falling back — covers transient throttling.
        if (attempt < 1) {
          setTimeout(() => setAttempt((a) => a + 1), 400);
        } else {
          FAILED.set(key, Date.now());
          setState("fail");
        }
      }}
    />
  );
}
