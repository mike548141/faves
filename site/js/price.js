// Typical price per person, derived from a venue's *own* menu prices — no
// external source. A deliberately simple proxy: the median price of the
// venue's priced items (roughly "one dish per person"). Honest and offline;
// our prices are already flagged as needing an in-store refresh, so this is
// a ballpark for "how pricey is this place", not a quote. Pure + unit-tested;
// the UI (cards, menu header) formats and captions it.
//
// The median misleads for menus that mix mains with lots of cheap sides/
// drinks (a gastropub reads "$") or few, pricey items (a noodle house reads
// "$$$"), and the cheap-eats filter amplifies that. So a record may carry a
// *curated* override that wins over the derived figure:
//   priceBand:      "$" | "$$" | "$$$"   authoritative band
//   pricePerPerson: <positive NZD>       authoritative typical spend
// Either can be set alone. `curated` in the result tells the UI to caption it
// as our call rather than "estimated from the menu".

// Fewer than this many priced items → not a meaningful signal on its own.
const MIN_ITEMS = 3;

// NZD bands for a casual-eatery context (takeaways → gastropubs).
// Upper bound is inclusive: perPerson <= max.
const BANDS = [
  { max: 15, band: "$" },
  { max: 30, band: "$$" },
  { max: Infinity, band: "$$$" },
];

const BAND_LETTERS = new Set(BANDS.map((b) => b.band));
const bandOf = (perPerson) => BANDS.find((b) => perPerson <= b.max).band;

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
 * A price signal for a venue, or `null` when there's nothing to say (a
 * recipe collection, or a menu with < MIN_ITEMS priced items and no curated
 * override). A curated band shows even for a thin/stub menu — that's the point.
 * → { band: "$"|"$$"|"$$$", perPerson: <rounded NZD>|null, count, curated }
 *   perPerson is null when we have no figure that agrees with the band, so
 *   the UI shows the band alone rather than a contradictory "~$Npp".
 */
export function priceBand(record) {
  if (record?.kind === "recipes") return null; // cooking, not spending

  const curatedBand = BAND_LETTERS.has(record?.priceBand) ? record.priceBand : null;
  const curatedPP =
    typeof record?.pricePerPerson === "number" &&
    Number.isFinite(record.pricePerPerson) &&
    record.pricePerPerson > 0
      ? record.pricePerPerson
      : null;

  const prices = pricedItems(record);
  const derived = prices.length >= MIN_ITEMS ? median(prices) : null;
  if (!curatedBand && !curatedPP && derived === null) return null;

  // Band: curated wins; else from a curated figure; else from the median.
  const band = curatedBand || bandOf(curatedPP ?? derived);

  // Per-person: curated wins; else the median, but only when it agrees with
  // the band (so an overridden band never carries a contradictory figure).
  let perPerson = curatedPP;
  if (perPerson === null && derived !== null && bandOf(derived) === band) {
    perPerson = derived;
  }

  return {
    band,
    perPerson: perPerson === null ? null : Math.round(perPerson),
    count: prices.length,
    curated: Boolean(curatedBand || curatedPP),
  };
}

/** Compact label for a chip, e.g. "$$ · ~$28pp" (or "$$" with no figure). */
export function priceLabel(record) {
  const p = priceBand(record);
  if (!p) return null;
  return p.perPerson === null ? p.band : `${p.band} · ~$${p.perPerson}pp`;
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
