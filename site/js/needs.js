// What we know we DON'T know about a dish — resolved for display.
//
// The repo's honesty rule is that unknown is distinct from known ("no tag =
// not stated"), and `price: null` had been carrying two incompatible meanings
// at once: "the shop prices this per market / on application" and "we tried to
// read it and couldn't". A reader cannot tell those apart, and neither could
// the next transcriber. `needs` says the second one out loud.
//
// It is also the worklist. These gaps used to live as hand-typed prose in
// ROADMAP.md, which goes stale the moment data lands — the same trap the stub
// count fell into three times. Stored on the dish, the roadmap can point at
// `tools/needs.py` instead of naming dishes it will not keep up with.
//
// Pure: no DOM, no dates-from-the-clock, no I/O. menu.js renders what this
// returns; tests/needs.test.js pins the behaviour.

// The closed set. Extend HERE with a label and a fix, never ad hoc at a call
// site — an unknown kind is dropped rather than rendered raw, so a typo shows
// up as a missing indicator instead of leaking a slug onto the page.
//
// `fix` is the load-bearing half: the whole point of surfacing this is to say
// what would clear it, not merely that something is wrong.
const KINDS = {
  price: {
    label: "Price not recorded",
    fix: "A photo of the price label, or a look at the menu in store, clears this.",
  },
  ingredients: {
    label: "Ingredients unconfirmed",
    fix: "A photo of the label or a word with the counter clears this.",
  },
  allergens: {
    label: "Allergen details unconfirmed",
    fix: "Ask the venue before ordering. A photo of the label clears this.",
  },
  name: {
    label: "This entry needs checking",
    fix: "A look at the menu in store clears this.",
  },
  availability: {
    label: "May no longer be on the menu",
    fix: "A look at the menu in store clears this.",
  },
};

/** The kinds a record may use — validate.py holds the same list. */
export const NEED_KINDS = Object.freeze(Object.keys(KINDS));

/**
 * Resolve a dish's `needs` into display rows.
 *
 * Tolerant by design: a malformed or unknown entry is skipped, never thrown
 * and never rendered raw. Menu data is hand-written, and one bad entry must
 * not take a menu screen down (the fail-soft rule the no-JS <ul> exists for).
 *
 * @returns {Array<{what, label, fix, note, since}>} in the order given.
 */
export function dishNeeds(item) {
  const raw = item?.needs;
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const n of raw) {
    const what = n?.what;
    const kind = KINDS[what];
    // Unknown kind, or the same kind twice — one indicator per kind is enough.
    if (!kind || seen.has(what)) continue;
    seen.add(what);
    out.push({
      what,
      label: kind.label,
      fix: kind.fix,
      note: typeof n.note === "string" && n.note.trim() ? n.note.trim() : null,
      since: typeof n.since === "string" && n.since ? n.since : null,
    });
  }
  return out;
}

/**
 * Does this dish's price slot mean "we don't know" rather than "it varies"?
 *
 * Only ever true when the price is genuinely absent: a dish that carries a
 * stale `needs: price` alongside a real price is a data error, and showing the
 * price we have beats showing a question mark. Callers use this to pick the
 * placeholder, so it must never suppress a number.
 */
export function priceUnknown(item) {
  if (item?.price != null) return false;
  return dishNeeds(item).some((n) => n.what === "price");
}
