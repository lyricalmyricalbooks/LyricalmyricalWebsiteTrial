import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { getCopy } from "./storeCopy";

export function isValidAlertEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 254;
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
      await addDoc(collection(db, "stockAlerts"), {
        email: email.trim().toLowerCase(),
        bookId,
        bookTitle,
        variantId: variantId || "",
        variantName: variantName || "",
        status: "waiting",
        createdAt: new Date().toISOString(),
      });
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
