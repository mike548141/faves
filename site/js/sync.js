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

import { collectPersonalData, storesAhead, upgradePersonalData } from "./personal-data.js";
import { deviceStorage, PROFILES_KEY, PURGED_BASE_KEYS, SCOPED_BASE_KEYS, sanitiseRegistry, scopeKey } from "./profiles.js";
import { mergePersonal, needsDecision, baselessPeople, keepTheirsFor, CONFLICT_NO_BASE } from "./sync-merge.js";
import { followMovesInSnapshot } from "./recipe-move.js";
import { appendSyncLog, heartChange, readSyncLog } from "./sync-log.js";
import { currentVersions } from "./versions.js";
import { deriveSyncKeys, openBlob, sealBlob } from "./sync-crypto.js";
import { mintSyncCode, normaliseSyncCode } from "./sync-code.js";
import { storageAhead } from "./store.js";
import { RECIPES_KEY, flattenCookbooks, groupCookbooks } from "./recipe-record.js";
import {
  RECIPE_BUCKETS,
  BUCKET_QUERY,
  BUCKET_HEADER,
  FAMILY_QUERY,
  knownQuery,
  bucketName,
  bucketPlaintext,
  canonicalJson,
  hashRecipes,
  inBucket,
  mergeRecipeBucket,
  parseBucketHeader,
  readBucket,
} from "./sync-buckets.js";

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

/** A page load or a return to the foreground pulls only when the last sync is
 *  older than this (roadmap 510/160, survey finding 5). The site is three
 *  separate pages, so walking home to menu to home was three pulls a few
 *  seconds apart, each a request and 9 KV reads that found nothing. Owner-ruled
 *  ~90 s on 2026-10-01: a change made on another device can take this much
 *  longer to appear, and a device that has not synced for longer than this —
 *  a day, a week, never — pulls at once, because the rule is on the AGE of the
 *  last sync and not on how often the page opens. Writes are never held back:
 *  see `pullIfStale`. */
export const PULL_WINDOW_MS = 90_000;

/** How many times one sync goes round when its write loses a race (a 412) —
 *  the first try and two more (roadmap 510/070). Each extra round is one read
 *  and one conditional write; three is enough for two devices that happened
 *  to write together, and small enough that a pair stuck racing stops quickly
 *  and waits for the next edit, foreground or reconnect. */
export const MAX_ATTEMPTS = 3;

export const OFF = "off";
export const IDLE = "idle";
export const SYNCING = "syncing";
export const ERROR = "error";
export const NEEDS_DECISION = "needs-decision";
/** Another device has changed the shape of a store this one reads (ADR 0146
 *  §3). Its own state, not ERROR (roadmap 510/090): ERROR's row reads "tap to
 *  retry" and offers Retry, and no retry can help until Faves is updated. */
export const PAUSED = "paused";

/** The two answers to "this device has things sync doesn't, and no last
 *  agreement to tell whether they were removed elsewhere" (roadmap 510/390).
 *  KEEP: this device takes what sync has, and its extras go. ADD: its extras
 *  are added everywhere (what a merge with no base always did, silently). */
export const KEEP_SYNCED = "keep";
export const ADD_EXTRAS = "add";
const NO_BASE_ANSWERS = new Set([KEEP_SYNCED, ADD_EXTRAS]);

/** The open no-base question in a config, or null. Device-level, in the sync
 *  config, so every tab and every page load sees the same one question. */
const openQuestion = (cfg) => (cfg?.ask && typeof cfg.ask === "object" && !cfg.ask.answer ? cfg.ask : null);
const askConflict = (ask) => ({ kind: CONFLICT_NO_BASE, people: Array.isArray(ask?.people) ? ask.people : [], at: ask?.at ?? null });

/** What a tab says when another tab on this device has upgraded storage past
 *  this tab's build (roadmap 510/110). Nothing is read or sent until it reloads. */
export const RELOAD_NEEDED =
  "Reload Faves to keep syncing — it was updated in another tab. Your data is safe on this device.";

/** What a device says when another one has changed the shape of a store this
 *  one reads (ADR 0146 §3). Shown verbatim by sync-ui's paused view. */
export const UPDATE_NEEDED =
  "Update Faves to keep syncing — another device has a newer version. Your data is safe on this device.";

const parse = (raw) => {
  try {
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Run a sync snapshot — the server copy or the base — through the same upgrade
 * chain a backup uses (roadmap 510/010 step 3), so an older copy is read in
 * this build's shape and never refused. A snapshot with no version is from
 * before sync stamped one, which is format 1. Anything that is not an object
 * at all is no snapshot: null, which the merge reads as "no base", the safe
 * reading (everything looks like an addition). A newer copy comes back as it
 * is — carrying it is the merge's job.
 */
export function upgradeSnapshot(snap) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  const withV = typeof snap.v === "number" && Number.isFinite(snap.v) ? snap : { ...snap, v: 1 };
  const up = upgradePersonalData(withV);
  return up.ok ? up.data : null;
}

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
    put("faves.notes.v1", p.notes && typeof p.notes === "object" ? p.notes : {});
    if (p.settings && typeof p.settings === "object") put("faves.settings.v1", p.settings);
  }

  // A profile deleted on the other device is gone from the merged snapshot, so
  // its stores are purged here — otherwise the registry would drop it while its
  // hearts sat orphaned in localStorage forever.
  const surviving = new Set(profiles.map((p) => String(p?.id ?? "")));
  for (const p of registry.profiles) {
    if (surviving.has(p.id)) continue;
    // PURGED, not just the synced stores: a person sync removed takes the
    // on-device-only stores (saved orders, cook ticks) with them too, as deleting
    // them here by hand does (profiles.js `remove`).
    for (const base of PURGED_BASE_KEYS) {
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
 * Write the merged cookbooks back to storage (roadmap 510/050). Like
 * `writeSnapshot`, it REPLACES: the recipe merge has already decided what is
 * gone. `flat` is every person's cookbook in one map (recipe-record.js
 * `flattenCookbooks`) — each person's is written to their own key (510/120,
 * owner-ruled "Per person"). Only people in this device's registry are
 * written: `writeSnapshot` has already added the ones a pull brought in, and a
 * person it removed takes their recipes with them. Sorted, so two devices
 * holding the same recipes hold the same bytes.
 */
