import { Component, type ReactNode } from "react";

/**
 * Last-resort guard so a rendering error shows a readable message instead of a blank page.
 * Inside the Studio preview iframe it also tells the editor what went wrong (PREVIEW_ERROR).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Storefront render error:", error);
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: "PREVIEW_ERROR", message: String(error?.message || error) }, window.location.origin);
      }
    } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const inPreview = typeof window !== "undefined" && window.location.search.includes("preview=true");
    return (
      <div role="alert" style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.3em", textTransform: "uppercase" }}>Something went wrong</p>
        <button onClick={() => window.location.reload()} style={{ border: "2px solid #fff", background: "#e8402a", color: "#100f0d", padding: "10px 20px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: 11 }}>
          Reload
        </button>
        {inPreview && <pre style={{ maxWidth: 560, whiteSpace: "pre-wrap", fontSize: 11, opacity: 0.7 }}>{String(this.state.error?.message || this.state.error)}</pre>}
      </div>
    );
  }
}
