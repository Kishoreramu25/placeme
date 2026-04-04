import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress common ResizeObserver loop warnings that trigger tracers
const suppressResizeObserver = (e: ErrorEvent | PromiseRejectionEvent) => {
  const rawReason = 'reason' in e ? e.reason : "";
  const msg = 'message' in e
    ? (e.message || "")
    : typeof rawReason === "string"
      ? rawReason
      : (rawReason?.message || "");
  if (
    msg?.includes('ResizeObserver loop') ||
    msg?.includes('ResizeObserver loop completed with undelivered notifications')
  ) {
    e.stopImmediatePropagation();
    if ('preventDefault' in e) e.preventDefault();
  }
};
window.addEventListener('error', suppressResizeObserver);
window.addEventListener('unhandledrejection', suppressResizeObserver);

createRoot(document.getElementById("root")!).render(<App />);
