import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import { RendererErrorBoundary } from "./renderer-error-boundary";
import "./styles.css";

window.addEventListener("error", event => {
  console.error("[RoleRadar window error]", event.message, event.error);
});
window.addEventListener("unhandledrejection", event => {
  console.error("[RoleRadar unhandled rejection]", event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("RoleRadar renderer root element was not found.");

console.info("[RoleRadar] Renderer entry loaded; mounting React.");
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RendererErrorBoundary>
      <App />
    </RendererErrorBoundary>
  </React.StrictMode>
);
