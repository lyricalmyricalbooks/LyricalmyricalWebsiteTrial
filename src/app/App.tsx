import { useState, lazy, Suspense } from "react";
import { HashRouter, Routes, Route } from "react-router";
import { CartProvider } from "./CartContext";
import { CartDrawer } from "./components/CartDrawer";

// Lazy-loaded components for performance
const MainSite = lazy(() => import("./components/MainSite"));
const Dashboard = lazy(() => import("./admin/Dashboard").then(m => ({ default: m.Dashboard })));
const Checkout = lazy(() => import("./Checkout").then(m => ({ default: m.Checkout })));

function LoadingFallback() {
  return (
    <div className="h-screen w-full bg-white flex items-center justify-center">
      <div className="text-[10px] tracking-[.4em] animate-pulse text-black uppercase">
        Initializing...
      </div>
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
            <Route path="/admin/*" element={<Dashboard />} />
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </CartProvider>
  );
}

