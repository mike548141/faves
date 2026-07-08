// The order tally (Theme 1) — a device-local running order, grouped by
// venue. This is a *notepad*, deliberately NOT ordering/payments (the
// STRATEGY non-goal): no transaction, no account, no backend, no external
// request. As people call out what they want, it tallies and groups so one
// person can read the list down the phone, tick it off at pickup, and
// sanity-check the total. Runtime naming ("Booth", "Ruth") could live here
// later; it never leaves the device and nothing personal enters the repo.
//
// The maths (grouping, totals, counts) is pure and unit-tested; the store
// is a thin localStorage wrapper over it, with a memory fallback so a
// locked-down browser (Safari private mode) degrades rather than throws.

import { safeStorage } from "./store.js";

const KEY = "faves.order.v1";

/** Total number of items (sum of quantities). */
export const orderCount = (items) => items.reduce((n, i) => n + i.qty, 0);

/** Estimated order total in dollars. Unpriced items contribute 0 — the UI
 *  flags a group as containing unpriced items rather than guessing. */
export const orderTotal = (items) =>
  items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

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
 * Create an order store over a storage backend (injectable for tests).
 * Subscribers are notified on every mutation and on cross-tab changes.
 */
export function createOrder(storage) {
  const subs = new Set();

  function read() {
    try {
      const a = JSON.parse(storage.getItem(KEY) || "[]");
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

  const find = (venueId, name) =>
    items.find((i) => i.venueId === venueId && i.name === name);

  return {
    items: () => items,
    count: () => orderCount(items),
    total: () => orderTotal(items),
    groups: () => groupByVenue(items),
    qtyOf: (venueId, name) => find(venueId, name)?.qty || 0,

    /** Add one of a dish (or increment if already listed). `meta` is
     *  { venueId, venueName, phone?, name, price? }. */
    add(meta) {
      const ex = find(meta.venueId, meta.name);
      if (ex) ex.qty += 1;
      else
        items.push({
          venueId: meta.venueId,
          venueName: meta.venueName,
          phone: meta.phone || null,
          name: meta.name,
          price: meta.price ?? null,
          qty: 1,
          collected: false,
        });
      commit();
    },

    /** Set an exact quantity; 0 (or less) removes the line. */
    setQty(venueId, name, qty) {
      const ex = find(venueId, name);
      if (!ex) return;
      if (qty <= 0) items = items.filter((i) => i !== ex);
      else ex.qty = qty;
      commit();
    },

    remove(venueId, name) {
      items = items.filter((i) => !(i.venueId === venueId && i.name === name));
      commit();
    },

    /** Collect mode: tick an item off as it's handed over. */
    toggleCollected(venueId, name) {
      const ex = find(venueId, name);
      if (ex) {
        ex.collected = !ex.collected;
        commit();
      }
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
