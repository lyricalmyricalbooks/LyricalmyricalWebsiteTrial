import React, { createContext, useContext, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type Currency = "CAD" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>;
  convertPrice: (priceInCAD: number) => number;
  formatPrice: (priceInCAD: number) => string;
  getBookPrice: (book: any, ignoreSale?: boolean) => number;
  formatBookPrice: (book: any, ignoreSale?: boolean) => string;
  getVariantPrice: (variant: any, parentBook?: any) => number;
  formatVariantPrice: (variant: any, parentBook?: any) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Initial fallback rates based on recent exchange constants
const FALLBACK_RATES: Record<Currency, number> = {
  CAD: 1.0,
  USD: 0.73,
  EUR: 0.67,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  CAD: "CA$ ",
  USD: "$ ",
  EUR: "€ ",
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("CAD");
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("fm_currency", c);
  };

  // Determine initial currency from localStorage or timezone geolocation
  useEffect(() => {
    const saved = localStorage.getItem("fm_currency") as Currency | null;
    if (saved && ["CAD", "USD", "EUR"].includes(saved)) {
      setCurrencyState(saved);
      return;
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("America/Toronto") || tz.includes("America/Vancouver") || tz.includes("Canada")) {
        setCurrencyState("CAD");
      } else if (tz.includes("Europe") || tz.includes("Atlantic") || tz.includes("GMT")) {
        setCurrencyState("EUR");
      } else if (tz.includes("America") || tz.includes("US")) {
        setCurrencyState("USD");
      } else {
        setCurrencyState("CAD"); // Default to CAD
      }
    } catch {
      setCurrencyState("CAD");
    }
  }, []);

  // Fetch live exchange rates from Open Exchange Rates API (free, no key required)
  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/CAD");
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            setRates({
              CAD: 1.0,
              USD: data.rates.USD || FALLBACK_RATES.USD,
              EUR: data.rates.EUR || FALLBACK_RATES.EUR,
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch live exchange rates, using static fallbacks:", err);
      }
    }
    fetchRates();
  }, []);

  const convertPrice = (priceInCAD: number) => {
    return priceInCAD * (rates[currency] || FALLBACK_RATES[currency]);
  };

  const formatPrice = (priceInCAD: number) => {
    const converted = convertPrice(priceInCAD);
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${converted.toFixed(2)}`;
  };

  const getBookPrice = (book: any, ignoreSale: boolean = false) => {
    if (!book) return 0;
    const basePrice = book.retailPrice || 0;
    const salePrice = book.salePrice || 0;
    const isOnSale = !ignoreSale && book.isOnSale && salePrice > 0;
    const priceToUse = isOnSale ? salePrice : basePrice;

    if (currency === "USD") {
      const usdOverride = isOnSale ? book.usdSalePrice : book.usdPrice;
      if (usdOverride !== undefined && usdOverride > 0) return usdOverride;
    } else if (currency === "EUR") {
      const eurOverride = isOnSale ? book.eurSalePrice : book.eurPrice;
      if (eurOverride !== undefined && eurOverride > 0) return eurOverride;
    }

    return priceToUse * (rates[currency] || 1.0);
  };

  const formatBookPrice = (book: any, ignoreSale: boolean = false) => {
    const price = getBookPrice(book, ignoreSale);
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${price.toFixed(2)}`;
  };

  const getVariantPrice = (variant: any, parentBook?: any) => {
    if (!variant) return 0;
    if (currency === "USD" && variant.usdPrice !== undefined && variant.usdPrice > 0) {
      return variant.usdPrice;
    }
    if (currency === "EUR" && variant.eurPrice !== undefined && variant.eurPrice > 0) {
      return variant.eurPrice;
    }
    const base = variant.price || (parentBook ? (parentBook.isOnSale ? parentBook.salePrice : parentBook.retailPrice) : 0);
    return base * (rates[currency] || 1.0);
  };

  const formatVariantPrice = (variant: any, parentBook?: any) => {
    const price = getVariantPrice(variant, parentBook);
    const symbol = CURRENCY_SYMBOLS[currency];
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ 
      currency, 
      setCurrency, 
      rates, 
      convertPrice, 
      formatPrice,
      getBookPrice,
      formatBookPrice,
      getVariantPrice,
      formatVariantPrice
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
};

// Reusable CurrencySelector UI Dropdown Component
export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full px-3 py-1.5 transition-all text-white/50 hover:text-white group relative">
      <span className="text-[8px] font-black tracking-widest uppercase text-slate-500">CURRENCY</span>
      <div className="flex items-center gap-1">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as Currency)}
          aria-label="Select currency"
          className="bg-transparent border-none outline-none text-[9px] font-black tracking-widest text-white cursor-pointer uppercase appearance-none pr-4"
        >
          <option value="CAD" className="bg-[#050508] text-white">CAD</option>
          <option value="USD" className="bg-[#050508] text-white">USD</option>
          <option value="EUR" className="bg-[#050508] text-white">EUR</option>
        </select>
        <ChevronDown size={10} className="absolute right-3 pointer-events-none text-white/40 group-hover:text-white/80 transition-colors" />
      </div>
    </div>
  );
}
