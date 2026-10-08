// Development-only entry for studio-fixture.html: the real Studio with an in-memory adminApi.
// Browser checks (scripts/studio-e2e.mjs) read window.__studioFixture.calls to see what Studio
// would have saved.
import { createRoot } from "react-dom/client";
import "../../../../styles/index.css";
import { adminApi } from "../../api";
import { StudioEditor } from "../StudioEditor";
import { createStudioFixture, installFakeStudioApi } from "./fakeStudioApi";

// `?live=1` loads a snapshot of the published design (features/site/__fixtures__/liveDesign.json).
const live = new URLSearchParams(location.search).has("live")
  ? (await import("../../../features/site/__fixtures__/liveDesign.json")).default as any : null;
const fixture = createStudioFixture(live ? { settings: { design: live.design, draftDesign: live.design } } : {});
installFakeStudioApi(adminApi as any, fixture);
(window as any).__studioFixture = fixture;

createRoot(document.getElementById("root")!).render(
  <div className="admin-light admin-reso" data-admin-theme="reso" style={{ background: "transparent" }}>
    <div className="fixed inset-0 z-[200] bg-black">
      <StudioEditor settings={fixture.settings} appearance="light" onExit={() => { (window as any).__studioExited = true; }} />
    </div>
  </div>,
);
