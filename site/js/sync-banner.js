// The pure half of the "sync is waiting for you" banner (roadmap 510/430,
// owner-ruled 2026-10-02): when it shows, what it says, and the one event the
// banner and Settings agree on. No DOM here, so `node --test` can run it.
//
// WHY A BANNER AT ALL. Since 510/390 sync pauses outright when it would merge
// without a base and asks which answer the reader wants. The only sign was a
// row inside Settings, so a reader who never opened Settings could leave sync
// stopped for weeks while their devices drifted apart.

import { CONFLICT_NO_BASE } from "./sync-merge.js";

/** The words, in one place so the test and the page cannot drift. Plain on
 *  purpose: no "merge", no "base" — the question itself is in Settings. */
export const BANNER_MESSAGE = "Sync is paused until you answer one question about this device.";
export const BANNER_ACTION = "Answer it now";
export const BANNER_LABEL = "Sync needs your answer";

/** Settings listens for this and opens Sync's question. Dispatched on
 *  `document`; the listener calls preventDefault() to say it took it. */
export const OPEN_SYNC_QUESTION = "faves:open-sync-question";

/**
 * Whether the banner should be up, from `sync.status()`. Only the no-base
 * question counts: it is the one that stops sync dead until answered. Read
 * from the status rather than from this tab's memory because that status is
 * itself read from the shared config (`faves.sync.v1.ask`), so a question
 * asked or answered in another tab is already reflected.
 */
export function shouldShowSyncBanner(status) {
  if (!status || status.state === "off") return false;
  return Array.isArray(status.conflicts) && status.conflicts.some((c) => c?.kind === CONFLICT_NO_BASE);
}
