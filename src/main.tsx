
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { startPreviewTab } from "./app/features/site/previewTab";
  import { captureSharedDiscount } from "./app/features/site/sharedDiscount";

  // Studio › "Preview in new tab": receive the unsaved draft (no-op for shoppers).
  startPreviewTab();
  // Admin › Discounts › Copy share link: remember ?discount=CODE for checkout and tidy the address.
  captureSharedDiscount();

  createRoot(document.getElementById("root")!).render(<App />);
  
