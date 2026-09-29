import { motion } from "motion/react";
import { StorefrontThemeStyle } from "../features/site/StorefrontThemeStyle";
import { readCachedDesign } from "../features/site/useSiteData";
import { getCopy } from "../features/site/storeCopy";

/** Riso boot/loading splash — colors, wordmark and copy all come from the saved design. */
export function BootSplash() {
  const design = readCachedDesign();
  return (
    <div data-fm-store className="fm-page h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ color: "rgb(var(--fg-rgb))" }} aria-label={getCopy(design, "loadingAria")}>
      <StorefrontThemeStyle design={design} />
      <div className="absolute -left-[8vw] top-[12vh] h-44 w-[62vw] -rotate-6 bg-[var(--accent)] opacity-90 mix-blend-screen" />
      <div className="absolute -right-[10vw] bottom-[10vh] h-48 w-[64vw] rotate-6 bg-[var(--accent-2)] opacity-80 mix-blend-screen" />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex w-[min(86vw,34rem)] flex-col items-center"
      >
        <span className="mb-7 rotate-1 border-2 border-[var(--rp-outline)] bg-[var(--warning)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#100f0d] shadow-[4px_4px_0_var(--accent)]">
          {getCopy(design, "loadingTag")}
        </span>
        <p className="text-center text-[clamp(3.4rem,12vw,7.5rem)] font-black uppercase leading-[0.72] tracking-[-0.075em] drop-shadow-[3px_3px_0_var(--accent)]">
          {getCopy(design, "loadingWordmarkA")}<span className="text-[var(--accent)]">{getCopy(design, "loadingWordmarkB")}</span>
        </p>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.64em]">{getCopy(design, "loadingSub")}</p>
        <div className="mt-12 h-2 w-full overflow-hidden border border-[var(--rp-outline)]" aria-hidden="true">
          <motion.div
            className="h-full w-1/3 bg-[var(--accent)]"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <span className="mt-3 self-start text-[9px] font-black uppercase tracking-[0.32em]">{getCopy(design, "loadingStatus")}</span>
      </motion.div>
    </div>
  );
}


export default BootSplash;
