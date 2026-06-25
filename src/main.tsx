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
