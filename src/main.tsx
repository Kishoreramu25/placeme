import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress common ResizeObserver loop warnings that trigger tracers
const suppressResizeObserver = (e: ErrorEvent | PromiseRejectionEvent) => {
  const msg = 'message' in e ? e.message : (e.reason?.message || "");
  if (msg?.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    if ('preventDefault' in e) e.preventDefault();
  }
};
window.addEventListener('error', suppressResizeObserver);
window.addEventListener('unhandledrejection', suppressResizeObserver);

createRoot(document.getElementById("root")!).render(<App />);
