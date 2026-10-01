// Studio › "Preview in new tab": a full-screen, top-level storefront window showing the UNSAVED draft.
// Studio posts the same STUDIO_PREVIEW_STATE snapshot it sends its iframe onto a BroadcastChannel;
// this module re-dispatches it into the window as a same-origin message, so every existing preview
// receiver (useSiteData, MainSite, Checkout, useLiveDesign) works unchanged. At top level
// `window.parent === window`, so their `event.source === window.parent` checks hold.
// Only runs when the page is top-level AND the URL has ?preview=true — shoppers never receive anything,
// because nothing posts on the channel unless Studio is open in the same browser.

export const PREVIEW_CHANNEL = "studio_preview";

type Win = Window & typeof globalThis & { __studioPreviewTab?: boolean; __studioPreviewDesign?: any };

export function isPreviewTab(win: Window = window): boolean {
  try {
    return win.parent === win && new URLSearchParams(win.location.search).get("preview") === "true";
  } catch {
    return false;
  }
}

/** Keep ?preview=true on in-app navigation so the tab never drops back to the live design. */
function keepPreviewParam(win: Win) {
  (["pushState", "replaceState"] as const).forEach((method) => {
    const original = win.history[method].bind(win.history);
    win.history[method] = (state: any, title: string, url?: string | URL | null) => {
      if (url != null) {
        const next = new URL(String(url), win.location.href);
        if (next.origin === win.location.origin) {
          next.searchParams.set("preview", "true");
          url = next.pathname + next.search + next.hash;
        }
      }
      return original(state, title, url);
    };
  });
}

/** Returns a cleanup function (used by tests); a no-op outside a preview tab. */
export function startPreviewTab(win: Win = window as Win): () => void {
  if (!isPreviewTab(win) || win.__studioPreviewTab || typeof win.BroadcastChannel === "undefined") return () => {};
  win.__studioPreviewTab = true;
  const origin = win.location.origin;
  const channel = new win.BroadcastChannel(PREVIEW_CHANNEL);

  channel.onmessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || (data.type !== "STUDIO_PREVIEW_STATE" && data.type !== "THEME_UPDATE")) return;
    if (data.design && typeof data.design === "object") win.__studioPreviewDesign = data.design;
    const Event = win.MessageEvent || MessageEvent;
    win.dispatchEvent(new Event("message", { data, origin, source: win }));
  };

  // Storefront pages announce PREVIEW_READY to window.parent — which is this window at top level.
  const onReady = (event: MessageEvent) => {
    if (event.data?.type === "PREVIEW_READY" && (!event.origin || event.origin === origin)) {
      channel.postMessage({ type: "PREVIEW_READY" });
    }
  };
  win.addEventListener("message", onReady);
  keepPreviewParam(win);
  channel.postMessage({ type: "PREVIEW_READY" });

  return () => {
    channel.close();
    win.removeEventListener("message", onReady);
    win.__studioPreviewTab = false;
  };
}
