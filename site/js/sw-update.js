// The decision rules behind the PWA update flow (ROADMAP Theme 16, ADR 0027),
// split out from sw-register.js so they can be executed by `node --test`.
// Everything here is pure or clock-injected: no service-worker API, no DOM.
//
// The problem these rules solve: a standalone PWA resumed from memory performs
// no navigation, so the browser never re-fetches sw.js and the app can sit on a
// stale copy until it is killed and relaunched. We check on resume instead —
// but a phone flicking between apps fires those events constantly, so the check
// is throttled.

/** How often a resume may trigger an update check. */
export const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Is this event the app coming back to the foreground? `focus` always counts;
 * `visibilitychange` only when the document became *visible* (it fires just as
 * often on the way out, and checking for an update as the user leaves is work
 * nobody is waiting on).
 */
export function isResume(type, visibilityState) {
  if (type === "focus") return true;
  return type === "visibilitychange" && visibilityState === "visible";
}

/**
 * A worker reaching `installed` means an update is ready only when something
 * was already controlling the page. Without a controller this is the *first*
 * install on this device — there is no older version to replace and nothing to
 * tell anyone about.
 */
export function isUpdateReady(state, hasController) {
  return state === "installed" && !!hasController;
}

/**
 * Throttle gate for resume-triggered update checks. `claim()` answers "should I
 * call registration.update() right now?" and records the time when it says yes.
 *
 * @param {object} [opts]
 * @param {number} [opts.intervalMs] minimum gap between checks
 * @param {() => number} [opts.now] clock, injected for tests
 * @param {number|null} [opts.since] treat a check as already made at this time
 *   (the page load itself fetched sw.js, so the first resume seconds later has
 *   nothing to learn)
 */
export function createUpdateGate({
  intervalMs = CHECK_INTERVAL_MS,
  now = () => Date.now(),
  since = null,
} = {}) {
  let last = since;
  return {
    claim(type, visibilityState, at = now()) {
      if (!isResume(type, visibilityState)) return false;
      if (last !== null) {
        // A device clock that jumped *backwards* (travel, NTP correction) would
        // otherwise wedge the gate shut for however far it moved. Treat any
        // backwards step as a fresh start rather than a very long throttle.
        if (at >= last && at - last < intervalMs) return false;
      }
      last = at;
      return true;
    },
    lastCheckedAt: () => last,
  };
}

/**
 * Guards the reload that follows a `controllerchange`.
 *
 * Two hazards it closes. (1) A controller change this page did not ask for —
 * another tab tapping Refresh, say — must not yank this page out from under
 * whoever is reading it; only a reload we requested goes ahead. (2) The classic
 * service-worker reload loop: if a reload somehow lands back in the same state,
 * `shouldReload()` has already spent itself and answers false.
 */
export function createReloadGuard() {
  let requested = false;
  let spent = false;
  return {
    request() {
      requested = true;
    },
    shouldReload() {
      if (!requested || spent) return false;
      spent = true;
      return true;
    },
  };
}
