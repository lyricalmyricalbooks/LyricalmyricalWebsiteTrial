import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const STORAGE_KEY = "lm:cookie-consent";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

function writeConsent(c: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    window.dispatchEvent(new CustomEvent("lm:consent-change", { detail: c }));
  } catch {
    // localStorage unavailable; nothing we can do
  }
}

export function CookieConsent() {
  const [decided, setDecided] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    setDecided(!!existing);
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  const decide = (accepted: { analytics: boolean; marketing: boolean }) => {
    writeConsent({
      necessary: true,
      analytics: accepted.analytics,
      marketing: accepted.marketing,
      decidedAt: new Date().toISOString(),
    });
    setDecided(true);
  };

  return (
    <AnimatePresence>
      {!decided && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label="Cookie consent"
          className="fixed bottom-3 left-3 right-3 z-[150] overflow-hidden border-2 border-[#171B18] bg-[#F1E8D2]/95 p-5 text-[#171B18] shadow-[8px_8px_0_#285DA8] backdrop-blur-md md:bottom-7 md:left-auto md:right-8 md:max-w-[30rem] md:p-6"
        >
          <div className="absolute right-0 top-0 h-20 w-20 bg-[radial-gradient(#F04A3A_1px,transparent_1.5px)] bg-[length:5px_5px] opacity-60" aria-hidden="true" />
          <p className="mb-3 inline-flex -rotate-1 border-2 border-[#171B18] bg-[#F0B93A] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.28em] shadow-[3px_3px_0_#171B18]">
            Your privacy
          </p>
          <h2 className="mb-2 text-3xl font-black uppercase leading-none tracking-[-0.04em]">
            Cookies, <span className="text-[#F04A3A] drop-shadow-[1.5px_1.5px_0_#285DA8]">your call.</span>
          </h2>
          <p className="mb-5 max-w-md text-sm font-medium leading-relaxed text-[#625F55]">
            We use cookies to keep the site running, measure traffic, and improve your
            experience. You can choose which categories to allow.
          </p>

          {showDetails && (
            <div className="mb-5 space-y-2 border-y-2 border-[#171B18] py-4 text-xs text-[#625F55]">
              <label className="flex items-start gap-3 opacity-60">
                <input type="checkbox" checked disabled className="mt-0.5 accent-[#F04A3A]" />
                <span>
                  <strong className="text-[#171B18]">Necessary</strong> — required for the
                  cart and checkout to work.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={e => setAnalytics(e.target.checked)}
                  className="mt-0.5 accent-[#F04A3A]"
                />
                <span>
                  <strong className="text-[#171B18]">Analytics</strong> — anonymous usage
                  statistics so we can improve the site.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={e => setMarketing(e.target.checked)}
                  className="mt-0.5 accent-[#F04A3A]"
                />
                <span>
                  <strong className="text-[#171B18]">Marketing</strong> — personalized
                  content and abandoned-cart reminders.
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => decide({ analytics: true, marketing: true })}
              className="min-w-[130px] flex-1 border-2 border-[#171B18] bg-[#F04A3A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#171B18] shadow-[3px_3px_0_#171B18] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285DA8]"
            >
              Accept all
            </button>
            <button
              onClick={() => decide({ analytics: false, marketing: false })}
              className="min-w-[120px] flex-1 border-2 border-[#171B18] bg-[#FAF3E3] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#171B18] transition-colors hover:bg-[#F0B93A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285DA8]"
            >
              Reject
            </button>
            {showDetails ? (
              <button
                onClick={() => decide({ analytics, marketing })}
                className="min-w-[130px] flex-1 border-2 border-[#171B18] bg-[#F04A3A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#171B18] shadow-[3px_3px_0_#171B18] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285DA8]"
              >
                Save choices
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#625F55] underline decoration-2 underline-offset-4 transition-colors hover:text-[#285DA8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285DA8]"
              >
                Customize
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsent;
