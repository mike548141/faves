// Runs the user-data upgrade chain once per page load, BEFORE any store is read
// (roadmap 510/040, ADR 0145/0146).
//
// This must be the FIRST import of every page's entry module (app.js, menu.js,
// recipe.js, sw-register.js). ES modules evaluate their imports depth-first in
// the order they are written, and every store module (favourites, settings,
// profiles…) reads storage when it is evaluated — so the upgrade gets there
// first only if it is imported first, and only if nothing it imports reads a
// store. It imports user-schema.js and store.js, which import nothing else.
// tests/user-schema.test.js checks both halves of that, for every page.

import { safeStorage, watchStaleTab } from "./store.js";
import { upgradeStorage, upgradeRan } from "./user-schema.js";

const storage = safeStorage();

/** What the startup upgrade did on this load (`{ status, from, to }`). */
export const upgrade = upgradeStorage(storage);

// From here on, a tab whose build falls behind storage — because another tab
// upgraded it, or because this one loaded an older build after it was
// upgraded (`upgrade.status === "newer"`) — is marked stale, and every write
// through safeStorage() is refused (roadmap 510/110). stale-tab-ui.js asks the
// person to reload.
watchStaleTab({ storage });

/** Call once the page's first render has finished: the upgraded data has now
 *  been read and drawn by this version, so the pre-upgrade snapshot can go on
 *  the next load. Cheap when there is no snapshot, which is almost always. */
export function markUpgradeRan() {
  return upgradeRan(storage);
}
