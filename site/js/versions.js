// The two version stamps (ADR 0015) as they are *installed on this device*.
//
// Deliberately read from the service worker's cache names rather than declared
// as constants here: a second copy of a version number is a copy that can drift
// from sw.js, and the number people care about is not what the source claims —
// it's what their phone is actually serving. A stale PWA showing an old stamp
// is the useful answer, not a bug in this module (see ROADMAP Theme 16).

// Cache names are `faves-shell-<SHELL_VERSION>` / `faves-data-<DATA_VERSION>`;
// the runtime image cache (`faves-img-v1`) is unversioned and ignored.
const SHELL_RE = /^faves-shell-(.+)$/;
const DATA_RE = /^faves-data-(.+)$/;

// Order two "YYYY-MM-DD.N" stamps. String compare would put ".9" above ".83",
// so the counter is compared as a number. Only reachable during an update, when
// the old cache hasn't been swept yet — but that's exactly when someone is
// looking at this screen wondering which version they're on.
function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  const [aDate, aNum = "0"] = a.split(/\.(?=\d+$)/);
  const [bDate, bNum = "0"] = b.split(/\.(?=\d+$)/);
  if (aDate !== bDate) return aDate > bDate ? a : b;
  return Number(aNum) >= Number(bNum) ? a : b;
}

/**
 * Pick the shell and data stamps out of a list of cache names. Pure, so the
 * version-picking rule is testable without a browser. Unknown names are
 * ignored; a missing cache yields null rather than a guess.
 */
export function parseCacheVersions(names) {
  let shell = null;
  let data = null;
  for (const name of names || []) {
    const s = SHELL_RE.exec(name);
    if (s) shell = newer(shell, s[1]);
    const d = DATA_RE.exec(name);
    if (d) data = newer(data, d[1]);
  }
  return { shell, data };
}

/**
 * What this device has cached. Resolves to `{ shell, data }` with null entries
 * when the app hasn't been stored offline yet (a first visit, a browser without
 * CacheStorage, or an insecure context) — About renders that state rather than
 * failing, because "not installed yet" is a true and useful answer.
 */
export async function installedVersions(cacheStorage = globalThis.caches) {
  if (!cacheStorage?.keys) return { shell: null, data: null };
  try {
    return parseCacheVersions(await cacheStorage.keys());
  } catch {
    return { shell: null, data: null };
  }
}
