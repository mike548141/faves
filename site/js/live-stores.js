// Re-point EVERY live personal store at what storage now holds — the half of
// "Delete everything" (roadmap 180/010, ADR 0167) that storage alone cannot do.
//
// WHY ITS OWN FILE. A deletion empties localStorage, but each store holds its
// state in memory and writes it back on its next change: a store left unreloaded
// would put its old contents straight back at the first tap, which is the one
// outcome a deletion must not have. sync-start.js re-points the four SYNCED
// stores after a pull (profiles, favourites, ratings, notes, settings, recipes);
// a deletion also empties the ones that never sync — the order tally, the
// shopping list, saved orders, the activity log, cook ticks — so it needs all of
// them. Listed in ONE place so a store added later has one line to add, and
// tests/erase.test.js reads this file to make sure every store that holds
// personal state is named here.
//
// ORDER IS LOAD-BEARING and inherited: the registry first (a deletion replaces
// it), then the per-profile stores with settings last (profiles.js
// `reloadProfileStores`), then the device-level ones.

import { favourites } from "./favourites.js";
import { ratings } from "./ratings.js";
import { notes } from "./notes.js";
import { settings } from "./settings.js";
import { profiles, reloadProfileStores } from "./profiles.js";
import { recipes } from "./recipes.js";
import { order } from "./cart.js";
import { shopping } from "./shopping.js";
import { savedOrders } from "./saved-orders.js";
import { activity } from "./activity.js";
import { checklist } from "./checklist.js";

export function reloadAllLiveStores() {
  profiles.reload();
  recipes.reload();
  reloadProfileStores({ favourites, ratings, notes, settings });
  order.reload();
  shopping.reload();
  savedOrders.reload();
  activity.reload();
  checklist.reload();
}
