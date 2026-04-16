import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { HashRouter, Routes, Route } from "react-router";
import { CartProvider } from "./CartContext";
import { Toaster } from "react-hot-toast";
import { CartDrawer } from "./components/CartDrawer";

// Lazy-loaded components for performance
const MainSite = lazy(() => import("./components/MainSite"));
const Dashboard = lazy(() => import("./admin/Dashboard").then(m => ({ default: m.Dashboard })));
const Checkout = lazy(() => import("./Checkout").then(m => ({ default: m.Checkout })));
const BookDetail = lazy(() => import("./features/site/BookDetail"));

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

  const nextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : 0));
  };

  return (
    <CartProvider>
      <HashRouter>
        <CartDrawer />
        <Suspense fallback={<LoadingFallback />}>
              <Toaster 
                position="top-center" 
                toastOptions={{
                  style: {
                    background: '#171717',
                    color: '#fff',
                    fontSize: '12px',
                    letterSpacing: '0.05em',
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
                <Route path="/admin/*" element={<Dashboard />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
        </Suspense>
      </HashRouter>
    </CartProvider>
  );
}
