// The one line each screen calls to make sync actually run (ROADMAP Theme 9 v2).
//
// WHY THIS IS ITS OWN FILE, AND NOT TWO LINES IN `sync.js`. `sync.js` is pure
// and injectable — it takes its storage, its `fetch` and its clock as arguments
// so the whole engine unit-tests without a browser. The moment it imports the
// live `favourites`/`ratings`/`settings` singletons it stops being that, because
// importing them constructs them against real `localStorage` at module load.
// So the *engine* stays injectable and this thin file does the one thing that
// cannot be: bolt it to the app's real, already-constructed stores.
//
// It also exists as a named, importable thing because the failure it fixes was
// exactly an absence. Every part of the sync family — the code, the crypto, the
// merge, the deployed Worker — was built, tested and green while **nothing
// imported any of it**, so sync did not work and every check still passed. A
// file called `sync-start.js`, imported by all three screens, is much harder to
// forget than a call buried in an init function.

import { favourites } from "./favourites.js";
import { ratings } from "./ratings.js";
import { settings } from "./settings.js";
import { reloadProfileStores } from "./profiles.js";
import { sync } from "./sync.js";

/**
 * Start continual sync on this screen. Safe to call on every page and more than
 * once — `sync.start()` is idempotent.
 *
 * Deliberately does nothing at all when the user has not turned sync on, which
 * is the default: no fetch, no listeners of consequence, no cost. Sync is an
 * addition to a local-first app and must be invisible until it is asked for.
 */
export function startSync() {
  try {
    return sync.start({
      stores: [favourites, ratings, settings],
      // The half that only exists in a browser: a pull rewrites localStorage,
      // and these three singletons hold their state in memory. Without this the
      // synced data is correct on disk and every open screen keeps rendering
      // what it read at load — a heart arrives and nothing moves until reload.
      // Order is load-bearing inside reloadProfileStores (settings last, so the
      // allergen repaint runs after the data it reads is in place).
      onApplied: () => reloadProfileStores({ favourites, ratings, settings }),
    });
  } catch {
    // A fault in an optional backend feature must never take a screen down
    // with it — the menu, the hearts and the order tally all work offline and
    // must keep working if sync cannot start for any reason at all.
    return () => {};
  }
}
