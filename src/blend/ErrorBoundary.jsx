import { Component } from "react";

// Keeps a bug in the basket app from blanking the whole page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error("basket app error", e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eeece6", color: "#191916", fontFamily: "Inter, system-ui, sans-serif", textAlign: "center", padding: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ margin: "0 0 16px", color: "#77756b" }}>Your funds are safe. Please reload the page.</p>
          <button onClick={() => location.reload()} style={{ background: "#437a5d", color: "#fff", border: 0, borderRadius: 10, padding: "11px 18px", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
  }
}
