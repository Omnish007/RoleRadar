import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RendererErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RoleRadar render failure]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main style={{ maxWidth: 900, margin: "48px auto", padding: 24, color: "#20242c", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ marginBottom: 8 }}>RoleRadar could not render</h1>
        <p style={{ color: "#66717e" }}>A renderer component threw an error. The details are shown below and in the Electron DevTools console.</p>
        <pre style={{ padding: 16, overflow: "auto", whiteSpace: "pre-wrap", background: "#fff1f0", border: "1px solid #f1d4d1", borderRadius: 8 }}>{this.state.error.stack || this.state.error.message}</pre>
        <button style={{ padding: "9px 14px", border: 0, borderRadius: 6, background: "#3568d4", color: "white", cursor: "pointer" }} onClick={() => window.location.reload()}>Reload RoleRadar</button>
        <p style={{ color: "#66717e", fontSize: 12 }}>Development shortcut: press F12 or Ctrl+Shift+I to open DevTools.</p>
      </main>
    );
  }
}
