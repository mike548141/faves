// Typical price per person, derived from a venue's *own* menu prices — no
// external source. A deliberately simple proxy: the median price of the
// venue's priced items (roughly "one dish per person"). Honest and offline;
// our prices are already flagged as needing an in-store refresh, so this is
// a ballpark for "how pricey is this place", not a quote. Pure + unit-tested;
// the UI (cards, menu header) formats and captions it.

// Fewer than this many priced items → not a meaningful signal, show nothing.
const MIN_ITEMS = 3;

// NZD bands for a casual-eatery context (takeaways → gastropubs).
// Upper bound is inclusive: perPerson <= max.
const BANDS = [
  { max: 15, band: "$" },
  { max: 30, band: "$$" },
  { max: Infinity, band: "$$$" },
];

/** Every positive numeric price across a record's menu sections. */
export function pricedItems(record) {
  const out = [];
  for (const section of record?.menu || []) {
    for (const item of section?.items || []) {
      const p = item?.price;
      if (typeof p === "number" && Number.isFinite(p) && p > 0) out.push(p);
    }
  }
  return out;
}

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * A price signal for a venue, or `null` when there's too little data (a
 * stub, a recipe collection, or a menu with < MIN_ITEMS priced items).
 * → { band: "$" | "$$" | "$$$", perPerson: <rounded NZD>, count }
 */
export function priceBand(record) {
  if (record?.kind === "recipes") return null; // cooking, not spending
  const prices = pricedItems(record);
  if (prices.length < MIN_ITEMS) return null;
  const perPerson = median(prices);
  const { band } = BANDS.find((b) => perPerson <= b.max);
  return { band, perPerson: Math.round(perPerson), count: prices.length };
}

/** Compact label for a chip, e.g. "$$ · ~$28pp". */
export function priceLabel(record) {
  const p = priceBand(record);
  return p ? `${p.band} · ~$${p.perPerson}pp` : null;
}

/**
 * Is this a "cheap eats" venue? True only for the "$" band — self-consistent
 * with the chip the user already sees on the card. A venue with too little
 * price data (null band) is *not* cheap: we can't vouch that it is, and
 * "no tag = not stated" is the house rule. Drives the picker's cheap-eats mode.
 */
export function isCheapEats(record) {
  return priceBand(record)?.band === "$";
}
