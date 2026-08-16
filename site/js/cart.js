// The order tally (Theme 1) — a device-local running order, grouped by
// venue. This is a *notepad*, deliberately NOT ordering/payments (the
// STRATEGY non-goal): no transaction, no account, no backend, no external
// request. As people call out what they want, it tallies and groups so one
// person can read the list down the phone, tick it off at pickup, and
// sanity-check the total. Per-person labels on the tally could live here
// later; they'd never leave the device, and no such name enters the repo.
//
// The maths (grouping, totals, counts) is pure and unit-tested; the store
// is a thin localStorage wrapper over it, with a memory fallback so a
// locked-down browser (Safari private mode) degrades rather than throws.

import { safeStorage } from "./store.js";
import { migrateEntries } from "./renames.js";
import { selectionKey } from "./addons.js";
import { dishId } from "./dish-id.js";

const KEY = "faves.order.v1";

/**
 * What makes one order line distinct from another: venue, DISH ID, add-ons.
 *
 * A dish added twice with different add-ons is two lines, not a quantity of 2
 * (ADR 0048 §4) — "eggs on toast with bacon" and "eggs on toast" are different
 * things to make and different money. `selectionKey` sorts its parts, so the
 * same choices in a different order stay one line.
 *
 * The middle component is the dish's id, not its name, because a name is not
 * unique within a venue and this is the one place that costs money (ADR 0051).
 * Sprig & Fern prints "Cheeseburger" three times — Mains $28, Gold Card $21,
 * Kids $15 — and while the name was the key, adding the $28 one and the $21 one
 * made a single line of 2 × $28 and charged $56 for a $49 pair. Distinct ids
 * make them distinct lines; the totals maths never changed.
 *
 * ADR 0048 §4's property still holds, and now rests on `dishId()`: a line with
 * no add-ons and no explicit id keys exactly as it did before add-ons existed —
 * `dishId()` falls through to `slug(name)`, so everything already in a family's
 * browser reads back as itself. (Only the colliding rows moved, and only their
 * 2nd and 3rd printings — behaviour that was already wrong.)
 */
export const lineKey = (i) =>
  `${i.venueId}\n${dishId(i)}\n${selectionKey(i.options)}`;

// A line's `price` is the CONFIGURED unit price — the dish plus its selected
// add-ons. Keeping the total in the field every consumer already reads means
// the totals maths below, the share codec, and the order sheet all needed no
// arithmetic change. The base price stays derivable (price − selectionPrice).

/** Total number of items (sum of quantities). */
export const orderCount = (items) => items.reduce((n, i) => n + i.qty, 0);

/** Estimated order total in dollars. Unpriced items contribute 0 — the UI
 *  flags a group as containing unpriced items rather than guessing. */
export const orderTotal = (items) =>
  items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

/**
 * Order totals split by currency: `[{ currency, total }, …]`, in first-seen
 * order. An order that spans two countries has no single number — adding NZD to
 * GBP produces a figure that is not money — so the UI shows one total per
 * currency rather than a plausible-looking sum nobody can pay (ADR 0043).
 * A single-currency order (every order today) yields exactly one entry, which
 * renders identically to the old single total.
 */
export function orderTotals(items) {
  const byCurrency = new Map();
  for (const i of items) {
    const c = i.currency || "NZD";
    byCurrency.set(c, (byCurrency.get(c) || 0) + (i.price || 0) * i.qty);
  }
  return [...byCurrency].map(([currency, total]) => ({ currency, total }));
}

/**
 * Group items by venue, preserving first-seen order. Each group carries its
 * own count, subtotal, phone (for the call handoff) and a `hasUnpriced`
 * flag so the UI can caption an incomplete subtotal honestly.
 */
export function groupByVenue(items) {
  const groups = new Map();
  for (const i of items) {
    let g = groups.get(i.venueId);
    if (!g) {
      g = {
        venueId: i.venueId,
        venueName: i.venueName,
        currency: i.currency || "NZD",
        phone: i.phone || null,
        items: [],
        count: 0,
        subtotal: 0,
        hasUnpriced: false,
      };
      groups.set(i.venueId, g);
    }
    g.items.push(i);
    g.count += i.qty;
    g.subtotal += (i.price || 0) * i.qty;
    if (i.price == null) g.hasUnpriced = true;
  }
  return [...groups.values()];
}

/**
 * Merge `incoming` lines into `base`, summing quantities of matching
 * (venueId, dishId, add-ons) lines and appending the rest in first-seen order. Returns a
 * new array and never mutates its inputs — the receive side of group ordering
 * (Theme 1b): a decoded shared order folds into whatever the host already has.
 * `collected` is preserved on existing lines and starts false on new ones.
 */
