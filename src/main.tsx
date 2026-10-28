import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n/i18n";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Defer analytics — PostHog must never compete with first paint or block the main
// thread. It loads as its own chunk once the page is idle.
const startAnalytics = () => {
  import("@/lib/posthog").then((m) => m.initPostHog()).catch(() => {});
};
if (typeof window !== "undefined") {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (ric) ric(startAnalytics, { timeout: 4000 });
  else setTimeout(startAnalytics, 2500);
}

// A new deploy changes the hashed chunk filenames. A tab opened BEFORE the deploy
// then fails to lazy-load a route chunk with "Failed to fetch dynamically imported
// module". Vite fires `vite:preloadError` for exactly this — swallow it and reload
// once to pick up the fresh chunk manifest. Guarded so a genuinely-missing chunk
// can't trigger a reload loop.
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const KEY = "hc:preload-reload-at";
    try {
      const last = Number(sessionStorage.getItem(KEY) || "0");
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}
