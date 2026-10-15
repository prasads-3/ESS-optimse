
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hosted Inter (latin subset, font-display: swap). Replaces the
// render-blocking Google Fonts CDN request. Only the weights actually used
// across the app are bundled: 400/500/600/700.
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./index.css";

// This app ships no PWA / service worker. But a stale worker from an earlier
// build (or a previous app on this host) can keep intercepting fetches and
// serve an outdated cached bundle — surfacing as a blank page or
// "Class extends value undefined". index.html is served no-store, so this
// fresh entry always runs: proactively unregister any lingering worker and
// wipe its caches so the live, worker-free assets are used from here on.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister()))
    .catch(() => { /* ignore */ });
  if (window.caches) {
    caches.keys()
      .then((keys) => keys.forEach((key) => caches.delete(key)))
      .catch(() => { /* ignore */ });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