export function mergeItems(base, incoming) {
  const out = base.map((i) => ({ ...i }));
  const idxOf = new Map(out.map((i, idx) => [lineKey(i), idx]));
  for (const inc of incoming) {
    const key = lineKey(inc);
    const at = idxOf.get(key);
    if (at != null) {
      out[at].qty += inc.qty;
    } else {
      const line = {
        venueId: inc.venueId,
        venueName: inc.venueName,
        currency: inc.currency,
        phone: inc.phone || null,
        name: inc.name,
        price: inc.price ?? null,
        options: inc.options || [],
        qty: inc.qty,
        collected: false,
      };
      // Carried only when the incoming line has one, so a line merged from an
      // older link keeps the exact shape it has always had — and an explicit id
      // survives, without which a shared order of two same-named dishes would
      // collapse back into one line the moment it was received.
      if (inc.dishId) line.dishId = inc.dishId;
      out.push(line);
      idxOf.set(key, out.length - 1);
    }
  }
  return out;
}

/**
 * Create an order store over a storage backend (injectable for tests).
 * Subscribers are notified on every mutation and on cross-tab changes.
 */
export function createOrder(storage) {
  const subs = new Set();

  function read() {
    try {
      const a = migrateEntries(JSON.parse(storage.getItem(KEY) || "[]"));
      return Array.isArray(a) ? a : [];
    } catch {
      return []; // corrupt payload → start clean rather than crash
    }
  }

  let items = read();

  function commit() {
    try {
      storage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* over quota / blocked — the in-memory state still drives the UI */
    }
    for (const fn of subs) fn(items);
  }

  // The lookup half of the API addresses a line by (venueId, dishId, sel) — the
  // three parts of `lineKey`. It took a NAME until ADR 0051; callers holding a
  // dish record pass `dishId(item)`, and a caller with only a name can still
  // pass `slug(name)`, which is what the name meant all along.
  //
  // `sel` is a selectionKey (addons.js) — "" for a dish ordered as it comes,
  // which is what every line stored before add-ons existed reads back as.
  const find = (venueId, id, sel = "") =>
    items.find((i) => lineKey(i) === `${venueId}\n${id}\n${sel}`);

  return {
    items: () => items,
    count: () => orderCount(items),
    total: () => orderTotal(items),
    groups: () => groupByVenue(items),
    qtyOf: (venueId, id, sel = "") => find(venueId, id, sel)?.qty || 0,

    /** Add one of a dish (or increment if already listed). `meta` is
     *  { venueId, venueName, phone?, name, dishId?, price?, options? }. `price`
     *  is the CONFIGURED unit price and `options` the chosen add-ons (ADR 0048);
     *  `dishId` is what separates two identically-named rows (ADR 0051). */
    add(meta) {
      const options = meta.options || [];
      const ex = find(meta.venueId, dishId(meta), selectionKey(options));
      if (ex) ex.qty += 1;
      else {
        const line = {
          venueId: meta.venueId,
          venueName: meta.venueName,
          currency: meta.currency || "NZD",
          phone: meta.phone || null,
          name: meta.name,
          price: meta.price ?? null,
          options,
          qty: 1,
          collected: false,
        };
        // Recorded on the line so it survives storage, export and sharing; a
        // meta without one keeps the shape a line has always had.
        if (meta.dishId) line.dishId = meta.dishId;
        items.push(line);
      }
      commit();
    },

    /** Set an exact quantity; 0 (or less) removes the line. */
    setQty(venueId, id, qty, sel = "") {
      const ex = find(venueId, id, sel);
      if (!ex) return;
      if (qty <= 0) items = items.filter((i) => i !== ex);
      else ex.qty = qty;
      commit();
    },

    remove(venueId, id, sel = "") {
      const target = `${venueId}\n${id}\n${sel}`;
      items = items.filter((i) => lineKey(i) !== target);
      commit();
    },

    /** Collect mode: tick an item off as it's handed over. */
    toggleCollected(venueId, id, sel = "") {
      const ex = find(venueId, id, sel);
      if (ex) {
        ex.collected = !ex.collected;
        commit();
      }
    },

    /** Fold a decoded shared order (group ordering, Theme 1b) into this one,
     *  summing matching lines. `incoming` is share-codec's decoded item list. */
    merge(incoming) {
      items = mergeItems(items, incoming);
      commit();
    },

    clear() {
      items = [];
      commit();
    },

    /** Re-read from storage (e.g. after a cross-tab `storage` event). */
    reload() {
      items = read();
      for (const fn of subs) fn(items);
    },

    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

// The shared singleton every screen uses.
export const order = createOrder(safeStorage());
