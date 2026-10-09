import type { AppUpdate } from "../appUpdates";

export default {
  id: "shop-alerts-gmail-check", date: "2026-10-09", title: "Switch shop alerts off, and check your Gmail password",
  summary: "Settings › Notifications has a new Emails to the shop card: you can now turn off the new-order alert and the shipped copy sent to the shop's inbox (both stay on unless you switch them off). Gmail sending has a Check connection button that signs in to Gmail without sending anything and tells you whether the app password works; it also runs right after you save a new password, and Remove now asks first. If Gmail refused the newest email, the card says so. The email logo must now be an https address and the accent a colour code like #e8402a, so a typo can no longer break every email; the fields show what to fix. The server parts need the updated Cloud Functions deployed.",
  links: [{ label: "Open Notifications", tab: "settings", settingsTab: "notifications" }],
} satisfies AppUpdate;
