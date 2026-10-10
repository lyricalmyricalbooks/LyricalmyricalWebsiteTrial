import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "../../lib/firebase";
import { adminApi } from "./api";
import { catalogToCsv } from "./bulkPricing";
import { buildCustomers, customersToCsv } from "./customerInsights";
import { exportOrdersCsv } from "./orderCsv";
import { describeBackup, type BackupRecord } from "./backupStatus";
import { SecondaryButton, SectionCard, StatusBadge } from "./riso/components";

const today = () => new Date().toISOString().slice(0, 10);

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// Settings › General › Backups & export: the nightly backup's last result and one-click
// downloads of the catalog, customers and orders (built in the browser from admin reads).
export function BackupsExportCard() {
  const [record, setRecord] = useState<BackupRecord | undefined>(undefined);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    getDoc(doc(db, "systemStatus", "backup"))
      .then((snap) => setRecord(snap.exists() ? (snap.data() as BackupRecord) : null))
      .catch(() => setRecord(null));
  }, []);

  const run = async (kind: string, make: () => Promise<[string, string, string] | null>) => {
    setBusy(kind);
    try {
      const file = await make();
      if (!file) { toast.error("Nothing to export yet."); return; }
      download(...file);
      toast.success("Download ready.");
    } catch (err: any) {
      toast.error(err?.message || "Export failed.");
    } finally { setBusy(""); }
  };
  const realOrders = async () => (await adminApi.getAllOrders()).filter((o: any) => o.isTest !== true);

  const view = record === undefined ? null : describeBackup(record);
  return (
    <SectionCard title="Backups & export" description="The whole database is copied to your storage bucket every night. You can also download your own copies at any time.">
      <p style={{ margin: "0 0 16px" }}>
        {view ? <><StatusBadge tone={view.tone}>{view.label}</StatusBadge> <span className="rp-hint">{view.detail}</span></> : <span className="rp-hint">Checking the last backup…</span>}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("books-csv", async () => {
          const books = await adminApi.getAllBooks();
          return books.length ? [`catalog-${today()}.csv`, catalogToCsv(books), "text/csv;charset=utf-8"] : null;
        })}>{busy === "books-csv" ? "Preparing…" : "Catalog (CSV)"}</SecondaryButton>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("books-json", async () => {
          const books = await adminApi.getAllBooks();
          return books.length ? [`catalog-${today()}.json`, JSON.stringify(books.map(({ _lastDoc, ...b }: any) => b), null, 2), "application/json"] : null;
        })}>{busy === "books-json" ? "Preparing…" : "Catalog (JSON)"}</SecondaryButton>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("customers", async () => {
          const rows = buildCustomers(await realOrders());
          return rows.length ? [`customers-${today()}.csv`, customersToCsv(rows), "text/csv;charset=utf-8"] : null;
        })}>{busy === "customers" ? "Preparing…" : "Customers (CSV)"}</SecondaryButton>
        <SecondaryButton size="sm" disabled={!!busy} onClick={() => run("orders", async () => {
          const orders = await realOrders();
          return orders.length ? [`orders-${today()}.csv`, exportOrdersCsv(orders, { paidOnly: false }), "text/csv;charset=utf-8"] : null;
        })}>{busy === "orders" ? "Preparing…" : "Orders (CSV)"}</SecondaryButton>
      </div>
      <p className="rp-hint" style={{ margin: "12px 0 0" }}>Exports leave out test orders. Orders include unpaid and cancelled ones; Orders › Table view exports only paid and refunded orders.</p>
    </SectionCard>
  );
}
