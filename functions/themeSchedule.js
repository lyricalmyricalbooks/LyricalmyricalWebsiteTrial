// Scheduled publishing & campaigns (Studio 3.5). Studio writes admin-only `themeSchedule/{id}` entries:
//   { kind: "publish" | "campaign", name, design, startAt (ISO), endAt? (ISO, campaigns), status, createdAt }
// The 15-minute sweep (unpaidPaymentSweep) calls runThemeSchedule: a due publish replaces the live design; a campaign
// replaces it at startAt, keeps the design it replaced (`revertDesign`), and puts that back at endAt — unless the owner
// published something else in between, which is kept. Each change is one transaction on settings/website, records a
// theme version and stamps `themes/scheduler.lastRunAt` so Studio can show the scheduler is running. Nothing here
// touches orders, prices or stock.

const ACTIVE = ["scheduled", "live"];
const ms = (iso) => { const t = Date.parse(iso); return Number.isFinite(t) ? t : NaN; };

/**
 * Pure: what to do now. Ends come before starts (a campaign can end and the next begin at the same moment); starts run
 * oldest first so the latest one due wins. A campaign whose end has already passed before it ever started is skipped.
 */
function planThemeSchedule(entries, now = Date.now()) {
  const steps = [];
  const valid = (entries || []).filter(e => e && e.id && ACTIVE.includes(e.status) && Number.isFinite(ms(e.startAt)));
  for (const e of valid) {
    if (e.status === "live" && e.kind === "campaign" && ms(e.endAt) <= now) steps.push({ type: "end", id: e.id });
  }
  const due = valid.filter(e => e.status === "scheduled" && ms(e.startAt) <= now).sort((a, b) => ms(a.startAt) - ms(b.startAt));
  for (const e of due) {
    if (e.kind === "campaign" && Number.isFinite(ms(e.endAt)) && ms(e.endAt) <= now) steps.push({ type: "skip", id: e.id, reason: "ended-before-start" });
    else if (!e.design || typeof e.design !== "object") steps.push({ type: "skip", id: e.id, reason: "no-design" });
    else steps.push({ type: "start", id: e.id });
  }
  return steps;
}

async function runThemeSchedule(db, now = new Date()) {
  const nowIso = now.toISOString();
  const snap = await db.collection("themeSchedule").where("status", "in", ACTIVE).get();
  const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const steps = planThemeSchedule(entries, now.getTime());
  const settingsRef = db.collection("settings").doc("website");
  const results = [];
  for (const step of steps) {
    const ref = db.collection("themeSchedule").doc(step.id);
    try {
      const outcome = await db.runTransaction(async (tx) => {
        const [entrySnap, settingsSnap] = [await tx.get(ref), await tx.get(settingsRef)];
        const entry = entrySnap.exists ? entrySnap.data() : null;
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        if (!entry || !ACTIVE.includes(entry.status)) return "gone";
        if (step.type === "skip") {
          tx.update(ref, { status: "skipped", endedAt: nowIso, note: step.reason });
          return "skipped";
        }
        if (step.type === "start") {
          if (entry.status !== "scheduled") return "gone";
          tx.set(settingsRef, { design: entry.design, designPublishedAt: nowIso }, { mergeFields: ["design", "designPublishedAt"] });
          tx.update(ref, entry.kind === "campaign"
            ? { status: "live", startedAt: nowIso, revertDesign: settings.design || {}, revertPublishedAt: settings.designPublishedAt || null }
            : { status: "done", startedAt: nowIso });
          return "started";
        }
        // end of a campaign: put back what it replaced, unless something else was published since it started.
        if (entry.status !== "live") return "gone";
        if (settings.designPublishedAt && settings.designPublishedAt !== entry.startedAt) {
          tx.update(ref, { status: "done", endedAt: nowIso, note: "kept-later-publish" });
          return "kept";
        }
        tx.set(settingsRef, { design: entry.revertDesign || {}, designPublishedAt: nowIso }, { mergeFields: ["design", "designPublishedAt"] });
        tx.update(ref, { status: "done", endedAt: nowIso, revertDesign: null });
        return "reverted";
      });
      results.push({ ...step, outcome });
      if (outcome === "started" || outcome === "reverted") {
        const entry = entries.find(e => e.id === step.id) || {};
        const label = outcome === "started" ? `Scheduled: ${entry.name || "design"}` : `Campaign ended: ${entry.name || "design"}`;
        const design = outcome === "started" ? entry.design : entry.revertDesign;
        await db.collection("theme-versions").add({ kind: "published", label, createdAt: nowIso, design: design || {} })
          .catch(err => console.warn("themeSchedule: version not recorded:", err.message));
        await db.collection("audit-log").add({ type: "settings", message: label, createdAt: nowIso })
          .catch(() => {});
      }
    } catch (err) {
      console.error(`themeSchedule: ${step.type} ${step.id} failed:`, err.message);
      results.push({ ...step, outcome: "failed" });
    }
  }
  await db.collection("themes").doc("scheduler").set({ lastRunAt: nowIso, lastResults: results.slice(0, 20) }, { merge: true })
    .catch(err => console.warn("themeSchedule: could not stamp lastRunAt:", err.message));
  return results;
}

module.exports = { planThemeSchedule, runThemeSchedule, ACTIVE };
