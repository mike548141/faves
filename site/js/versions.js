// The two version stamps (ADR 0015) as they are *installed on this device* —
// and, since ROADMAP 16f (ADR 0032), as they are *actually running the page*.
//
// Two ways to read a version, kept as two functions because they answer two
// different questions:
//   - `installedVersions()` reads the service worker's cache names — "what's
//     stored on this device". Deliberately not declared as constants here: a
//     second copy of a version number is a copy that can drift from sw.js.
//   - `currentVersions()` asks the controlling worker directly for its own
//     constants — "what is this page actually running". The two can differ
//     for as long as a newer worker sits in `waiting` (ADR 0027): the cache
//     names already show the newer version while the page is still served by
//     the old one, which `installedVersions()` alone can't tell apart. Settings
//     → Refresh & reset (settings-ui.js) uses `currentVersions()` — it was
//     About until ROADMAP 23c moved the stamps beside the refresh button on
//     2026-08-17; `report-ui.js` still wants the cache-name answer for its
//     bug-report envelope.
// A stale PWA showing an old stamp is a useful, honest answer either way, not
// a bug in this module (see ROADMAP Theme 16).

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
 * CacheStorage, or an insecure context) — Settings renders that state rather
 * than failing, because "not installed yet" is a true and useful answer.
 *
 * Kept deliberately unchanged by ROADMAP 16f: `report-ui.js` still wants "what's
 * stored" for its bug-report envelope, and `currentVersions()` below reuses it
 * as the fallback for a controller that can't (yet) answer GET_VERSIONS.
 */
export async function installedVersions(cacheStorage = globalThis.caches) {
  if (!cacheStorage?.keys) return { shell: null, data: null };
  try {
    return parseCacheVersions(await cacheStorage.keys());
  } catch {
    return { shell: null, data: null };
  }
}

// --- Asking the controller directly (ROADMAP 16f, ADR 0032) --------------
//
// caches.keys() answers "what's stored on this device". Under a *waiting*
// worker (ADR 0027) that is a different question from "what is this page
// actually running": parseCacheVersions's newer() picks the highest version
// present, and during the waiting window the highest version present is
// precisely the update that has NOT taken over the page yet. Only the
// controlling worker itself knows which cache it reads from, so the honest
// source is to ask it — a MessageChannel round-trip to its own SHELL_VERSION /
// DATA_VERSION constants (site/sw.js's GET_VERSIONS handler), not an inference.

const REPLY_TIMEOUT_MS = 1000;

/**
 * Round-trip a version request to `worker` (a ServiceWorker-shaped object with
 * `postMessage`). Resolves `{ shell, data }` from its reply, or `null` if
 * there's no worker, no MessageChannel, the reply never lands within
 * `timeoutMs`, or `postMessage` throws. Never rejects — every failure mode
 * degrades to "couldn't ask it", which the caller treats as honestly as a
 * missing cache.
 *
 * The timeout matters for one real case: a controller that predates this
 * protocol (deployed before ROADMAP 16f) has no GET_VERSIONS handler and will
 * never reply. That's the same "ships once, then the old copy is silently
 * running the old rules until it's replaced" shape ADR 0027 already lived
 * through for the update notice — not a bug, just the one version where
 * `currentVersions()` falls back to the cache-name guess below.
 */
export function askController(worker, {
  timeoutMs = REPLY_TIMEOUT_MS,
  MessageChannelImpl = globalThis.MessageChannel,
} = {}) {
  return new Promise((resolve) => {
    if (!worker?.postMessage || !MessageChannelImpl) {
      resolve(null);
      return;
    }
    let settled = false;
    let timer;
    let channel;
    // A MessagePort with a live listener keeps Node's event loop (and, in a
    // test run, the process) alive until closed — a browser tab doesn't care,
    // but `node --test` will hang forever on an unanswered request without
    // this. Close both ends on every exit path, not just the happy one.
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        channel?.port1.close();
        channel?.port2.close();
      } catch {
        // A closed/hostile port throwing on close is still a close attempt;
        // the value is already decided either way.
      }
      resolve(value);
    };
    try {
      channel = new MessageChannelImpl();
      channel.port1.onmessage = (event) => {
        const msg = event?.data;
        finish(
          msg && msg.type === "VERSIONS"
            ? { shell: msg.shell ?? null, data: msg.data ?? null }
            : null
        );
      };
      timer = setTimeout(() => finish(null), timeoutMs);
      worker.postMessage({ type: "GET_VERSIONS" }, [channel.port2]);
    } catch {
      finish(null);
    }
  });
}

/**
 * Is a newer worker holding in `waiting` (ADR 0027)? Read from the
 * registration directly — the presence-by-cache-name inference is exactly the
 * ambiguity this theme removes, so the waiting worker is not detected by it.
 */
async function waitingWorker(container) {
  try {
    const reg = await container.getRegistration?.();
    return reg?.waiting ?? null;
  } catch {
    return null;
  }
}

/**
 * The honest version stamp for Settings → Refresh & reset (ROADMAP 16f): the
 * *controlling* worker's own version, asked directly, plus the *waiting*
 * worker's version reported separately when one exists — never merged into
 * one number the way `installedVersions()` used to. Resolves
 * `{ shell, data, controlling, waiting }`:
 *   - `shell`/`data` — the controlling worker's own constants, or (when that
 *     can't be asked — see below) the cache-name fallback.
 *   - `controlling` — true once a worker actually controls this page. False
 *     on a first-ever load before `clients.claim()` runs, or with no
 *     `serviceWorker` support at all — both true statements, not a guess.
 *   - `waiting` — `{ shell, data }` for a worker holding in `waiting`
 *     (ADR 0027), or `null` when none exists. Its own fields can be null if it
 *     exists but somehow didn't answer — still a fact ("an update is ready",
 *     "which version" unknown) rather than silence.
 *
 * Falls back to `installedVersions()` (the pre-16f cache-name guess) exactly
 * when there is no controller to ask, or it exists but never replies (a
 * controller that predates GET_VERSIONS — see askController's doc comment).
 * That fallback is never worse than the previous behaviour, satisfying the
 * "no serviceWorker support" and "not supported" states unchanged.
 */
export async function currentVersions(nav = globalThis.navigator, opts = {}) {
  const container = nav?.serviceWorker ?? null;
  const controller = container?.controller ?? null;

  const [answer, waitingSW] = await Promise.all([
    controller ? askController(controller, opts) : Promise.resolve(null),
    container ? waitingWorker(container) : Promise.resolve(null),
  ]);

  let waiting = null;
  if (waitingSW) {
    waiting = (await askController(waitingSW, opts)) || { shell: null, data: null };
  }

  if (answer) return { ...answer, controlling: true, waiting };

  const cached = await installedVersions();
  return { ...cached, controlling: !!controller, waiting };
}
