// Cook mode — the model half (ROADMAP 17d, ADR 0034). One step on screen at a
// time, and the screen kept awake while you cook. `cook-ui.js` owns the DOM;
// everything here is pure or dependency-injected, so the two things that are
// easy to get wrong — the step boundaries and the wake-lock lifecycle — are
// provable under `node --test` without a browser.
//
// WHY THE WAKE LOCK IS THE WHOLE POINT. A recipe you cook from is a page you
// stare at with wet hands and never touch for four minutes; the phone sleeps
// and you have to dry off to see step 5. `navigator.wakeLock` fixes that in one
// call — but it has three sharp edges, and all three are handled below rather
// than in the UI:
//
//   1. IT IS NOT EVERYWHERE. Safari only got it in iOS 16.4, and a browser
//      without it must simply behave as it always did — no error, no warning,
//      no dead switch. Every entry point here returns a reason instead of
//      throwing, and the caller shows the "screen stays on" note only on a
//      genuine hold.
//   2. THE OS TAKES IT BACK. Hiding the page (a phone call, a tab switch, the
//      screen locking anyway) releases the lock permanently — re-showing the
//      page does NOT restore it. So we keep our own `wanted` flag and re-ask on
//      every visibilitychange; without that, cook mode silently stops working
//      the first time someone answers a text.
//   3. IT MUST BE GIVEN BACK. A lock left held after cook mode closes burns
//      battery on a page nobody is reading. release() is the only way out and
//      it clears `wanted`, so a late visibilitychange can't resurrect it.

/** Steps a recipe can be cooked from. A recipe with none can't enter cook mode. */
export function stepsOf(item) {
  const steps = item?.steps;
  return Array.isArray(steps) ? steps.filter((s) => typeof s === "string" && s.trim() !== "") : [];
}

/** Whether the "Cook mode" affordance should exist at all (23 of 24 recipes). */
export const canCook = (item) => stepsOf(item).length > 0;

/** Keep an index inside [0, count-1]; an empty recipe pins at 0. */
export function clampIndex(index, count) {
  const n = Number.isFinite(index) ? Math.trunc(index) : 0;
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(Math.max(n, 0), count - 1);
}

/**
 * The whole navigable state for a step index. `atLast` is what turns the
 * forward button into "Done" — cook mode's only exit that isn't a dismissal.
 */
export function stepState(index, count) {
  const total = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
  const i = clampIndex(index, total);
  return {
    index: i,
    count: total,
    number: total ? i + 1 : 0,
    atFirst: i === 0,
    atLast: total === 0 || i === total - 1,
    label: stepLabel(i, total),
  };
}

/**
 * "Step 3 of 9". Interpolated, so it stays English by reo.js's stated rule (the
 * engine swaps whole strings only) — same as "Serves 4" and the hours badges.
 */
export function stepLabel(index, count) {
  if (!Number.isFinite(count) || count <= 0) return "No steps";
  return `Step ${clampIndex(index, count) + 1} of ${Math.trunc(count)}`;
}

/**
 * Move by `delta` steps, saturating at both ends rather than wrapping. Wrapping
 * was rejected on purpose: step 9 → step 1 on a stray tap looks like the recipe
 * restarted, and in a kitchen that is a real mistake, not a nuisance.
 */
export const advance = (index, count, delta) => clampIndex(clampIndex(index, count) + (Number.isFinite(delta) ? Math.trunc(delta) : 0), count);

/** Keyboard → step move. Returns null for a key cook mode doesn't own. */
export function keyToIndex(key, index, count) {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return advance(index, count, 1);
    case "ArrowLeft":
    case "ArrowUp":
      return advance(index, count, -1);
    case "Home":
      return clampIndex(0, count);
    case "End":
      return clampIndex(count - 1, count);
    default:
      return null;
  }
}

/**
 * A wake lock with a memory. Everything is injected so the lifecycle is
 * testable against a fake `navigator.wakeLock`-shaped object.
 *
 * @param {object} deps
 * @param {{request:(type:string)=>Promise<any>}} [deps.wakeLock] the API, or
 *        undefined on a browser that doesn't have it (the common case on older
 *        iOS — treated as "unsupported", never as an error).
 * @param {() => boolean} [deps.isVisible] whether the page is on screen.
 */
export function createWakeLock({
  wakeLock = globalThis.navigator?.wakeLock,
  isVisible = () => globalThis.document?.visibilityState !== "hidden",
} = {}) {
  let sentinel = null;
  let wanted = false;
  let inflight = null;

  const supported = () => typeof wakeLock?.request === "function";
  // A sentinel the OS has taken back reports `released: true`; treat that as
  // not-held even if no `release` event reached us.
  const held = () => sentinel != null && sentinel.released !== true;

  function forget(s) {
    if (sentinel === s) sentinel = null;
  }

  /**
   * Hand the sentinel back without forgetting that cook mode wants one. Used
   * both by release() and by hiding the page — the difference is only what
   * happens to `wanted`.
   */
  async function drop() {
    const s = sentinel;
    sentinel = null;
    if (!s) return "idle";
    try {
      await s.release?.();
      return "released";
    } catch {
      // Already released, or the page is going away. Our reference is gone
      // either way, so nothing can double-release it.
      return "failed";
    }
  }

  async function acquire() {
    wanted = true;
    if (!supported()) return { ok: false, reason: "unsupported" };
    if (held()) return { ok: true, reason: "held" };
    // A second request while the first is in flight would take out two locks
    // and leak one — visibilitychange can fire twice in a heartbeat.
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const s = await wakeLock.request("screen");
        // Cook mode may have closed while the request was in the air. Nothing
        // holds a reference to this sentinel yet, so if we stored it, release()
        // has already run and the lock would be stranded held forever.
        if (!wanted) {
          await s?.release?.().catch?.(() => {});
          return { ok: false, reason: "abandoned" };
        }
        // The OS can drop it at any time (low battery, and on some platforms
        // simply backgrounding). Clearing our reference is what lets the next
        // visibilitychange re-acquire instead of believing it still holds one.
        s?.addEventListener?.("release", () => forget(s));
        sentinel = s;
        return { ok: true, reason: "acquired" };
      } catch {
        // NotAllowedError (permissions policy, or a page the UA won't grant).
        // Degrade silently: cook mode works, the screen just sleeps as usual.
        return { ok: false, reason: "denied" };
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  async function release() {
    wanted = false;
    const reason = await drop();
    return { ok: reason !== "failed", reason };
  }

  /**
   * Call on every `visibilitychange`. Re-acquires only when cook mode still
   * wants the lock and the page is actually on screen — requesting while hidden
   * is rejected by the spec, so it would just log noise.
   */
  async function onVisibilityChange() {
    if (!wanted) return { ok: false, reason: "not-wanted" };
    if (!isVisible()) {
      // The platform releases the lock when the page hides — but release it
      // ourselves too rather than merely forgetting the sentinel. Measured in
      // headless Chrome: a page that *reports* hidden without the platform
      // having actually released leaves a lock nothing holds a reference to,
      // and it is then never given back. `wanted` stays set, so returning to
      // the recipe re-acquires.
      await drop();
      return { ok: false, reason: "hidden" };
    }
    if (held()) return { ok: true, reason: "held" };
    return acquire();
  }

  return { supported, held, wanted: () => wanted, acquire, release, onVisibilityChange };
}
