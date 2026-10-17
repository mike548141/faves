// The activity log, wired to the REAL singletons (Theme 32a). activity.test.js
// proves each store records what it is told through an injected recorder; this
// proves the singletons are actually handed one — the half a recorder-injection
// test cannot see, and the half a page runs. Its own file so the fake
// localStorage is installed before any store module binds its storage.

import { test } from "node:test";
import assert from "node:assert/strict";

function fakeLocalStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
  };
}

test("the singletons record into the active person's log, and a settings entry carries no value", async () => {
  const ls = fakeLocalStorage();
  globalThis.localStorage = ls;
  try {
    const { favourites } = await import("../site/js/favourites.js");
    const { ratings } = await import("../site/js/ratings.js");
    const { order } = await import("../site/js/cart.js");
    const { shopping } = await import("../site/js/shopping.js");
    const { settings } = await import("../site/js/settings.js");
    const { activity, ACTIVITY_KEY } = await import("../site/js/activity.js");
    const { profiles, scopeKey } = await import("../site/js/profiles.js");

    const dish = { type: "dish", venueId: "kk", venueName: "KK Malaysian", name: "Fried Won Tons", dishId: "fried-won-tons" };
    favourites.toggle(dish);
    ratings.set(dish, 4);
    order.add({ venueId: "kk", venueName: "KK Malaysian", name: "Fried Won Tons", dishId: "fried-won-tons", price: 9 });
    shopping.add({ venueId: "cook-at-home", venueName: "Cook at Home", name: "flour" });
    settings.set({ diet: { dietary: ["v"], avoid: ["contains-peanuts"] } });
    order.clear();
    favourites.toggle(dish);

    const kinds = () => activity.entries().map((e) => e.kind);
    assert.deepEqual(kinds(), [
      "favourite.add",
      "rating.set",
      "order.add",
      "settings.change",
      "order.clear",
      "favourite.remove",
    ]);
    const stored = ls.getItem(scopeKey("default", ACTIVITY_KEY));
    assert.ok(stored, "written under the active profile's own key");
    assert.equal(/peanut|contains-|"v"/.test(stored.replace(/"venue"/g, "")), false, "no allergen or diet value in storage");
    assert.deepEqual(JSON.parse(stored).find((e) => e.kind === "settings.change").subject, { label: "diet" });
    assert.equal(ls.getItem(ACTIVITY_KEY), null, "never under the bare key");

    // A second person has a log of their own; the first person's is untouched.
    const sam = profiles.create("Sam");
    assert.equal(activity.entries().length, 1, "Sam starts with only the act of being chosen");
    assert.deepEqual(activity.entries()[0].subject, { label: "Sam" });
    favourites.reload();
    favourites.toggle(dish);
    assert.equal(activity.entries().length, 2);
    assert.equal(JSON.parse(ls.getItem(scopeKey("default", ACTIVITY_KEY))).length, 6);

    // Switching back is recorded against the person switched TO.
    profiles.setActive("default");
    assert.equal(kinds().at(-1), "profile.switch");
    assert.equal(activity.entries().length, 7);

    // Removing a person takes their log with them.
    assert.ok(ls.getItem(scopeKey(sam, ACTIVITY_KEY)));
    profiles.remove(sam);
    assert.equal(ls.getItem(scopeKey(sam, ACTIVITY_KEY)), null);
  } finally {
    delete globalThis.localStorage;
  }
});
