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
          aria-modal="false"
          className="fixed bottom-3 left-3 right-3 z-[150] overflow-hidden border-2 border-[#100f0d] bg-[#faf6ec] p-5 text-[#100f0d] shadow-[6px_6px_0_#100f0d] md:bottom-7 md:left-auto md:right-8 md:max-w-[30rem] md:p-6"
        >
          <p className="mb-3 inline-flex -rotate-1 border-2 border-[#100f0d] bg-[#ffc93c] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.28em] shadow-[3px_3px_0_#100f0d]">
            Your privacy
          </p>
          <h2 className="mb-2 text-3xl uppercase leading-none" style={{ fontFamily: "'Anton', Impact, sans-serif", fontWeight: 400 }}>
            Cookies, <span className="text-[#b4271a]">your call.</span>
          </h2>
          <p className="mb-5 max-w-md text-sm font-medium leading-relaxed text-[#5f5950]">
            We use cookies to keep the site running, measure traffic, and improve your
            experience. You can choose which categories to allow.
          </p>

          {showDetails && (
            <div className="mb-5 space-y-2 border-y-2 border-[#100f0d] py-4 text-xs text-[#5f5950]">
              <label className="flex items-start gap-3 opacity-60">
                <input type="checkbox" checked disabled className="mt-0.5 accent-[#e8402a]" />
                <span>
                  <strong className="text-[#100f0d]">Necessary</strong> — required for the
                  cart and checkout to work.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={e => setAnalytics(e.target.checked)}
                  className="mt-0.5 accent-[#e8402a]"
                />
                <span>
                  <strong className="text-[#100f0d]">Analytics</strong> — anonymous usage
                  statistics so we can improve the site.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={e => setMarketing(e.target.checked)}
                  className="mt-0.5 accent-[#e8402a]"
                />
                <span>
                  <strong className="text-[#100f0d]">Marketing</strong> — personalized
                  content and abandoned-cart reminders.
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => decide({ analytics: true, marketing: true })}
              className="min-w-[130px] flex-1 border-2 border-[#100f0d] bg-[#e8402a] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#100f0d] shadow-[3px_3px_0_#100f0d] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3fe0]"
            >
              Accept all
            </button>
            <button
              onClick={() => decide({ analytics: false, marketing: false })}
              className="min-w-[120px] flex-1 border-2 border-[#100f0d] bg-[#ffffff] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#100f0d] transition-colors hover:bg-[#ffc93c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3fe0]"
            >
              Reject
            </button>
            {showDetails ? (
              <button
                onClick={() => decide({ analytics, marketing })}
                className="min-w-[130px] flex-1 border-2 border-[#100f0d] bg-[#e8402a] px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#100f0d] shadow-[3px_3px_0_#100f0d] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3fe0]"
              >
                Save choices
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5950] underline decoration-2 underline-offset-4 transition-colors hover:text-[#1b3fe0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3fe0]"
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
