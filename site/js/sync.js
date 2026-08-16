// The thing that actually syncs (ROADMAP Theme 9 v2). Everything else in the
// sync family is a part: `sync-code.js` mints the secret, `sync-crypto.js`
// seals a blob, `sync-merge.js` decides what the answer is, and `worker/` holds
// the bytes. None of them run on their own. This is the module that runs them.
//
// ONE OPERATION, NOT TWO. It is tempting to build "push" and "pull" as separate
// verbs, and it is wrong: a push that has not first read the server is exactly
// the stale-device clobber ADR 0017 warned about. So there is a single
// `syncNow()` — read the blob, merge it against what this device has, write the
// result back under `If-Match`, and only then record the new base. A "push" is
// that cycle triggered by a local change; a "pull" is the same cycle triggered
// by the app coming to the foreground. Same code both ways, which is also what
// keeps the merge symmetric (ADR 0060).
//
// THE BASE SNAPSHOT IS LOAD-BEARING, NOT BOOKKEEPING. `mergePersonal` needs the
// state the two devices last agreed on to tell a deletion from an addition. If
// this store is missing or stale, the merge degrades — silently and
// plausibly — to the additive behaviour that makes un-hearting impossible.
// So the base is written **only** after a write the server accepted, never
// after a merge we have not yet successfully pushed: a base that describes an
// agreement which never happened is worse than no base at all, because "no
// base" is at least the safe reading (everything looks like an addition).
//
// WHAT A FAILURE MUST DO: nothing. Every path here degrades to local-only. No
// network, an unreachable Worker, a 412, a blob that will not decrypt — all of
// them leave the device's own data exactly as it was and set a status the UI
// can show. Sync is an addition to a local-first app, and an app that broke
// when its optional backend was down would be a worse app than the one that
// never had it.
//
// DEBOUNCE, because writes are the scarce resource (ADR 0017: 1k/day free).
// A flurry of hearts is one write. The window is deliberately at the long end
// of 0017's 5–30 s range, and a `visibilitychange` to hidden flushes it early,
// which is the case that actually matters — the person taps three hearts and
// locks the phone.

import { collectPersonalData, ORDER_KEY } from "./personal-data.js";
import { deviceStorage, PROFILES_KEY, SCOPED_BASE_KEYS, sanitiseRegistry, scopeKey } from "./profiles.js";
import { mergePersonal, needsDecision } from "./sync-merge.js";
import { deriveSyncKeys, openBlob, sealBlob } from "./sync-crypto.js";
import { mintSyncCode, normaliseSyncCode } from "./sync-code.js";

/** Device-level, not per-profile: a sync code covers the whole device, the way
 *  the order tally does (ADR 0012). Holds the code, the current ETag and when
 *  we last agreed with the server. */
export const SYNC_KEY = "faves.sync.v1";
/** The snapshot the two devices last agreed on. Separate key because it is
 *  rewritten on a different rhythm and is far larger than the settings above. */
export const SYNC_BASE_KEY = "faves.sync.base.v1";

/** Where the blobs live. A same-origin path would be nicer, but Pages and
 *  Workers are different hostnames and routing one through the other needs a
 *  custom domain we have not set up — so this is a cross-origin fetch and the
 *  Worker's CORS allowlist is what makes it safe. */
export const SYNC_ENDPOINT = "https://faves-sync.cakeit.workers.dev";

/** Long end of ADR 0017's 5–30 s window. Writes are the scarce resource and a
 *  person editing favourites generates a burst, not a stream. */
export const DEBOUNCE_MS = 20_000;

export const OFF = "off";
export const IDLE = "idle";
export const SYNCING = "syncing";
export const ERROR = "error";
export const NEEDS_DECISION = "needs-decision";