export function writeRecipes(storage, flat) {
  const books = groupCookbooks(flat);
  const registry = sanitiseRegistry(parse(storage.getItem(PROFILES_KEY)));
  let ok = true;
  for (const p of registry.profiles) {
    const key = scopeKey(p.id, RECIPES_KEY);
    const book = books.get(p.id) || {};
    try {
      if (Object.keys(book).length) storage.setItem(key, JSON.stringify(book));
      else if (storage.getItem(key) != null) storage.removeItem(key);
    } catch {
      ok = false; /* blocked or over quota — the pull is lost, the device is unharmed */
    }
  }
  return ok;
}

/**
 * A read-only view of `storage` that keeps every raw string read through it
 * (roadmap 510/190). `unchanged(profiles)` then answers "would collecting
 * again give the same people?" by comparing strings rather than collecting:
 * the registry plus every per-person store of each person collected. Those
 * are all `sameSnapshot` and the recipe comparison look at, and each string
 * collects to one value, so equal strings mean an equal snapshot. A key the
 * view never read counts as moved — the safe answer, which costs the full
 * collect this replaces and nothing more.
 */
export function recordingStorage(storage) {
  const seen = new Map();
  const view = {
    getItem(k) {
      const v = storage.getItem(k);
      seen.set(k, v);
      return v;
    },
    key: (i) => (typeof storage.key === "function" ? storage.key(i) : null),
    get length() {
      return storage.length;
    },
  };
  const unchanged = (profiles) => {
    const keys = [PROFILES_KEY];
    for (const p of Array.isArray(profiles) ? profiles : []) {
      for (const base of SCOPED_BASE_KEYS) keys.push(scopeKey(String(p?.id ?? ""), base));
    }
    return keys.every((k) => seen.has(k) && storage.getItem(k) === seen.get(k));
  };
  return { view, unchanged };
}

/** Two recipe maps hold the same recipes, field for field. */
const sameRecipes = (a, b) => canonicalJson(a || {}) === canonicalJson(b || {});

/** Two `recipeBuckets` records (`{ n, v: { r0: etag… } }`) say the same. */
const sameBuckets = (a, b) => canonicalJson(a ?? null) === canonicalJson(b ?? null);

/**
 * The same personal data, or not — ignoring what a device may honestly differ
 * on. `active` is which profile THIS device shows and is never synced
 * (sync-merge.js), so two devices' snapshots of one identical group differ on
 * it forever; a null store and an empty one are the same absence. Keys are
 * sorted so producer order (collect vs merge) cannot manufacture a difference.
 * Used to skip a write the server does not need, and to notice a change made
 * on this device while a cycle was in flight.
 */
