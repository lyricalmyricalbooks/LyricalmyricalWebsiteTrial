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
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[150] bg-neutral-950/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 text-white"
        >
          <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-white/50 mb-2">
            Cookies
          </p>
          <p className="text-sm leading-relaxed text-white/80 mb-4">
            We use cookies to keep the site running, measure traffic, and improve your
            experience. You can choose which categories to allow.
          </p>

          {showDetails && (
            <div className="space-y-2 mb-4 text-xs text-white/70">
              <label className="flex items-start gap-3 opacity-60">
                <input type="checkbox" checked disabled className="mt-1 accent-white" />
                <span>
                  <strong className="text-white">Necessary</strong> — required for the
                  cart and checkout to work.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={e => setAnalytics(e.target.checked)}
                  className="mt-1 accent-white"
                />
                <span>
                  <strong className="text-white">Analytics</strong> — anonymous usage
                  statistics so we can improve the site.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={e => setMarketing(e.target.checked)}
                  className="mt-1 accent-white"
                />
                <span>
                  <strong className="text-white">Marketing</strong> — personalized
                  content and abandoned-cart reminders.
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => decide({ analytics: true, marketing: true })}
              className="flex-1 min-w-[120px] px-4 py-2.5 rounded-full bg-white text-black text-[10px] tracking-[0.25em] font-bold uppercase hover:bg-white/90 transition-colors"
            >
              Accept all
            </button>
            <button
              onClick={() => decide({ analytics: false, marketing: false })}
              className="flex-1 min-w-[120px] px-4 py-2.5 rounded-full bg-white/5 text-white text-[10px] tracking-[0.25em] font-bold uppercase border border-white/15 hover:bg-white/10 transition-colors"
            >
              Reject
            </button>
            {showDetails ? (
              <button
                onClick={() => decide({ analytics, marketing })}
                className="flex-1 min-w-[120px] px-4 py-2.5 rounded-full bg-white/5 text-white text-[10px] tracking-[0.25em] font-bold uppercase border border-white/15 hover:bg-white/10 transition-colors"
              >
                Save choices
              </button>
            ) : (
              <button
                onClick={() => setShowDetails(true)}
                className="px-3 py-2.5 text-[10px] tracking-[0.25em] uppercase text-white/50 hover:text-white transition-colors"
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
