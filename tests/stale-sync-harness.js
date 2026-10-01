// Harness for roadmap 510/340 (a stale sync read merged as another device's
// change) and the 510/320 question it was filed to answer. Since the 510/340
// fix (ADR 0151) a device talks to the live Worker, which routes to a Durable
// Object stand-in (`storeFor`); the frozen KV-only Worker is exported as
// `legacyKvWorker` for the runs that need a Worker that CAN read stale. Not a test file
// itself — `node --test` runs `*.test.js` — so the fuzz can also be driven from
// a script with other builds of the client and the Worker swapped in.
//
// THE KV MODEL IS CLOUDFLARE'S DOCUMENTED ONE, NOT A WORST CASE.
// developers.cloudflare.com/kv/concepts/how-kv-works/ (read 2026-10-02, page
// dated 2026-04-21): "Changes are usually immediately visible in the Cloudflare
// global network location at which they are made", "may take up to 60 seconds
// or more to be visible in other global network locations as their cached
// versions of the data time out", and a read caches its value for `cacheTtl`,
// default 60 s. So `EdgeKV` keeps one central history per key and one cache
// per LOCATION: a read inside a location's 60 s window returns what that
// location cached, whatever has been written since; a write lands centrally and
// (by default) in its own location's cache. Nothing is staler than a location
// that read the key in the last minute. `LaggyKV` in worker/sync-worker.test.js
// is the harsher model (a location that does not see its own writes); this one
// needs a second location to go wrong, which is how a phone moving between
// Wi-Fi and mobile data, or two devices on different networks, actually meets
// the Worker.

import { createSync as currentCreateSync } from "../site/js/sync.js";
import { applyPersonalData, collectPersonalData } from "../site/js/personal-data.js";
import { PROFILES_KEY, scopeKey } from "../site/js/profiles.js";
import { favKey } from "../site/js/favourites.js";
import { moveBackup } from "../tools/move_recipes.mjs";
import currentWorker, { SyncStore } from "../worker/sync-worker.js";
import { DurableObjectNamespaceStandIn } from "../worker/durable-object-standin.js";
// The Worker as it stood before 510/340 (KV-only), frozen: the 510/320 fuzz
// needs a Worker that CAN serve a stale read, and the live one no longer can.
import legacyKvWorker from "../worker/sync-worker-kv-only.js";

export { legacyKvWorker };
export const CACHE_TTL_MS = 60_000;
export const ORIGIN = "https://lets-eat.myspot.nz";
const T0 = Date.parse("2026-10-01T08:00:00.000Z");
/** When the stand-in's Worker version "was deployed": a day before T0, so the
 *  objects' one-time KV import is long past its settling window. */
export const DEPLOYED_AT = new Date(T0 - 86_400_000).toISOString();
/** The stand-in clock's `kv.clock` (ms since T0) as an ISO time. */
export const atClock = (ms) => new Date(T0 + ms).toISOString();

/**
 * The sync store over `kv` (roadmap 510/340): one Durable Object namespace per
 * KV world, shared by every device, on the stand-in's clock. An object lives in
 * ONE place, so its own KV reads (the import) and mirror writes go through one
 * location, "DO" — not through whichever location the device's request hit.
 * The mirror is on, as wrangler.toml ships it.
 */
export function storeFor(kv, { mirror = "on", deployedAt = DEPLOYED_AT, location = "DO" } = {}) {
  kv.store ??= new DurableObjectNamespaceStandIn(
    SyncStore,
    () => ({ SYNC_BLOBS: kv.at(location), KV_MIRROR: mirror, CF_VERSION_METADATA: { timestamp: deployedAt } }),
    { now: () => Math.floor((T0 + kv.clock) / 1000) }
  );
  return kv.store;
}

export function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
  Object.defineProperty(s, "length", { get: () => m.size });
  s.key = (i) => [...m.keys()][i] ?? null;
  return s;
}