export function sameSnapshot(a, b) {
  const canon = (v) => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
    }
    return v;
  };
  const shape = (snap) =>
    JSON.stringify(
      canon(
        (Array.isArray(snap?.profiles) ? snap.profiles : []).map((p) => ({
          id: p?.id ?? "",
          name: p?.name ?? "",
          favourites: Array.isArray(p?.favourites) ? p.favourites : [],
          ratings: p?.ratings && typeof p.ratings === "object" ? p.ratings : {},
          notes: p?.notes && typeof p.notes === "object" ? p.notes : {},
          settings:
            p?.settings && typeof p.settings === "object" && Object.keys(p.settings).length
              ? p.settings
              : null,
        }))
      )
    );
  return shape(a) === shape(b);
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
  pullWindowMs = PULL_WINDOW_MS,
  setTimer = globalThis.setTimeout?.bind(globalThis),
  clearTimer = globalThis.clearTimeout?.bind(globalThis),
  // Called after a pull has been written to storage. `writeSnapshot` changes
  // localStorage, and the live favourites/ratings/settings singletons hold
  // their state IN MEMORY — so without this the data is correct on disk and
  // every screen keeps showing what it read at load. Injected rather than
  // imported so the engine stays free of the live stores (see sync-start.js).
  onApplied = () => {},
  // Is this device's storage in a newer schema than this build? Then this tab
  // is out of date (roadmap 510/110) and must neither write storage nor send
  // the server a copy built from data it may be misreading. Injectable for the
  // tests; the default reads the stamp in `storage`.
  behind = () => storageAhead(storage),
  // Which page and which build ran a cycle, for the sync log (roadmap
  // 510/380). The build is the controlling service worker's own
  // SHELL_VERSION, asked once per page (versions.js); null where there is no
  // worker to ask (a first visit, a test).
  page = () => globalThis.location?.pathname ?? null,
  build = async () => (await currentVersions()).shell ?? null,
} = {}) {
  const subs = new Set();
  let state = OFF;
  let error = null;
  let pending = null; // a merge that needs a decision before it can be written
  let timer = null;
  let inFlight = null;
  let started = false;
  let applied = onApplied;
  // True while a pull is being re-pointed into the live stores. Their
  // subscribers fire on reload exactly as they do on a tap, and until
  // 2026-08-17 that re-armed the debounce, so every successful sync scheduled
  // the next one: one KV write every ~20 s per open tab, forever, and a full
  // menu repaint each time. A change the ENGINE made is not a change to sync.
  let quiet = false;
  // True while this device holds a change the server has not accepted — a
  // failed cycle, a race lost on every attempt, or a debounced write not yet
  // sent. What the `online` listener asks before it spends a round trip.
  let waiting = false;

  // Asked once per page, and kept only once there is an answer: on a first
  // visit no worker controls the page yet, and a remembered "unknown" would
  // then label every entry this page writes.
  let buildP = null;
  const buildOnce = async () => {
    buildP ??= Promise.resolve().then(build).catch(() => null);
    const b = await buildP;
    if (b == null) buildP = null;
    return b;
  };

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

  const readBase = () => upgradeSnapshot(parse(storage.getItem(SYNC_BASE_KEY)));
  const writeBase = (snap) => {
    try {
      const next = JSON.stringify(snap);
      // A pull that changed nothing agrees on the same thing it agreed last
      // time, and rewrote these exact bytes on every page load and foreground
      // — 9.1 KB at 200 recipes (roadmap 510/190, survey finding 6). Compared
      // with what storage holds NOW, not with what this cycle read at its
      // start, so another tab's agreement landed mid-flight is still
      // replaced exactly as before.
      if (storage.getItem(SYNC_BASE_KEY) === next) return;
      storage.setItem(SYNC_BASE_KEY, next);
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
    // The no-base question (510/390) is read from the CONFIG, not this tab's
    // memory: it is one question for the device, and another tab may have
    // asked it, or answered it, since this one last ran a cycle.
    const ask = cfg.code ? openQuestion(cfg) : null;
    const askedHere = !!pending?.conflicts?.some((c) => c.kind === CONFLICT_NO_BASE);
    let s = cfg.code ? (state === OFF ? IDLE : state) : OFF;
    if (ask && s !== SYNCING) s = NEEDS_DECISION;
    else if (!ask && askedHere && s === NEEDS_DECISION) s = IDLE; // answered elsewhere
    return {
      state: s,
      code: cfg.code || null,
      lastSyncedAt: cfg.lastSyncedAt || null,
      error,
      conflicts: ask ? [askConflict(ask)] : askedHere ? null : pending?.conflicts ?? null,
    };
  }

  const url = (blobId) => `${endpoint.replace(/\/$/, "")}/v1/blob/${blobId}`;

  /**
   * Read and merge the recipe buckets (roadmap 510/050, ADR 0146 §2). Reads
   * only the buckets whose version on the server is not the one this device
   * last agreed — normally none — and returns the merged cookbook plus, per
   * bucket, whether the server's copy needs writing.
   *
   * `actual` is what the Worker reports it holds; `theirs.recipeBuckets` is
   * what the core copy recorded. They differ when a bucket was written without
   * its core update (a device whose core write then lost a race, or KV's
   * eventual consistency): that is DETECTED here — `mismatch` names it — and
   * the bucket is read and merged like any other change, because its contents
   * are some device's honest merge. Deciding what to read by `actual` rather
   * than by the core copy's record is what stops such a bucket being ignored.
   *
   * A bucket the core copy recorded but the Worker no longer holds (expired) is
   * "no opinion", never "everything in it was deleted": this device's recipes
   * stand and the bucket is written again.
   */
  async function readRecipes({ blobId, key, actual, theirs, base, mineRecipes }) {
    const mine = mineRecipes || {};
    const theirsN = theirs?.recipeBuckets?.n;
    // No report from the Worker (it predates buckets), or buckets cut a
    // different way by another build: recipes stay on this device, untouched.
    if (!actual || (theirsN != null && theirsN !== RECIPE_BUCKETS)) {
      return { supported: false, merged: mine, buckets: [], mismatch: [], conflicts: [] };
    }
    const recorded = theirs?.recipeBuckets?.v || {};
    const agreed = base?.recipeBuckets?.v || {};
    const baseHashes = base?.recipeHashes || {};
    const merged = {};
    const buckets = [];
    const mismatch = [];
    const conflicts = [];
    for (let k = 0; k < RECIPE_BUCKETS; k += 1) {
      const name = bucketName(k);
      let version = actual[name];
      if ((version || recorded[name]) && version !== recorded[name]) mismatch.push(name);
      let theirsK = null; // null: the server holds what we last agreed
      if (version && version !== agreed[name]) {
        const got = await fetchImpl(url(`${blobId}:${name}`), { method: "GET" });
        if (got.status === 200) {
          const plain = await openBlob(key, new Uint8Array(await got.arrayBuffer()));
          theirsK = readBucket(plain, k);
          if (theirsK === null) return { error: "mismatch" };
          version = got.headers.get("etag") || version;
        } else if (got.status === 404) {
          version = undefined; // gone since the report: no opinion
        } else {
          return { error: "unreachable" };
        }
      }
      const mineK = inBucket(mine, k);
      const baseK = inBucket(baseHashes, k);
      const r = mergeRecipeBucket(baseK, mineK, theirsK);
      Object.assign(merged, r.map);
      conflicts.push(...r.conflicts);
      let needs;
      if (!version) needs = null; // decided below, once we know if any recipe exists
      else if (theirsK) needs = !sameRecipes(r.map, theirsK);
      else needs = canonicalJson(hashRecipes(r.map)) !== canonicalJson(baseK);
      buckets.push({ k, name, version, map: r.map, needs });
    }
    // Once there is any recipe, EVERY bucket exists on the server, empty or
    // not: which buckets exist would otherwise tell it how many recipes there
    // are (sync-buckets.js, "PADDING").
    const exists = Object.keys(merged).length > 0 || buckets.some((b) => b.version);
    for (const b of buckets) if (b.needs === null) b.needs = exists;
    return { supported: true, merged, buckets, mismatch, conflicts };
  }

  /** Write the buckets that need it, each conditional on the version read.
   *  Returns the versions the core copy should record, or a failure.
   *
   *  It also returns `vouch`: the versions this device can stand behind for
   *  the Worker's re-arm (roadmap 510/330). Each bucket write names the core
   *  copy's version this cycle read and every other bucket's version as it
   *  stands, so the Worker re-arms only copies it reads in step with this
   *  device. A bucket in `mismatch` — the Worker's report and the core copy's
   *  record disagree — is vouched for only once this cycle has written it: the
   *  disagreement may be THIS device's stale read of a bucket another device
   *  has just rewritten, and vouching for the stale version would let the
   *  Worker put it back over theirs. */
  async function writeBuckets({ blobId, key, buckets, coreEtag, mismatch = [] }) {
    const v = {};
    const held = { core: coreEtag };
    for (const b of buckets) if (b.version && !mismatch.includes(b.name)) held[b.name] = b.version;
    for (const b of buckets) {
      if (!b.needs) {
        if (b.version) v[b.name] = b.version;
        continue;
      }
      const sealed = await sealBlob(key, bucketPlaintext(b.k, b.map));
      const others = { ...held };
      delete others[b.name];
      const put = await fetchImpl(`${url(`${blobId}:${b.name}`)}?${FAMILY_QUERY}=${RECIPE_BUCKETS}${knownQuery(others)}`, {
        method: "PUT",
        body: sealed,
        headers: b.version ? { "If-Match": b.version } : {},
      });
      if (put.status === 412) return { retry: true };
      if (put.status !== 204) return { failed: true };
      // No readable ETag (a proxy that hid it) records nothing, which the next
      // cycle reads as a mismatch and repairs with one extra read.
      const etag = put.headers.get("etag");
      if (etag) v[b.name] = etag;
      // Written: the older version is no longer one to vouch for. Unknown
      // (no readable ETag) vouches for nothing, so nothing re-arms it.
      if (etag) held[b.name] = etag;
      else delete held[b.name];
    }
    const { core: _core, ...vouch } = held;
    return { v, vouch };
  }

  /**
   * One whole cycle: read, merge, write, then record the agreement.
   *
   * `decisions` carries answers to a previous run's blocking conflicts — today
   * only the diet one (ADR 0060), which is safety data and is never resolved
   * without the user.
   */
  async function syncNow({ decisions = null, why = "sync now" } = {}) {
    const cfg = readConfig();
    if (!cfg.code) return { ok: false, error: "Sync is off." };
    if (inFlight) return inFlight;
    // An out-of-date tab applies no merge (roadmap 510/110). Checked before
    // the read, not only at the local write: its merge would be built from
    // data this build may misread, and the server must not receive it either.
    // Nothing is owed — the reloaded tab collects what is in storage and syncs.
    if (behind()) {
      setState(PAUSED, RELOAD_NEEDED);
      return { ok: false, error: "reload-needed" };
    }
    // A merge with no last agreement is waiting on the person (510/390).
    // Nothing is read or sent until they answer — not by a background pull,
    // a heart tapped meanwhile, a reconnect, or another tab — so no merge can
    // go ahead silently while the question is open. No network either: the
    // answer is the only thing that can change the outcome.
    const ask = openQuestion(cfg);
    if (ask && !NO_BASE_ANSWERS.has(decisions?.noBase)) {
      pending = { conflicts: [askConflict(ask)], merged: null };
      if (state !== NEEDS_DECISION) setState(NEEDS_DECISION);
      return { ok: false, needsDecision: true, noBase: true, people: askConflict(ask).people };
    }

    inFlight = (async () => {
      // What this run did, filled in as it goes, for the sync log (510/380).
      const trace = { why };
      try {
        // A 412 means the other device wrote between our read and our write.
        // Until 2026-09-30 that returned `retry: true` and nothing read it, so
        // the change sat on this device until the next edit, foreground or
        // reload (roadmap 510/070). Going round again reads THEIR write and
        // merges against it — the same cycle, so nothing new can go wrong —
        // and the bound stops two devices that keep racing from spinning. A
        // refused conditional write costs the Worker a read, not a KV write.
        let res;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
          res = await cycle(cfg, decisions, trace);
          if (!res.retry) break;
        }
        // Is there something this device still owes the server? A success
        // that deferred a mid-flight local change owes it (it scheduled
        // another cycle); a failure owes whatever it was carrying; a question
        // for the reader is theirs to answer, not the network's.
        waiting = res.ok === true ? !!res.deferredLocal : !res.needsDecision;
        await record(res, trace);
        return res;
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  /**
   * Keep this run in the device's sync log (roadmap 510/380) — unless it found
   * nothing to do: a run that had its last agreement, changed nothing here and
   * sent nothing is every page load's pull, and keeping those would push the
   * one that mattered out of the list (sync-log.js says why). Never throws.
   */
  async function record(res, trace) {
    try {
      const outcome = res.ok
        ? "synced"
        : res.noBase
          ? "asked"
          : res.needsDecision
            ? "needs-answer"
            : res.retry
              ? "raced"
              : res.error === "update-needed"
                ? "paused"
                : "error";
      const moved = !!(trace.here?.nAdded || trace.here?.nRemoved || trace.sent);
      if (outcome === "synced" && !moved && trace.base === "yes") return;
      const entry = {
        at: now(),
        page: page(),
        build: await buildOnce(),
        why: trace.why,
        base: trace.base ?? null,
        outcome,
      };
      if (outcome === "error" || outcome === "paused") entry.error = error || null;
      if (trace.here) entry.here = trace.here;
      if (outcome === "synced") entry.sent = trace.sent ?? null;
      appendSyncLog(storage, entry);
    } catch {
      /* the log is a diagnostic; it must never fail the sync it describes */
    }
  }

  /**
   * GET the core copy, asking for the bucket report when `ask`. Returns
   * `{ actual, theirs, etag }`, or `{ result }` — the cycle's answer — when it
   * must stop here: a copy that will not open, one in a newer shape, or no
   * answer at all.
   */
  async function readCore(blobId, key, ask) {
    const got = await fetchImpl(ask ? `${url(blobId)}?${BUCKET_QUERY}=${RECIPE_BUCKETS}` : url(blobId), { method: "GET" });
    const actual = parseBucketHeader(got.headers.get(BUCKET_HEADER));
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
        return { result: { ok: false, error: "That sync code doesn’t match the data on the server." } };
      }
      // A store this build reads has been written in a newer shape. Merging
      // it would misread it and write the misreading back for everyone, so
      // this is the one case that pauses (ADR 0146 §3). A store this build
      // has never heard of is NOT this case: it is carried, and sync goes on.
      // Nothing is written and nothing local changes; the next foreground
      // checks again, and an updated build simply passes.
      const ahead = storesAhead(theirs);
      if (ahead.length) {
        setState(PAUSED, UPDATE_NEEDED);
        return { result: { ok: false, error: "update-needed", stores: ahead } };
      }
      theirs = upgradeSnapshot(theirs) ?? theirs;
    } else if (got.status !== 404) {
      setState(ERROR, "Couldn’t reach sync just now. Your data is safe on this device.");
      return { result: { ok: false, error: "sync-unreachable" } };
    }
    return { actual, theirs, etag };
  }

  /** One read → merge → write → record pass. `syncNow` runs it, and runs it
   *  again (a bounded number of times) when the write lost a race. */
  async function cycle(cfg, decisions, trace = {}) {
    setState(SYNCING);
    try {
      const { blobId, key } = await deriveSyncKeys(normaliseSyncCode(cfg.code));

      // 1. what this device holds, and what it last agreed. Collected through
      //    a view that keeps the raw strings it read, so step 4 can tell in
      //    one compare per key whether anything moved since (roadmap
      //    510/190). Collected BEFORE the read since 510/140, because whether
      //    to ask about recipe buckets depends on it; a tap during the read is
      //    then caught by step 4 like a tap during the write, and carried by
      //    the cycle it schedules.
      const reading = recordingStorage(storage);
      const mine = collectPersonalData(reading.view, { exportedAt: now() });
      const base = readBase();
      // Every person's cookbook as one map, keyed recipe + person (510/120).
      const mineRecipes = flattenCookbooks(mine.profiles);

      // 2. read what the server has. Asking a Worker about recipe buckets
      //    costs it one KV read per bucket (8), so it is asked only by a
      //    device that holds a recipe or last agreed on buckets (roadmap
      //    510/140, survey finding 1) — nobody else has a bucket to hear
      //    about. A device that asked nothing and finds the core copy now
      //    records buckets (another device's first recipe) reads again,
      //    asking: one extra round trip, once. An older Worker ignores the
      //    query and reports nothing (roadmap 510/050).
      const holdsBuckets = Object.keys(mineRecipes).length > 0 || !!base?.recipeBuckets;
      let read = await readCore(blobId, key, holdsBuckets);
      if (!read.result && !holdsBuckets && read.theirs?.recipeBuckets?.n === RECIPE_BUCKETS) {
        read = await readCore(blobId, key, true);
      }
      if (read.result) return read.result;
      const { actual, etag } = read;

      // 2b. the recipe buckets (roadmap 510/050). Read before any write, so a
      //     bucket that will not open stops the cycle with nothing written.
      //     Read before the merge since 510/400: the cookbooks they hold say
      //     which recipes moved, which the merge's three inputs follow.
      const rec = await readRecipes({ blobId, key, actual, theirs: read.theirs, base, mineRecipes });
      if (rec.error === "mismatch") {
        setState(ERROR, "That sync code doesn’t match the data on the server.");
        return { ok: false, error: "That sync code doesn’t match the data on the server." };
      }
      if (rec.error) {
        setState(ERROR, "Couldn’t reach sync just now. Your data is safe on this device.");
        return { ok: false, error: "sync-unreachable" };
      }

      // 2c. hearts follow a moved recipe (roadmap 510/400). A heart, rating or
      //     note on a recipe's old id is the moved one, on ALL THREE inputs:
      //     this device's own copy already follows (a collect does), but the
      //     server's copy may have been written by a build that did not, and
      //     the base by this one before the move. Following only one side
      //     would read the other's old key as a separate heart and keep both.
      //     The moves come from every cookbook this cycle holds — this
      //     device's and the buckets' — never from an id in the app.
      const books = new Map(mine.profiles.map((p) => [String(p.id), p.recipes || {}]));
      if (rec.supported) {
        for (const [pid, book] of groupCookbooks(rec.merged)) books.set(pid, { ...(books.get(pid) || {}), ...book });
      }
      const theirs = followMovesInSnapshot(read.theirs, books);
      const baseF = followMovesInSnapshot(base, books);
      let mineF = followMovesInSnapshot(mine, books);

      // 2d. no silent merge without a base (roadmap 510/390). A person both
      //     sides hold, whose last agreement this device does not have, and
      //     for whom it holds something the server does not: merging now would
      //     add those as if new, though they may be things removed on another
      //     device since (510/320's union). So it asks, once, and waits —
      //     unless the person has already answered.
      const gap = baselessPeople(baseF, mineF, theirs);
      const both = (theirs?.profiles || []).map((p) => String(p?.id ?? ""));
      const covered = new Set((baseF?.profiles || []).map((p) => String(p?.id ?? "")));
      trace.base = !baseF ? "none" : mineF.profiles.some((p) => both.includes(String(p.id)) && !covered.has(String(p.id))) ? "partial" : "yes";
      const answer = NO_BASE_ANSWERS.has(decisions?.noBase) ? decisions.noBase : cfg.ask?.answer;
      if (gap.length) {
        if (!NO_BASE_ANSWERS.has(answer)) {
          const ask = { at: now(), people: gap };
          writeConfig({ ask });
          pending = { conflicts: [askConflict(ask)], merged: null };
          setState(NEEDS_DECISION);
          return { ok: false, needsDecision: true, noBase: true, people: gap };
        }
        if (answer === KEEP_SYNCED) mineF = keepTheirsFor(mineF, theirs, gap.map((p) => p.profileId));
      }

      const { merged, conflicts, changes } = mergePersonal(baseF, mineF, theirs ?? mineF);
      changes.recipeConflicts = rec.conflicts.length;

      // The allergen question blocks unless THIS run carries its answer: an
      // answer to the no-base question alone is not one (510/390).
      if (needsDecision(conflicts) && !decisions?.diet) {
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
      //    Buckets first, then the core copy recording their versions: a
      //    bucket written and then orphaned by a lost core race is exactly the
      //    case `readRecipes` detects and repairs on the next cycle, while the
      //    other order would publish versions for bytes that never landed.
      let vouch = {};
      if (rec.supported) {
        const w = await writeBuckets({ blobId, key, buckets: rec.buckets, coreEtag: etag, mismatch: rec.mismatch });
        if (w.retry) {
          setState(IDLE);
          return { ok: false, retry: true, error: "raced" };
        }
        if (w.failed) {
          setState(ERROR, "Couldn’t save to sync just now. Your data is safe on this device.");
          return { ok: false, error: "sync-write-failed" };
        }
        // Recorded only once a bucket exists: a group with no recipes carries
        // no field, so turning this on costs nothing until the first recipe.
        if (Object.keys(w.v).length || theirs?.recipeBuckets) {
          merged.recipeBuckets = { n: RECIPE_BUCKETS, v: w.v };
        }
        vouch = w.vouch;
      } else if (theirs?.recipeBuckets) {
        // Not ours to change without reading the buckets: carried as found.
        merged.recipeBuckets = theirs.recipeBuckets;
      }

      // Skipped when the server already holds exactly this — a pull that
      // changed nothing is not a write, and writing it anyway is what turned
      // every visibility change into a KV write. Compared with the copy AS
      // READ, not as followed (510/400): a server copy still holding a moved
      // recipe's old key is rewritten once, so no older build reads it back.
      const raw = read.theirs;
      if (!(raw && sameSnapshot(merged, raw) && sameBuckets(merged.recipeBuckets, raw.recipeBuckets))) {
        trace.sent = heartChange(raw, merged);
        const sealed = await sealBlob(key, merged);
        // How many buckets this user has, so the Worker re-arms those and no
        // others (roadmap 510/140): it read all 16 possible keys on every
        // write, 16 KV reads per heart for someone with no recipes at all.
        // The number the core copy being written records — 0 for nobody's
        // recipes. An older Worker ignores it and reads all 16, as before.
        const family = Number.isInteger(merged.recipeBuckets?.n) ? merged.recipeBuckets.n : 0;
        // …and the version of each bucket this device stands behind (from
        // writeBuckets), so the Worker re-arms a bucket only when it reads
        // that version — never a stale read of one this cycle has just
        // replaced (roadmap 510/330). Buckets carried unread vouch for nothing.
        const known = knownQuery(vouch);
        const put = await fetchImpl(`${url(blobId)}?${FAMILY_QUERY}=${family}${known}`, {
          method: "PUT",
          body: sealed,
          headers: etag ? { "If-Match": etag } : {},
        });

        if (put.status === 412) {
          // Someone else wrote between our read and our write. Not an error —
          // the correct response is to go round again against the newer blob,
          // which syncNow does (MAX_ATTEMPTS). Nothing local or in the base
          // has moved, so going round is safe. A bucket this cycle already
          // wrote is now orphaned, and the next cycle detects and merges it.
          setState(IDLE);
          return { ok: false, retry: true, error: "raced" };
        }
        if (put.status !== 204) {
          setState(ERROR, "Couldn’t save to sync just now. Your data is safe on this device.");
          return { ok: false, error: "sync-write-failed" };
        }
      }

      // 4. only now is this an agreement. The server holds `merged` — but the
      //    LOCAL half must not simply become it if anything here moved while
      //    the round trip was in flight. A heart or an allergen flag tapped
      //    during it lives in storage and not in `mine`; writing `merged` over
      //    it would erase the tap, and the next cycle would then collect the
      //    erased store and push the loss to every device (found by the
      //    2026-08-17 cold review — an allergen flag is the worst thing this
      //    can lose).
      //
      //    Nor may the tap simply be left standing with `merged` recorded as
      //    the base, which is what this did until 2026-10-01 (roadmap
      //    510/100): the base then held the other device's changes and this
      //    device did not, so the next cycle read every one of them as a
      //    deletion made HERE and pushed it — a heart added on the other
      //    phone vanished from both, and an allergen flag set there was
      //    switched off on both. A base must be an ANCESTOR of both sides.
      //
      //    So the pull and the tap are combined: a second three-way merge
      //    whose base is `mine` — what this device held when the cycle began,
      //    an ancestor of both the tap (`now2`) and the pull (`merged`). Both
      //    are kept, the device then holds `merged` plus the tap, `merged` is
      //    a true ancestor of that, and the cycle the tap scheduled carries it
      //    out as a change against it. No await between `now2` and the write
      //    below, so no further tap can land in between.
      //
      //    The one thing that combination may not do is settle a diet
      //    question: a flag tapped here mid-flight against a flag changed
      //    there is two-sided safety data (ADR 0060). Then nothing local is
      //    written and the LAST agreement stands, so the next cycle sees both
      //    sides against a real ancestor and asks.
      //
      //    WHETHER anything moved is asked of the raw strings first (roadmap
      //    510/190): every key the comparison below depends on — the registry
      //    and each person's stores — is compared with the string `mine` was
      //    built from. Identical strings collect to an identical snapshot, so
      //    the answer is the one the full collect would give, and the collect,
      //    its parse and both canonical comparisons are skipped. Storage is
      //    still READ, deliberately: another tab's write lands in storage
      //    before its `storage` event is dispatched here (that is a queued
      //    task), and a marker bumped by events would miss exactly the change
      //    this step exists to catch.
      const now2 = reading.unchanged(mine.profiles) ? mine : collectPersonalData(storage, { exportedAt: now() });
      const localMoved =
        now2 !== mine &&
        (!sameSnapshot(mine, now2) || !sameRecipes(mineRecipes, flattenCookbooks(now2.profiles)));
      let local = merged;
      let agreed = true;
      if (localMoved) {
        const combined = mergePersonal(mine, now2, merged);
        if (needsDecision(combined.conflicts)) agreed = false;
        else local = combined.merged;
      }
      const coreMoved = agreed && !sameSnapshot(local, now2);
      if (coreMoved) trace.here = heartChange(now2, local);
      const recipesMoved = rec.supported && !localMoved && !sameRecipes(rec.merged, mineRecipes);
      if (coreMoved || recipesMoved) {
        if (coreMoved) writeSnapshot(storage, local);
        if (recipesMoved) writeRecipes(storage, rec.merged);
        // Before the base, deliberately: if re-pointing the live stores
        // throws, the base must not claim an agreement whose local half
        // never landed. Quiet, so the stores' own reload notifications do
        // not re-arm the debounce.
        quiet = true;
        try {
          applied(local);
        } catch {
          /* a screen that failed to repaint is not a reason to fail the sync */
        } finally {
          quiet = false;
        }
      }
      // The recipe half of the agreement. Advanced only when the buckets were
      // read and this device took the merge: if the Worker could not report
      // buckets, or a local change landed mid-flight, the LAST agreement
      // stands — then the next cycle reads the buckets again (their versions
      // differ from it) and merges them, rather than reading another device's
      // additions as this device's deletions. (That was already right when
      // 510/100 found the core half wrong; the tests there cover both.)
      if (agreed) {
        const recipeAgreement =
          rec.supported && !localMoved
            ? { recipeBuckets: merged.recipeBuckets ?? null, recipeHashes: hashRecipes(rec.merged) }
            : { recipeBuckets: base?.recipeBuckets ?? null, recipeHashes: base?.recipeHashes ?? {} };
        writeBase({ ...merged, ...recipeAgreement });
      }
      // An agreement answers the no-base question (510/390) for good: there
      // is a base now. Cleared in the same write as the stamp, so a no-op
      // pull still writes one key.
      writeConfig(agreed && readConfig().ask ? { lastSyncedAt: now(), ask: null } : { lastSyncedAt: now() });
      setState(IDLE);
      if (localMoved) schedule();
      return { ok: true, changes, deferredLocal: localMoved, bucketMismatch: rec.mismatch };
    } catch {
      // Offline is the overwhelmingly common cause and is not a fault.
      setState(ERROR, "Couldn’t reach sync just now. Your data is safe on this device.");
      return { ok: false, error: "sync-unreachable" };
    }
  }

  /** Debounced trigger — what a heart or a rating change calls. */
  function schedule() {
    if (quiet || !readConfig().code || !setTimer) return;
    waiting = true;
    if (timer) clearTimer(timer);
    timer = setTimer(() => {
      timer = null;
      syncNow({ why: "change" });
    }, debounceMs);
  }

  /** Send whatever is pending right now — the app is going away. */
  function flush() {
    if (!timer) return;
    clearTimer(timer);
    timer = null;
    syncNow({ why: "leaving" });
  }

  /**
   * Does this device hold something the server has not accepted, that no timer
   * or flag in THIS page knows about? `waiting` and `timer` are memory, and the
   * site is three pages: a heart tapped on one is flushed as it goes hidden,
   * and that request can be cut off by the navigation. The next page must then
   * still send it, so this compares what storage holds with what was last
   * agreed — the same two things step 4 of a cycle compares, from storage and
   * no network. Any doubt (no base, a read that throws, recipes the Worker
   * never reported on) answers yes, which only costs the pull it would have
   * made anyway.
   */
  function holdsUnsent() {
    try {
      const base = readBase();
      if (!base) return true;
      const mine = collectPersonalData(storage, { exportedAt: now() });
      if (!sameSnapshot(mine, base)) return true;
      return !sameRecipes(hashRecipes(flattenCookbooks(mine.profiles)), base.recipeHashes || {});
    } catch {
      return true;
    }
  }

  /**
   * The opportunistic pull — a page load or a return to the foreground — which
   * is the only caller the window applies to (roadmap 510/160). A pull is
   * skipped only when ALL of these hold: the last sync succeeded under
   * `pullWindowMs` ago, nothing is waiting or debounced here, and storage
   * matches the last agreement. A pending local write therefore always goes,
   * and a push cycle reads first exactly as it always did. An unreadable,
   * absent or FUTURE `lastSyncedAt` (a clock that was wrong) is stale, so a
   * wrong clock cannot silence pulls. Explicit "Sync now", enabling, joining,
   * answering a question, the retry after a lost race and a reconnect with a
   * change waiting all call `syncNow` directly and are never throttled.
   */
  function pullIfStale() {
    const cfg = readConfig();
    if (!cfg.code) return;
    const age = Date.parse(now()) - Date.parse(cfg.lastSyncedAt || "");
    const fresh = Number.isFinite(age) && age >= 0 && age < pullWindowMs;
    if (fresh && !inFlight && !timer && !waiting && !holdsUnsent()) return;
    syncNow({ why: "open" });
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
      writeConfig({ code, lastSyncedAt: null, ask: null });
      // No base: this device has never agreed with anything, so the first cycle
      // treats everything as an addition — which is correct (a new code holds
      // nothing to ask about, 510/390).
      try {
        storage.removeItem(SYNC_BASE_KEY);
      } catch {
        /* nothing to clear */
      }
      setState(IDLE);
      const res = await syncNow({ why: "turned on" });
      return { ok: res.ok !== false || !!res.needsDecision, code, ...res };
    },

    /** Adopt a code from another device. */
    async join(input) {
      const code = normaliseSyncCode(input);
      if (!code) {
        return { ok: false, error: "That code doesn’t look right — check it and try again." };
      }
      // No base, as above. Joining a code whose data differs from what this
      // device holds is then the one moment a merge has no last agreement on
      // purpose, so if this device holds anything the server does not, the
      // first cycle ASKS whether to add it (510/390) rather than adding it.
      writeConfig({ code: input.trim().toUpperCase(), lastSyncedAt: null, ask: null });
      try {
        storage.removeItem(SYNC_BASE_KEY);
      } catch {
        /* nothing to clear */
      }
      setState(IDLE);
      return syncNow({ why: "joined" });
    },

    /**
     * Answer a blocked merge and finish it: `{ diet }` for the allergen
     * question (ADR 0060), `{ noBase: "keep" | "add" }` for the no-base one
     * (510/390). The no-base answer is kept in the device's sync config until
     * a sync lands, so a cycle that cannot finish now (offline, or the
     * allergen question after it) still carries it — and a second tab's
     * answer after the first has landed changes nothing, because there is a
     * base again and nothing left to ask.
     */
    async resolve(decisions) {
      if (NO_BASE_ANSWERS.has(decisions?.noBase)) {
        const cfg = readConfig();
        if (cfg.ask) writeConfig({ ask: { ...cfg.ask, answer: decisions.noBase } });
      }
      return syncNow({ decisions, why: "answer" });
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
    start({ stores = [], doc = globalThis.document, win = globalThis.window, onApplied: hook } = {}) {
      // Set even on a repeat call: the first screen to start wins the listeners,
      // but every screen needs its OWN stores re-pointed after a pull, and a
      // silently-ignored hook here is how a pull lands on disk and on no screen.
      if (typeof hook === "function") applied = hook;
      if (started) return () => {};
      started = true;
      const offs = [];
      // A store also notifies when it RELOADS because another tab wrote to it:
      // that tab's `storage` event reaches app.js/menu.js/recipe.js, they call
      // `reload()`, and the subscribers fire exactly as on a tap here. Until
      // 2026-10-01 that scheduled a sync in every other open tab, so one heart
      // with two tabs open cost two pulls (roadmap 510/210, survey finding 8).
      // The tab that wrote owns the push — its own commit scheduled it — so a
      // notification raised INSIDE a `storage` event's dispatch is not a
      // change to sync here. `window.event` is how a callback deep in that
      // chain can tell (DOM Standard, "current event"; set in every engine we
      // ship to). Where it is missing the check is false and this behaves as
      // it always did — a spare pull, never a lost push. A same-tab reload
      // (an import, a profile rename) is not inside a `storage` event, so it
      // still schedules, as it must.
      const fromOtherTab = () => win?.event?.type === "storage";
      for (const store of stores) {
        if (typeof store?.subscribe === "function") {
          offs.push(store.subscribe(() => {
            if (!fromOtherTab()) schedule();
          }));
        }
      }
      if (doc?.addEventListener) {
        const onVis = () => {
          // Hidden first: a flush on the way out is the case that actually
          // loses data — three hearts and then the phone locks.
          if (doc.visibilityState === "hidden") flush();
          else pullIfStale();
        };
        doc.addEventListener("visibilitychange", onVis);
        offs.push(() => doc.removeEventListener("visibilitychange", onVis));
      }
      // Back online (roadmap 510/070). An offline change fails, sets the
      // error state and, until 2026-09-30, then waited for the next
      // foreground — a phone left open on the bench never sent it. Only when
      // something is owed: a device with nothing waiting spends nothing on a
      // reconnect, and a pending debounce is sent now rather than restarted.
      if (win?.addEventListener) {
        const onOnline = () => {
          if (!readConfig().code) return;
          if (timer) flush();
          else if (waiting) syncNow({ why: "online" });
        };
        win.addEventListener("online", onOnline);
        offs.push(() => win.removeEventListener("online", onOnline));
        // Another tab asked, or answered, the no-base question (510/390): it
        // lives in the shared sync config, so this tab's panel repaints from
        // it rather than offering a question already answered. A repaint
        // only — nothing is read from the network or written here.
        const onStorage = (e) => {
          if (e?.key === SYNC_KEY) emit();
        };
        win.addEventListener("storage", onStorage);
        offs.push(() => win.removeEventListener("storage", onStorage));
      }
      // A pull on load, so opening the app on the laptop shows what the phone
      // did. Fire-and-forget: a failure here must never block a page render.
      pullIfStale();
      return () => {
        for (const off of offs) off();
        started = false;
      };
    },

    syncNow,
    schedule,
    flush,
    /** The device's sync log, oldest first (510/380): what Settings shows. */
    history: () => readSyncLog(storage),
    /** Exposed for the headless check, which has to assert that a burst of
     *  changes produces one write rather than five. */
    _pendingWrite: () => !!timer,
  };
}

export const sync = createSync();