const parse = (raw) => {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Write a merged snapshot back to storage.
 *
 * This is NOT `applyPersonalData`. That one is additive by design — it never
 * removes, because it exists to fold a backup file into a device. Here the
 * merge has *already decided*, including what should be gone, so each store is
 * replaced with the merged value. Using the additive applier at this point
 * would throw away the deletion handling that is the entire reason ADR 0060
 * exists.
 *
 * Deliberately does not touch the order tally (not synced) or any `faves.` key
 * the merge does not know about: an unknown store is left exactly as it is,
 * because overwriting data we do not understand is worse than not syncing it.
 */
export function writeSnapshot(storage, snapshot) {
  const profiles = Array.isArray(snapshot?.profiles) ? snapshot.profiles : [];
  if (!profiles.length) return 0;

  const registry = sanitiseRegistry(parse(storage.getItem(PROFILES_KEY)));
  const known = new Set(registry.profiles.map((p) => p.id));
  let written = 0;

  for (const p of profiles) {
    const id = String(p?.id ?? "");
    if (!id) continue;
    if (!known.has(id)) {
      registry.profiles.push({ id, name: p.name || "Me" });
      known.add(id);
    }
    // Replace, don't merge — see the docstring. An empty list is a real value:
    // it means every heart was removed, and writing "[]" is how that travels.
    const put = (base, value) => {
      try {
        storage.setItem(scopeKey(id, base), JSON.stringify(value));
        written += 1;
      } catch {
        /* blocked or over quota — the pull is lost, the device is unharmed */
      }
    };
    put("faves.favourites.v1", Array.isArray(p.favourites) ? p.favourites : []);
    put("faves.ratings.v1", p.ratings && typeof p.ratings === "object" ? p.ratings : {});
    if (p.settings && typeof p.settings === "object") put("faves.settings.v1", p.settings);
  }

  // A profile deleted on the other device is gone from the merged snapshot, so
  // its stores are purged here — otherwise the registry would drop it while its
  // hearts sat orphaned in localStorage forever.
  const surviving = new Set(profiles.map((p) => String(p?.id ?? "")));
  for (const p of registry.profiles) {
    if (surviving.has(p.id)) continue;
    for (const base of SCOPED_BASE_KEYS) {
      try {
        storage.removeItem(scopeKey(p.id, base));
      } catch {
        /* nothing persisted to remove */
      }
    }
  }
  registry.profiles = registry.profiles.filter((p) => surviving.has(p.id));
  if (!registry.profiles.some((p) => p.id === registry.activeId)) {
    registry.activeId = registry.profiles[0]?.id ?? null;
  }
  try {
    storage.setItem(PROFILES_KEY, JSON.stringify(sanitiseRegistry(registry)));
  } catch {
    /* as above */
  }
  return written;
}

/**
 * Apply the user's answer to a blocked allergen conflict, in place.
 *
 * `mergePersonal` resolves a two-sided diet change to the **union** and reports
 * it, so a device is never left without a warning it had while the question is
 * open (ADR 0060). That union is a holding position, not an answer. Once the
 * user has chosen, this replaces it — "combine" happens to equal what the merge
 * already did, "keep" and "incoming" do not.
 *
 * `decisions.diet` takes ADR 0030's three values, so the sync question and the
 * import question cannot drift into meaning different things.
 */
export function applyDietDecision(merged, conflicts, decisions) {
  const choice = decisions?.diet;
  if (!choice || choice === "combine") return merged;
  for (const c of Array.isArray(conflicts) ? conflicts : []) {
    if (c.kind !== "diet") continue;
    const profile = merged?.profiles?.find((p) => String(p?.id ?? "") === String(c.profileId ?? ""));
    if (!profile?.settings) continue;
    const pick = choice === "incoming" ? c.theirs : c.mine;
    if (pick) profile.settings.diet = pick;
  }
  return merged;
}

/**
 * The sync engine. Everything is injected so it unit-tests without a browser,
 * a network or a clock.
 */
export function createSync({
  storage = deviceStorage,
  endpoint = SYNC_ENDPOINT,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  now = () => new Date().toISOString(),
  debounceMs = DEBOUNCE_MS,
  setTimer = globalThis.setTimeout?.bind(globalThis),
  clearTimer = globalThis.clearTimeout?.bind(globalThis),
  // Called after a pull has been written to storage. `writeSnapshot` changes
  // localStorage, and the live favourites/ratings/settings singletons hold
  // their state IN MEMORY — so without this the data is correct on disk and
  // every screen keeps showing what it read at load. Injected rather than
  // imported so the engine stays free of the live stores (see sync-start.js).
  onApplied = () => {},
} = {}) {
  const subs = new Set();
  let state = OFF;
  let error = null;
  let pending = null; // a merge that needs a decision before it can be written
  let timer = null;
  let inFlight = null;
  let started = false;
  let applied = onApplied;

  const readConfig = () => parse(storage.getItem(SYNC_KEY)) || {};
  const writeConfig = (patch) => {
    const next = { ...readConfig(), ...patch };
    try {
      storage.setItem(SYNC_KEY, JSON.stringify(next));
    } catch {
      /* session-only; sync still works until the tab closes */
    }
    return next;
  };

  const readBase = () => parse(storage.getItem(SYNC_BASE_KEY));
  const writeBase = (snap) => {
    try {
      storage.setItem(SYNC_BASE_KEY, JSON.stringify(snap));
    } catch {
      // Losing the base is not fatal but it IS a real degradation — the next
      // merge cannot tell a deletion from an addition. Surfaced rather than
      // swallowed so the UI can say sync is not fully healthy.
      error = "This device is low on storage, so sync may re-add things you removed.";
    }
  };

  const emit = () => {
    const snap = status();
    for (const fn of subs) fn(snap);
  };

  const setState = (s, err = null) => {
    state = s;
    error = err;
    emit();
  };

  function status() {
    const cfg = readConfig();
    return {
      state: cfg.code ? state === OFF ? IDLE : state : OFF,
      code: cfg.code || null,
      lastSyncedAt: cfg.lastSyncedAt || null,
      error,
      conflicts: pending?.conflicts ?? null,
    };
  }

  const url = (blobId) => `${endpoint.replace(/\/$/, "")}/v1/blob/${blobId}`;

  /**
   * One whole cycle: read, merge, write, then record the agreement.
   *
   * `decisions` carries answers to a previous run's blocking conflicts — today
   * only the diet one (ADR 0060), which is safety data and is never resolved
   * without the user.
   */
  async function syncNow({ decisions = null } = {}) {
    const cfg = readConfig();
    if (!cfg.code) return { ok: false, error: "Sync is off." };
    if (inFlight) return inFlight;

    inFlight = (async () => {
      setState(SYNCING);
      try {
        const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(cfg.code));

        // 1. read what the server has.
        const got = await fetchImpl(url(blobId), { method: "GET" });
        let theirs = null;
        let etag = null;
        if (got.status === 200) {
          etag = got.headers.get("etag");
          theirs = await openBlob(key, new Uint8Array(await got.arrayBuffer()));
          if (theirs === null) {
            // Authenticated decryption failed. The blob is not ours, or it is
            // damaged. Refusing is the only safe move: overwriting it would
            // destroy whatever it really is, and merging garbage is worse.
            setState(ERROR, "That sync code doesn’t match the data on the server.");
            return { ok: false, error: "That sync code doesn’t match the data on the server." };
          }
        } else if (got.status !== 404) {
          setState(ERROR, "Couldn’t reach sync just now. Your data is safe on this device.");
          return { ok: false, error: "sync-unreachable" };
        }

        // 2. merge against the last agreement.
        const mine = collectPersonalData(storage, { exportedAt: now() });
        const base = readBase();
        const { merged, conflicts, changes } = mergePersonal(base, mine, theirs ?? mine);

        if (needsDecision(conflicts) && !decisions) {
          pending = { conflicts, merged };
          setState(NEEDS_DECISION);
          return { ok: false, conflicts, needsDecision: true };
        }
        // An answer does not merely unblock the write — it has to change what
        // gets written. Without this the user picks "keep mine", the union the
        // merge produced provisionally is pushed anyway, and their answer is
        // silently discarded on the one question in this app that can hurt.
        applyDietDecision(merged, conflicts, decisions);
        pending = null;

        // 3. write it back BEFORE touching local storage, so a rejected write
        //    never leaves this device holding a state the pair never agreed on.
        const sealed = await sealBlob(key, merged);
        const put = await fetchImpl(url(blobId), {
          method: "PUT",
          body: sealed,
          headers: etag ? { "If-Match": etag } : {},
        });

        if (put.status === 412) {
          // Someone else wrote between our read and our write. Not an error —
          // the correct response is to go round again against the newer blob.
          setState(IDLE);
          return { ok: false, retry: true, error: "raced" };
        }
        if (put.status !== 204) {
          setState(ERROR, "Couldn’t save to sync just now. Your data is safe on this device.");
          return { ok: false, error: "sync-write-failed" };
        }

        // 4. only now is this an agreement: apply locally and record the base.
        writeSnapshot(storage, merged);
        // Before the base, deliberately: if re-pointing the live stores throws,
        // the base must not claim an agreement whose local half never landed.
        try {
          applied(merged);
        } catch {
          /* a screen that failed to repaint is not a reason to fail the sync */
        }
        writeBase(merged);
        writeConfig({ lastSyncedAt: now() });
        setState(IDLE);
        return { ok: true, changes };
      } catch {
        // Offline is the overwhelmingly common cause and is not a fault.
        setState(ERROR, "Couldn’t reach sync just now. Your data is safe on this device.");
        return { ok: false, error: "sync-unreachable" };
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  /** Debounced trigger — what a heart or a rating change calls. */
  function schedule() {
    if (!readConfig().code || !setTimer) return;
    if (timer) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      syncNow();
    }, debounceMs);
  }

  /** Send whatever is pending right now — the app is going away. */
  function flush() {
    if (!timer) return;
    clearTimer(timer);
    timer = null;
    syncNow();
  }

  return {
    status,
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    isOn: () => !!readConfig().code,

    /** Start syncing this device, on a brand-new code nobody else holds. */
    async enable() {
      const code = mintSyncCode();
      writeConfig({ code, lastSyncedAt: null });
      // No base: this device has never agreed with anything, so the first cycle
      // treats everything as an addition — which is correct, and is also why
      // joining an existing code cannot lose anything.
      try {
        storage.removeItem(SYNC_BASE_KEY);
      } catch {
        /* nothing to clear */
      }
      setState(IDLE);
      const res = await syncNow();
      return { ok: res.ok !== false || !!res.needsDecision, code, ...res };
    },

    /** Adopt a code from another device. */
    async join(input) {
      const code = normaliseSyncCode(input);
      if (!code) {
        return { ok: false, error: "That code doesn’t look right — check it and try again." };
      }
      writeConfig({ code: input.trim().toUpperCase(), lastSyncedAt: null });
      try {
        storage.removeItem(SYNC_BASE_KEY);
      } catch {
        /* nothing to clear */
      }
      setState(IDLE);
      return syncNow();
    },

    /** Answer a blocked merge (today: the allergen question) and finish it. */
    async resolve(decisions) {
      return syncNow({ decisions });
    },

    /**
     * Stop syncing this device. Local data is untouched — this forgets the code
     * and the base only. The blob stays on the server for other devices, and
     * expires on its own if nothing writes to it again.
     */
    disable() {
      try {
        storage.removeItem(SYNC_KEY);
        storage.removeItem(SYNC_BASE_KEY);
      } catch {
        /* nothing to clear */
      }
      pending = null;
      setState(OFF);
    },

    /**
     * Wire the engine to the app: local changes schedule a debounced write,
     * coming back to the app pulls, and going away flushes.
     *
     * This is the ignition, and it is the piece whose absence made every other
     * part of the sync family inert — the modules all existed and nothing ever
     * called them. Idempotent, because three page entry points call it and a
     * tab can be shown and hidden repeatedly.
     */
    start({ stores = [], doc = globalThis.document, onApplied: hook } = {}) {
      // Set even on a repeat call: the first screen to start wins the listeners,
      // but every screen needs its OWN stores re-pointed after a pull, and a
      // silently-ignored hook here is how a pull lands on disk and on no screen.
      if (typeof hook === "function") applied = hook;
      if (started) return () => {};
      started = true;
      const offs = [];
      for (const store of stores) {
        if (typeof store?.subscribe === "function") offs.push(store.subscribe(() => schedule()));
      }
      if (doc?.addEventListener) {
        const onVis = () => {
          // Hidden first: a flush on the way out is the case that actually
          // loses data — three hearts and then the phone locks.
          if (doc.visibilityState === "hidden") flush();
          else if (readConfig().code) syncNow();
        };
        doc.addEventListener("visibilitychange", onVis);
        offs.push(() => doc.removeEventListener("visibilitychange", onVis));
      }
      // A pull on load, so opening the app on the laptop shows what the phone
      // did. Fire-and-forget: a failure here must never block a page render.
      if (readConfig().code) syncNow();
      return () => {
        for (const off of offs) off();
        started = false;
      };
    },

    syncNow,
    schedule,
    flush,
    /** Exposed for the headless check, which has to assert that a burst of
     *  changes produces one write rather than five. */
    _pendingWrite: () => !!timer,
  };
}

export const sync = createSync();
