import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getCopy } from "./storeCopy";

export function isValidAlertEmail(value: string) {
  return /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(value.trim()) && value.length <= 254;
}

/** The alert's document id; firestore.rules requires exactly this shape, so one address gets one alert per edition. */
export function stockAlertId(email: string, bookId: string, variantId = "") {
  return `${email.trim().toLowerCase()}__${bookId}__${variantId}`;
}

/** "Notify me when back in stock" signup shown on sold-out product pages. */
export default function BackInStockForm({
  design,
  bookId,
  bookTitle,
  variantId,
  variantName,
}: {
  design?: any;
  bookId: string;
  bookTitle: string;
  variantId?: string;
  variantName?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAlertEmail(email)) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const clean = email.trim().toLowerCase();
      // One alert per address + book + edition (the id); asking twice is already done.
      await setDoc(doc(db, "stockAlerts", stockAlertId(clean, bookId, variantId || "")), {
        email: clean,
        bookId,
        bookTitle,
        variantId: variantId || "",
        variantName: variantName || "",
        status: "waiting",
        createdAt: new Date().toISOString(),
      }).catch((err: any) => { if (err?.code !== "permission-denied") throw err; });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div
      className="mt-4 rounded-2xl border border-white/[0.08] p-4"
      data-studio-target="style:productPage|copy:Product page"
      data-studio-label="Back-in-stock signup"
    >
      <p className="text-[11px] font-black tracking-[0.2em] uppercase">{getCopy(design, "alertHeading")}</p>
      {status === "success" ? (
        <p role="status" className="mt-2 text-sm opacity-80">{getCopy(design, "alertSuccess")}</p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row" noValidate>
          <input
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder={getCopy(design, "alertPlaceholder")}
            aria-label={getCopy(design, "alertPlaceholder")}
            autoComplete="email"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-transparent px-4 py-3 text-sm outline-none focus:border-white/40"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-xl border border-white/30 px-5 py-3 text-[11px] font-black tracking-[0.2em] uppercase transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {status === "loading" ? "…" : getCopy(design, "alertButton")}
          </button>
        </form>
      )}
      {status === "error" && (
        <p role="alert" className="mt-2 text-xs opacity-80">{getCopy(design, "alertError")}</p>
      )}
    </div>
  );
}
