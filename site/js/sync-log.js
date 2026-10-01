// A short record of what sync did on THIS device (roadmap 510/380, guard C of
// 510/320), kept so the next "my hearts changed by themselves" can be read
// rather than reconstructed. 510/320 could not be closed because nothing on the
// owner's laptop said which page, which build, or whether that merge had a base
// when the old hearts came back; this is the thing that would have said.
//
// WHAT IS KEPT. The last `MAX_ENTRIES` syncs that did something worth reading:
// changed a heart here, sent a change to sync, merged without a full last
// agreement, stopped to ask, or failed. A sync that found nothing to do is NOT
// kept. Two reasons, both measured rather than guessed: every page load and
// every return to the app runs one, so twenty of them would push the one that
// mattered out of the list within the hour; and keeping it would cost a storage
// write per foreground, which 510/190 removed on purpose (a no-op pull writes
// only its timestamp — tests/sync.test.js holds that line). A run of the same
// failure (offline, say) is kept as one entry with a count.
//
// WHERE IT LIVES, AND WHERE IT NEVER GOES. Device-level storage, one key, never
// synced and never in a backup: it is a fact about this device, like the sync
// pairing beside it (personal-data.js EXCLUDED names it, and a Replace import
// spares it, because the sync around a Replace is exactly what one would want
// to read afterwards). It holds heart ids (`d:<venue> <dish>`), which the device
// already holds as hearts — nothing new about the person, and bounded:
// `MAX_IDS` per list per entry.
//
// PURE APART FROM THE STORAGE IT IS HANDED, and DOM-free: sync.js writes it,
// sync-ui.js reads it, and the words come from here so the panel and the copy
// button cannot drift apart.

import { favKey } from "./favourites.js";

/** Device-level, beside `faves.sync.v1`; never per profile. */
export const SYNC_LOG_KEY = "faves.sync.log.v1";
/** How many entries are kept (the owner's ruling: "the last 20 syncs"). */
export const MAX_ENTRIES = 20;
/** How many heart ids one list in one entry keeps; the count is always exact. */
export const MAX_IDS = 12;

const isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);

