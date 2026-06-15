import { useState, lazy, Suspense, useEffect } from "react";
import { motion } from "motion/react";
import { BrowserRouter, Routes, Route } from "react-router";
import { CartProvider } from "./CartContext";
import { CurrencyProvider } from "./CurrencyContext";
import { Toaster } from "react-hot-toast";
import { CartDrawer } from "./components/CartDrawer";
import { CookieConsent } from "./components/CookieConsent";
import { ThemeProvider } from "./components/theme/ThemeProvider";

// import.meta.env.BASE_URL is the Vite `base` config (e.g. "/LyricalmyricalWebsiteTrial/").
// Strip the trailing slash so React Router treats it as a basename.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Lazy-loaded components for performance
const MainSite = lazy(() => import("./components/MainSite"));
const Dashboard = lazy(() => import("./admin/Dashboard").then(m => ({ default: m.Dashboard })));
const Checkout = lazy(() => import("./Checkout").then(m => ({ default: m.Checkout })));
const BookDetail = lazy(() => import("./features/site/BookDetail"));
const PageView = lazy(() => import("./features/site/PageView").then(m => ({ default: m.PageView })));
const WishlistPage = lazy(() => import("./features/site/Wishlist"));
const CollectionPage = lazy(() => import("./features/site/CollectionPage"));
const AccountPage = lazy(() => import("./features/site/Account"));
const OrderTracking = lazy(() => import("./features/site/OrderTracking"));

function LoadingFallback() {
  return (
    <div className="h-screen w-full bg-[#030213] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/10 via-transparent to-blue-900/10" />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.05)]"
      >
        <span className="text-white text-xs tracking-widest font-bold">F✶M</span>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(0);
  const [showCatalog, setShowCatalog] = useState(false);

  // Redirect to basename if path is outside basename
  useEffect(() => {
    if (ROUTER_BASENAME && !window.location.pathname.startsWith(ROUTER_BASENAME)) {
      const targetPath = ROUTER_BASENAME + window.location.pathname + window.location.search + window.location.hash;
      window.location.replace(targetPath);
    }
  }, []);

  // Capture referral traffic source if present in query parameters or HTTP referrer
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        window.sessionStorage.setItem("referral_source", ref.toLowerCase());
      } else if (!window.sessionStorage.getItem("referral_source")) {
        const referrer = document.referrer;
        if (referrer) {
          try {
            const url = new URL(referrer);
            if (!url.hostname.includes(window.location.hostname)) {
              let source = url.hostname.replace("www.", "");
              if (source.includes("google")) source = "google";
              else if (source.includes("instagram")) source = "instagram";
              else if (source.includes("facebook")) source = "facebook";
              else if (source.includes("twitter") || source.includes("t.co")) source = "twitter";
              else if (source.includes("tiktok")) source = "tiktok";
              else if (source.includes("pinterest")) source = "pinterest";
              window.sessionStorage.setItem("referral_source", source);
            }
          } catch (e) {
            // Ignore URL parse errors
          }
        }
      }
    }
  }, []);

  const nextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <CurrencyProvider>
        <CartProvider>
          <BrowserRouter basename={ROUTER_BASENAME}>
          <CartDrawer />
          <CookieConsent />
          <Suspense fallback={<LoadingFallback />}>
                <Toaster 
                  position="top-center" 
                  toastOptions={{
                    style: {
                      background: '#171717',
                      color: '#fff',
                      fontSize: '12px',
                      letterSpacing: '0.05em',
                      zIndex: 99999,
                    },
                  }} 
                />
                <Routes>
                  <Route path="/" element={
                    <MainSite 
                      setShowCatalog={setShowCatalog}
                      showCatalog={showCatalog}
                      setCurrentPage={setCurrentPage}
                      currentPage={currentPage}
                      nextPage={nextPage}
                      prevPage={prevPage}
                    />
                  } />
                  <Route path="/books/:slug" element={<BookDetail />} />
                  <Route path="/collections/:slug" element={<CollectionPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/account/*" element={<AccountPage />} />
                  <Route path="/page/:slug" element={<PageView />} />
                  <Route path="/admin/*" element={<Dashboard />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/track" element={<OrderTracking />} />
                </Routes>
          </Suspense>
          </BrowserRouter>
        </CartProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
