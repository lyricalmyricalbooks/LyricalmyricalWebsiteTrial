import React, { createContext, useContext, useState, useEffect } from "react";

export type Currency = "CAD" | "USD" | "EUR";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<Currency, number>;
  convertPrice: (priceInCAD: number) => number;
  formatPrice: (priceInCAD: number) => string;
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

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convertPrice, formatPrice }}>
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
    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 hover:border-violet-500/30 transition-all group">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">CURRENCY</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        aria-label="Select currency"
        className="bg-transparent border-none outline-none text-[10px] font-black tracking-widest text-white cursor-pointer uppercase appearance-none"
      >
        <option value="CAD" className="bg-[#0A0A0B] text-white">CAD (CA$)</option>
        <option value="USD" className="bg-[#0A0A0B] text-white">USD ($)</option>
        <option value="EUR" className="bg-[#0A0A0B] text-white">EUR (€)</option>
      </select>
    </div>
  );
}