/** The kept entries, oldest first. Anything unreadable reads as none. */
export function readSyncLog(storage) {
  try {
    const raw = JSON.parse(storage?.getItem?.(SYNC_LOG_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isObj).slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Two entries that say the same about a failure or a wait, bar the time. */
function sameStory(a, b) {
  return (
    !!a &&
    !!b &&
    a.outcome === b.outcome &&
    a.outcome !== "synced" &&
    (a.error || "") === (b.error || "") &&
    a.page === b.page &&
    a.build === b.build &&
    a.base === b.base &&
    !a.here?.added?.length && !a.here?.removed?.length && !a.sent &&
    !b.here?.added?.length && !b.here?.removed?.length && !b.sent
  );
}

/**
 * Add one entry and keep the last `MAX_ENTRIES`. A repeat of the entry before
 * it (the same failure, from the same page and build) bumps that entry's count
 * and time instead of pushing an older, more useful one out. Never throws: a
 * log that cannot be written must not fail the sync it describes.
 */
export function appendSyncLog(storage, entry) {
  if (!isObj(entry)) return false;
  try {
    const log = readSyncLog(storage);
    const last = log[log.length - 1];
    if (sameStory(last, entry)) {
      log[log.length - 1] = { ...last, at: entry.at, times: (last.times || 1) + 1 };
    } else {
      log.push(entry);
    }
    storage.setItem(SYNC_LOG_KEY, JSON.stringify(log.slice(-MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

/** Every heart in a snapshot, keyed so two people's hearts on one dish stay
 *  two: `<profile id>\t<heart id>` → what the log shows for it. The person's
 *  name leads only when the snapshot holds more than one person. */
function heartsOf(snapshot) {
  const people = Array.isArray(snapshot?.profiles) ? snapshot.profiles : [];
  const many = people.length > 1;
  const out = new Map();
  for (const p of people) {
    for (const e of Array.isArray(p?.favourites) ? p.favourites : []) {
      let k;
      try {
        k = favKey(e);
      } catch {
        continue;
      }
      out.set(`${p?.id ?? ""}\t${k}`, many ? `${p?.name || "?"}: ${k}` : k);
    }
  }
  return out;
}

/**
 * The hearts `after` holds that `before` did not, and the reverse — sorted, and
 * bounded to `MAX_IDS` each, with the exact counts beside them.
 */
export function heartChange(before, after) {
  const b = heartsOf(before);
  const a = heartsOf(after);
  const added = [...a.keys()].filter((k) => !b.has(k)).map((k) => a.get(k)).sort();
  const removed = [...b.keys()].filter((k) => !a.has(k)).map((k) => b.get(k)).sort();
  return {
    nAdded: added.length,
    nRemoved: removed.length,
    added: added.slice(0, MAX_IDS),
    removed: removed.slice(0, MAX_IDS),
  };
}

// --- words ------------------------------------------------------------------

const PAGES = new Map([
  ["/", "Home"],
  ["/index.html", "Home"],
  ["/restaurant.html", "A place’s menu"],
  ["/recipe.html", "A recipe"],
]);
/** Which screen, in words: the page's path ends in one of the three pages. */
export function pageName(path) {
  const p = String(path || "");
  const tail = p.slice(p.lastIndexOf("/")) || p;
  return PAGES.get(tail) || PAGES.get(p) || (p ? p : "Unknown page");
}

const WHY = {
  open: "opening Faves or coming back to it",
  change: "a change made on this device",
  leaving: "leaving the page",
  "sync now": "Sync now",
  "turned on": "turning sync on",
  joined: "entering a sync code",
  answer: "your answer to a sync question",
  online: "coming back online",
};

const BASE = {
  yes: "Had the last agreement with your other devices.",
  none: "Had NO last agreement, so everything here looked new.",
  partial: "Had a last agreement, but not for everyone on this device.",
};

const OUTCOME = {
  synced: "Done.",
  asked: "Stopped to ask you before adding this device’s extras.",
  "needs-answer": "Stopped to ask you about food preferences.",
  raced: "Another device kept writing at the same time; tried again later.",
  paused: "Paused.",
  error: "Didn’t finish.",
};

const change = (c) =>
  !c || (!c.nAdded && !c.nRemoved) ? "no change" : `${c.nAdded || 0} added, ${c.nRemoved || 0} removed`;

/** "2 Oct, 9:50 pm" in this device's own time zone. */
export function whenText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/**
 * One entry in plain words: `{ head, lines, ids }`. `head` names when, where
 * and which build; `lines` say what started it, whether it had a base, what
 * moved and how it ended; `ids` lists the hearts by id (for a bug report).
 */
export function describeEntry(e) {
  const where = pageName(e?.page);
  const build = e?.build ? `build ${e.build}` : "build unknown";
  const times = e?.times > 1 ? ` (${e.times} times)` : "";
  const head = `${whenText(e?.at)}${times} — ${where}, ${build}`;
  const lines = [];
  lines.push(`Started by ${WHY[e?.why] || e?.why || "sync"}.`);
  if (e?.base && BASE[e.base]) lines.push(BASE[e.base]);
  if (e?.here) lines.push(`Hearts on this device: ${change(e.here)}.`);
  if (e?.outcome === "synced") lines.push(e?.sent ? `Hearts sent to sync: ${change(e.sent)}.` : "Nothing needed sending.");
  const end = OUTCOME[e?.outcome] || "Didn’t finish.";
  lines.push(e?.error ? `${end} ${e.error}` : end);
  const ids = [];
  const list = (label, c, key) => {
    const xs = Array.isArray(c?.[key]) ? c[key] : [];
    if (!xs.length) return;
    const more = (c[key === "added" ? "nAdded" : "nRemoved"] || xs.length) - xs.length;
    ids.push(`${label}: ${xs.join(", ")}${more > 0 ? ` and ${more} more` : ""}`);
  };
  list("Added here", e?.here, "added");
  list("Removed here", e?.here, "removed");
  list("Added to sync", e?.sent, "added");
  list("Removed from sync", e?.sent, "removed");
  return { head, lines, ids };
}

/** The whole log as plain text, newest first — what "Copy" puts on the
 *  clipboard for a bug report. Holds no sync code: the log never stores one. */
export function syncLogText(entries) {
  const out = [];
  for (const e of [...(entries || [])].reverse()) {
    const d = describeEntry(e);
    out.push(d.head, ...d.lines.map((l) => `  ${l}`), ...d.ids.map((l) => `  ${l}`), "");
  }
  return out.join("\n").trim();
}