export const FAV = "faves.favourites.v1";
export function device(favs = [], ratings = {}) {
  return fakeStorage({
    [PROFILES_KEY]: JSON.stringify({ v: 1, activeId: "default", profiles: [{ id: "default", name: "Me" }] }),
    [scopeKey("default", FAV)]: JSON.stringify(favs),
    [scopeKey("default", "faves.ratings.v1")]: JSON.stringify(ratings),
    [scopeKey("default", "faves.notes.v1")]: JSON.stringify({}),
  });
}
export const venue = (id) => ({ type: "venue", venueId: id, venueName: id });
export const favsOf = (st) => JSON.parse(st.getItem(scopeKey("default", FAV)) || "[]").map(favKey).sort();
export const setFavs = (st, list) => st.setItem(scopeKey("default", FAV), JSON.stringify(list));
export const heart = (st, entry) => {
  const list = JSON.parse(st.getItem(scopeKey("default", FAV)) || "[]");
  if (!list.some((e) => favKey(e) === favKey(entry))) setFavs(st, [...list, entry]);
};
export const unheart = (st, key) =>
  setFavs(st, JSON.parse(st.getItem(scopeKey("default", FAV)) || "[]").filter((e) => favKey(e) !== key));

/** Workers KV as documented: central history, and a 60 s read cache per location. */
export class EdgeKV {
  constructor({ ttlMs = CACHE_TTL_MS, ownWritesVisible = true } = {}) {
    this.ttlMs = ttlMs;
    this.ownWritesVisible = ownWritesVisible;
    this.clock = 0; // ms since T0
    this.central = new Map(); // key -> [{ at, value, metadata, ttl }]
    this.caches = new Map(); // location -> Map(key -> { at, entry })
    this.staleReads = 0;
    this.reads = 0;
  }
  latest(key) {
    const h = this.central.get(key) || [];
    return h[h.length - 1] || null;
  }
  at(loc) {
    const cache = this.caches.get(loc) || new Map();
    this.caches.set(loc, cache);
    return {
      getWithMetadata: async (key) => {
        this.reads += 1;
        let c = cache.get(key);
        if (!c || this.clock - c.at >= this.ttlMs) {
          c = { at: this.clock, entry: this.latest(key) };
          cache.set(key, c);
        }
        if (c.entry !== this.latest(key)) this.staleReads += 1;
        const w = c.entry;
        return w ? { value: w.value.slice(0), metadata: w.metadata } : { value: null, metadata: null };
      },
      put: async (key, value, opts = {}) => {
        const bytes = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(value.slice(0));
        const w = { at: this.clock, value: bytes.buffer, metadata: opts.metadata ?? null, ttl: opts.expirationTtl ?? null };
        const h = this.central.get(key) || [];
        h.push(w);
        this.central.set(key, h);
        if (this.ownWritesVisible) cache.set(key, { at: this.clock, entry: w });
      },
    };
  }
}

/**
 * A device talking to the REAL Worker over `kv`. `loc` is where its next
 * request lands; move it to send the device through another location. Set
 * `d.worker` to redeploy under it (the 510/340 cutover test).
 */
export function phone(storage, kv, { worker = currentWorker, createSync = currentCreateSync, loc = "L1" } = {}) {
  const d = { storage, loc, requests: [], worker };
  const fetchImpl = async (u, i = {}) => {
    d.requests.push({ method: i.method || "GET", loc: d.loc, at: kv.clock });
    const res = await d.worker.fetch(
      new Request(String(u).replace("https://example.invalid", "https://w.test"), {
        method: i.method || "GET",
        headers: { Origin: ORIGIN, ...(i.headers || {}) },
        body: i.body,
      }),
      // Both bindings, always: the live Worker routes to SYNC_STORE, the frozen
      // KV-only one reads SYNC_BLOBS at the device's location, as it did.
      { SYNC_BLOBS: kv.at(d.loc), SYNC_STORE: storeFor(kv), ALLOWED_ORIGINS: ORIGIN }
    );
    return { status: res.status, headers: res.headers, arrayBuffer: () => res.arrayBuffer() };
  };
  d.sync = createSync({
    storage,
    endpoint: "https://example.invalid",
    fetchImpl,
    now: () => new Date(T0 + kv.clock).toISOString(),
    setTimer: () => 0, // the tests drive every cycle by hand
    clearTimer: () => {},
  });
  return d;
}

