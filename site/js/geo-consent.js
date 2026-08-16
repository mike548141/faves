// Whether Faves may ASK for your location — which is a different question from
// whether the browser will give it (ADR 0082, superseding ADR 0069 in part).
//
// Two permissions, and conflating them is the bug this module exists to avoid:
//
//   • The BROWSER's permission — granted / prompt / denied. Owned by the
//     browser, read via navigator.permissions, and we cannot change it.
//   • OUR consent to ASK — a device-local flag the reader sets by ticking
//     "don't ask again". The browser knows nothing about it.
//
// A reader can perfectly well be "browser says prompt" (we *could* ask) and
// "suppressed" (we promised not to). That combination is the entire point of
// the tickbox, and any code that treats "prompt" as "go ahead and ask" without
// consulting this module breaks a promise made in writing on screen.
//
// WHY THE FLAG IS SEPARATE FROM `settings.js`. The settings store is swept into
// the backup export and restored on another device (personal-data.js). A
// promise not to nag is about THIS device's reader in THIS browser, and the
// permission it shadows is per-origin-per-device too — restoring "don't ask"
// onto a fresh phone would silence an ask that phone never declined, and
// restoring the absence of it would resurrect a nag someone had turned off.
// So it rides its own key, deliberately outside the exported set.

/** localStorage key. Versioned, so a future shape change cannot misread this one. */
export const CONSENT_KEY = "faves.geo.consent.v1";

/**
 * Read the consent record. Never throws: storage can be absent (SSR-ish test
 * contexts), disabled (Safari private mode has historically thrown on write),
 * or hold something a previous version wrote. Any unreadable state resolves to
 * "not suppressed", which is the recoverable direction — the reader sees one
 * more ask rather than being permanently locked out of a feature.
 */
export function readConsent(storage = safeStorage()) {
  if (!storage) return { suppressed: false, declined: false };
  try {
    const raw = storage.getItem(CONSENT_KEY);
    if (!raw) return { suppressed: false, declined: false };
    const val = JSON.parse(raw);
    if (!val || typeof val !== "object") return { suppressed: false, declined: false };
    return {
      suppressed: val.suppressed === true,
      declined: val.declined === true,
    };
  } catch {
    return { suppressed: false, declined: false };
  }
}

/** Merge and persist. A failed write is not an error worth surfacing: the worst
 *  case is that we ask again next visit, which is the same failure mode as a
 *  reader who clears their storage. Silently degrading beats a console error on
 *  a screen whose whole subject is trust. */
export function writeConsent(patch, storage = safeStorage()) {
  const next = { ...readConsent(storage), ...patch };
  if (!storage) return next;
  try {
    storage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode, quota, disabled — see above */
  }
  return next;
}

/** The reader ticked "don't ask again". Binds BOTH surfaces, forever, on this
 *  device — the dialog and the follow-up banner. Owner's ruling, 2026-08-17:
 *  the tickbox says "don't keep prompting me" and a promise with an expiry date
 *  it does not mention is a dark pattern. */
export function suppressAsk(storage = safeStorage()) {
  return writeConsent({ suppressed: true, declined: true }, storage);
}

/** The reader said "not now" without ticking. We may show the banner, but the
 *  dialog has had its turn — re-opening a modal someone just dismissed is the
 *  nag the tickbox was supposed to be the *escape* from, not the default. */
export function declineAsk(storage = safeStorage()) {
  return writeConsent({ declined: true }, storage);
}

/** Turning it back on from Settings clears BOTH flags. Someone who goes looking
 *  for the control has plainly changed their mind, and leaving `suppressed` set
 *  would mean a later revoke-and-return found us silent for no stated reason. */
export function resetAsk(storage = safeStorage()) {
  return writeConsent({ suppressed: false, declined: false }, storage);
}

/**
 * What, if anything, to show. Pure so it can be tested without a browser — the
 * whole decision table is here rather than smeared across app.js.
 *
 * @param {string} permission  "granted" | "prompt" | "denied" | undefined
 * @param {{suppressed:boolean, declined:boolean}} consent
 * @param {boolean} haveOrigin  a location already captured this session
 * @returns {"none"|"dialog"|"banner"|"blocked"}
 */
export function askSurface(permission, consent, haveOrigin) {
  // Already ours to use: nothing to ask for, nothing to explain.
  if (permission === "granted" || haveOrigin) return "none";
  // The browser has blocked us. A dialog whose Allow button provably cannot
  // work is worse than silence — it spends trust to deliver a dead end. Say
  // what is true, once, where the control used to be.
  if (permission === "denied") return "blocked";
  // They asked us not to. This is the branch the tickbox buys, and it must
  // outrank everything below it.
  if (consent.suppressed) return "none";
  // Dismissed once without ticking: the banner is the quieter second surface.
  if (consent.declined) return "banner";
  return "dialog";
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Accessing localStorage itself throws when cookies are blocked entirely.
    return null;
  }
}
