import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress common ResizeObserver loop warnings that trigger tracers
window.addEventListener('error', e => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.' || 
      e.message === 'ResizeObserver loop limit exceeded') {
    e.stopImmediatePropagation();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