// --- the owner's import, as in tests/sync.test.js ---------------------------
export const MV = "test-kitchen";
export const MOVED = ["alpha-bake", "beta-bake"];
export const MOVE_PLAN = {
  venueId: MV,
  moves: MOVED.map((id) => ({ from: { venueId: MV, dishId: id }, to: `u:${id}` })),
};
export const MOVE_SOURCES = {
  venue: {
    id: MV,
    menu: [{ section: "Baking", items: MOVED.map((id) => ({ name: id, dishId: id, steps: ["Mix.", "Bake."] })) }],
  },
  history: null,
};
export const kHeart = (dishId) => ({ type: "dish", venueId: MV, venueName: "Test Kitchen", name: dishId, dishId, isRecipe: true });
export const OLD_KEYS = MOVED.map((id) => `d:${MV} ${id}`);
export const NEW_KEYS = MOVED.map((id) => `d:u:mine u:${id}`);

/** Runbook steps 3–5 on one device: export, run the tool, Replace-import. */
export function moveOn(storage) {
  const res = moveBackup(collectPersonalData(storage, { exportedAt: "2026-10-01T08:00:00.000Z" }), MOVE_PLAN, MOVE_SOURCES);
  if (!res.ok) throw new Error(res.error);
  const report = applyPersonalData(storage, JSON.stringify(res.data), { mode: "replace" });
  if (!report.ok) throw new Error(report.error);
}

/** Per moved recipe: does this list hold the old heart, the moved one, both? */
export function moveShape(keys) {
  const set = new Set(keys);
  const out = { both: 0, oldOnly: 0, movedOnly: 0, neither: 0 };
  MOVED.forEach((_, i) => {
    const o = set.has(OLD_KEYS[i]);
    const n = set.has(NEW_KEYS[i]);
    out[o && n ? "both" : o ? "oldOnly" : n ? "movedOnly" : "neither"] += 1;
  });
  return out;
}

// --- the fuzz -----------------------------------------------------------------

/** A small seeded PRNG (mulberry32), so a failing run can be replayed by seed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = ["kk", "laksa-house", "pho-bar", "dumpling", "taco", "curry", "bao", "ramen"];
const HISTORIC = ["x-one", "x-two", "x-three"]; // hearted once, removed before the run

/**
 * One run of the owner's 510/050 sequence on two devices — laptop A imports,
 * phone B — through `locations` KV locations, with random gaps, random
 * location changes and random taps and pulls afterwards. Returns what was
 * seen: the worst move shape on any device at any observation point, the
 * settled shape, hearts lost or revived against what the person did, and how
 * many reads were stale.
 *
 * Parameter space per run (drawn from `r`): own-writes-visible yes/no; 2–4
 * locations; a per-request chance of a device switching location of 0, 0.3 or
 * 1; gaps of 1–90 s between steps; three hearts removed 5–120 s before the
 * runbook, so an older copy holding them can still be cached; 3–14 random
 * events after the runbook (a pull, a heart or an un-heart then a sync, on
 * either device); and the core copy optionally seeded without a write time `t`
 * (a copy from before 510/050, the trigger 510/330 fixed).
 */
