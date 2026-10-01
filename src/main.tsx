
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { startPreviewTab } from "./app/features/site/previewTab";

  // Studio › "Preview in new tab": receive the unsaved draft (no-op for shoppers).
  startPreviewTab();

  createRoot(document.getElementById("root")!).render(<App />);
  
