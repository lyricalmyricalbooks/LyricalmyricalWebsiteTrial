import { useState } from "react";
import { catalogPublishIssues } from "./catalogPublishReview";
import { Dialog, Checkbox, PrimaryButton, SecondaryButton, StatusBadge } from "./riso/components";
export function CatalogReviewDialog({ books, action, onClose, onConfirm }: { books: any[]; action: "publish" | "draft"; onClose: () => void; onConfirm: (books: any[]) => Promise<void> }) {
  const [selected, setSelected] = useState(() => books.filter(book => action === "draft" || !catalogPublishIssues(book).some(issue => issue.blocking)).map(book => book.id));
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = books.filter(book => selected.includes(book.id));
  return <Dialog open onClose={() => { if (!busy) onClose(); }} title={action === "publish" ? "Review before publishing" : "Review move to draft"} description={action === "draft" ? "Selected records will leave the shop, recommendations and sitemap. Their content, inventory and order history are preserved." : "Review each book. Fix price/title errors before publishing; confirm other warnings intentionally."} footer={<><SecondaryButton disabled={busy} onClick={onClose}>Cancel</SecondaryButton><PrimaryButton disabled={busy || !reviewed || !chosen.length} onClick={async () => { setBusy(true); try { await onConfirm(chosen); } finally { setBusy(false); } }}>{busy ? "Applying…" : `${action === "publish" ? "Publish" : "Move to draft"} ${chosen.length}`}</PrimaryButton></>}>
    <div className="rp-stack">
      {books.map(book => { const issues = catalogPublishIssues(book); const blocked = action === "publish" && issues.some(issue => issue.blocking); return <div key={book.id} className="rp-stack">
        <Checkbox label={book.title || "Untitled book"} disabled={busy || blocked} checked={selected.includes(book.id)} onChange={() => { setReviewed(false); setSelected(previous => previous.includes(book.id) ? previous.filter(id => id !== book.id) : [...previous, book.id]); }} />
        <StatusBadge tone={blocked ? "danger" : issues.length ? "warning" : "success"}>{blocked ? "Fix before publishing" : issues.length ? `${issues.length} review warnings` : "Complete"}</StatusBadge>
        <ul className="rp-hint">{issues.map(issue => <li key={issue.key}>{issue.message}</li>)}</ul>
      </div>; })}
      <Checkbox label={action === "publish" ? "I reviewed the selected books and accept their content warnings." : "I reviewed this selection and want these records moved to draft."} checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} />
    </div>
  </Dialog>;
}