export async function fuzzOnce(seed, { worker = currentWorker, createSync = currentCreateSync } = {}) {
  const r = rng(seed);
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  const kv = new EdgeKV({ ownWritesVisible: r() < 0.5 });
  const locs = ["L1", "L2", "L3", "L4"].slice(0, 2 + Math.floor(r() * 3));
  const pSwitch = pick([0, 0.3, 1]);
  const gap = () => {
    kv.clock += 1_000 + Math.floor(r() * 89_000);
  };
  const intent = new Map(); // fav key -> true (hearted) / false (removed), last action wins
  // The same, counting only actions that CHANGED the device's list (510/340).
  // A "heart" on a device that still holds the key — the other device removed
  // it and this one has not pulled since — is a no-op here, yet `intent` reads
  // it as "the person wants it": the next sync then removes it, correctly, and
  // `lost` counts it. In the app the same tap would UN-heart. `intent` is kept
  // as it was, so the options paper's numbers still reproduce; `effective` is
  // what a correct sync must honour (measured 2026-10-02: on the Durable Object
  // path every `lost` in 300 seeds was this no-op, and `lostEffective` was 0).
  const effective = new Map();

  const start = [...POOL.slice(0, 3).map(venue), ...MOVED.map(kHeart)];
  const a = phone(device([...start, ...HISTORIC.map(venue)]), kv, { worker, createSync, loc: pick(locs) });
  const b = phone(device([]), kv, { worker, createSync, loc: pick(locs) });
  for (const e of start) {
    intent.set(favKey(e), true);
    effective.set(favKey(e), true);
  }
  const devs = { A: a, B: b };
  const move = (d) => {
    if (r() < pSwitch) d.loc = pick(locs);
  };
  const run = async (d) => {
    move(d);
    return d.sync.syncNow();
  };

  let worst = { both: 0, oldOnly: 0 };
  let afterMove = false; // before the move, "old only" is simply correct
  const observe = () => {
    if (!afterMove) return;
    for (const d of [a, b]) {
      const s = moveShape(favsOf(d.storage));
      worst = { both: Math.max(worst.both, s.both), oldOnly: Math.max(worst.oldOnly, s.oldOnly) };
    }
  };

  // History: pair, then remove three hearts. An older copy holding them may
  // still sit in some location's cache when the runbook starts.
  const { code } = await a.sync.enable();
  if (r() < 0.5) {
    // The pre-050 trigger: a core copy with no write time.
    for (const w of kv.central.get([...kv.central.keys()][0]) || []) if (w.metadata) delete w.metadata.t;
  }
  kv.clock += 1_000;
  await b.sync.join(code);
  kv.clock += 1_000;
  for (const k of HISTORIC) {
    unheart(a.storage, `v:${k}`);
    intent.set(`v:${k}`, false);
    effective.set(`v:${k}`, false);
  }
  await run(a);
  kv.clock += 5_000 + Math.floor(r() * 115_000);
  await run(b);

  // Runbook step 2: both synced and quiet.
  gap();
  await run(a);
  gap();
  await run(b);
  // Steps 3–5 on A, then Sync now.
  gap();
  moveOn(a.storage);
  afterMove = true;
  MOVED.forEach((_, i) => {
    for (const m of [intent, effective]) {
      m.set(OLD_KEYS[i], false);
      m.set(NEW_KEYS[i], true);
    }
  });
  await run(a);
  observe();
  // Step 6: B syncs, then each once more.
  gap();
  await run(b);
  observe();
  gap();
  await run(a);
  gap();
  await run(b);
  observe();

  // Afterwards: ordinary use.
  const events = 3 + Math.floor(r() * 12);
  for (let i = 0; i < events; i += 1) {
    kv.clock += 1_000 + Math.floor(r() * (r() < 0.5 ? 20_000 : 89_000));
    const name = pick(["A", "B"]);
    const d = devs[name];
    const kind = pick(["pull", "heart", "unheart"]);
    if (kind === "heart") {
      const id = pick(POOL);
      if (!favsOf(d.storage).includes(`v:${id}`)) effective.set(`v:${id}`, true);
      heart(d.storage, venue(id));
      intent.set(`v:${id}`, true);
    } else if (kind === "unheart") {
      const held = favsOf(d.storage).filter((k) => k.startsWith("v:"));
      if (held.length) {
        const k = pick(held);
        unheart(d.storage, k);
        intent.set(k, false);
        effective.set(k, false);
      }
    }
    await run(d);
    observe();
  }

  // Settle: every cache expires, then each device syncs twice.
  kv.clock += 3 * CACHE_TTL_MS;
  for (const d of [a, b, a, b]) await run(d);
  observe();

  const final = { A: favsOf(a.storage), B: favsOf(b.storage) };
  const against = (wants) => {
    const lost = [];
    const revived = [];
    for (const [k, want] of wants) {
      for (const [n, keys] of Object.entries(final)) {
        const has = keys.includes(k);
        if (want && !has) lost.push(`${n}:${k}`);
        if (!want && has) revived.push(`${n}:${k}`);
      }
    }
    return { lost, revived };
  };
  const { lost, revived } = against(intent);
  const eff = against(effective);
  return {
    seed,
    worst,
    settled: { A: moveShape(final.A), B: moveShape(final.B) },
    agree: final.A.join() === final.B.join(),
    lost,
    revived,
    lostEffective: eff.lost,
    revivedEffective: eff.revived,
    staleReads: kv.staleReads,
    reads: kv.reads,
  };
}
