// Asking the browser to keep this person's data (roadmap 510/010 step 4, ADR
// 0146 §4).
//
// Everything a person puts into Faves lives in this browser's storage, and a
// browser may clear site storage when the device runs short of space. Asking
// `navigator.storage.persist()` makes that clearing opt-in on the browsers that
// honour it. It is asked ONCE per page load, and only after the first personal
// write — a heart, a rating, a note, a setting, an order line — because a
// visitor who has put nothing in has nothing to keep, and Firefox shows a
// prompt for it.
//
// WHAT IT DOES NOT DO, said plainly in About: a Safari browser tab can still be
// cleared after a while unused whatever this answers; only Faves on the Home
// Screen is exempt. That is platform behaviour, inferred from WebKit's
// published storage policy and not measured here (ADR 0146 §4).
//
// Pure where it can be: `createPersistence` takes the storage manager and the
// window, so it unit-tests without a browser. `startPersistence` is the one
// line each screen calls, and the only part that touches the live stores.

import { favourites } from "./favourites.js";
import { ratings } from "./ratings.js";
import { notes } from "./notes.js";
import { settings } from "./settings.js";
import { order } from "./cart.js";

export const GRANTED = "granted";
export const NOT_GRANTED = "not-granted";
export const UNKNOWN = "unknown";

export function createPersistence({
  manager = globalThis.navigator?.storage,
  win = globalThis.window,
} = {}) {
  let asked = false;

  /** Ask once. Skipped when the browser already keeps the data, so a person
   *  who granted it is never asked again. Never throws. */
  async function requestOnce() {
    if (asked) return;
    asked = true;
    try {
      if (typeof manager?.persist !== "function") return;
      if (typeof manager.persisted === "function" && (await manager.persisted())) return;
      await manager.persist();
    } catch {
      /* a browser that refuses to answer has told us nothing — About says so */
    }
  }

  /** What the browser says now: GRANTED, NOT_GRANTED or UNKNOWN. */
  async function state() {
    try {
      if (typeof manager?.persisted !== "function") return UNKNOWN;
      return (await manager.persisted()) ? GRANTED : NOT_GRANTED;
    } catch {
      return UNKNOWN;
    }
  }

  /** Is Faves running from the Home Screen (an installed web app)? */
  function onHomeScreen() {
    try {
      if (win?.navigator?.standalone === true) return true; // iOS Safari
      return !!win?.matchMedia?.("(display-mode: standalone)")?.matches;
    } catch {
      return false;
    }
  }

  /** Ask after the first change to any of `stores`, then stop listening. */
  function watch(stores) {
    const offs = [];
    const stop = () => {
      for (const off of offs.splice(0)) {
        try {
          off?.();
        } catch {
          /* already gone */
        }
      }
    };
    for (const store of stores) {
      if (typeof store?.subscribe !== "function") continue;
      offs.push(
        store.subscribe(() => {
          stop();
          requestOnce();
        })
      );
    }
    return stop;
  }

  return { requestOnce, state, onHomeScreen, watch, _asked: () => asked };
}

/**
 * About's sentences for a given answer. Plain, short, New Zealand English; the
 * Safari caveat only where it applies, which is anywhere but the Home Screen.
 */
export function storageSentences(state, homeScreen) {
  const out = [
    state === GRANTED
      ? "This browser has agreed to keep your Faves data until you clear it."
      : state === NOT_GRANTED
        ? "This browser hasn’t agreed to keep your Faves data, so it may clear it if the device runs short of space."
        : "This browser doesn’t say whether it will keep your Faves data.",
  ];
  if (!homeScreen) {
    out.push(
      "In Safari, a browser tab’s data can still be cleared if you don’t use Faves for a while. " +
        "Adding Faves to your Home Screen keeps it."
    );
  }
  return out;
}

export const persistence = createPersistence();

/** The one line each screen calls. Idempotent in effect: asking is once per
 *  page load however many screens call it. */
export function startPersistence() {
  try {
    return persistence.watch([favourites, ratings, notes, settings, order]);
  } catch {
    return () => {};
  }
}
