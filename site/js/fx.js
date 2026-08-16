// Converting a menu price into the currency you asked to see it in (ADR 0045).
//
// The rates are DATA, not an API call: `site/data/fx.json`, fetched by
// `tools/fetch_fx.py`, committed, refreshed daily by a scheduled job, and
// served out of the same offline cache as the menus. A live FX call would be a
// third-party runtime dependency (ADR 0001 forbids it outright) and would go
// blank in flight mode, which is exactly when someone is looking at a menu
// abroad and wondering what it costs.
//
// The cost of that choice is staleness, and the honest handling of it is not to
// hide it: the table carries its own `asOf`, and the ⓘ beside a converted menu
// says the date. What it must never do is imply a quote. A reference rate is
// not what a card charges — the issuer's margin sits on top — so the app says
// "about", shows the shop's own currency alongside, and never converts a price
// the shop will actually take your money for into the only figure on screen.

const FX_URL = "data/fx.json";

// One table for the session. A menu screen and the home screen each ask for it
// during boot; without this they'd each fetch.
let table = null;
let inflight = null;

/**
 * Load the rate table. Safe to call repeatedly; safe to fail.
 *
 * A failure here must NOT break the page: prices still render, in the venue's
 * own currency, exactly as they did before conversion existed. That is why
 * every consumer below treats "no table" as "no conversion" rather than as an
 * error state — the shop's own price is always a correct answer.
 */
export async function loadFx(fetchJson) {
  if (table) return table;
  if (!inflight) {
    inflight = fetchJson(FX_URL)
      .then((doc) => {
        table = normalise(doc);
        return table;
      })
      .catch(() => {
        // Deliberately quiet in the UI, loud in the console: a reader gets a
        // working menu, and whoever is debugging gets told why nothing converts.
        console.warn("Faves: no exchange rates; showing each place's own currency.");
        table = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

function normalise(doc) {
  const rates = doc?.rates;
  if (!doc?.base || !rates || typeof rates !== "object") return null;
  const clean = {};
  for (const [code, value] of Object.entries(rates)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) clean[code] = value;
  }
  // The base must be present and exactly 1, or every conversion through it is
  // silently scaled. Refusing the whole table is right: a wrong price is worse
  // than an unconverted one.
  if (clean[doc.base] !== 1) return null;
  return { base: doc.base, asOf: doc.asOf || null, source: doc.source || null, rates: clean };
}

/** For tests and for boot ordering — never fetches. */
export function setFxTable(doc) {
  table = doc ? normalise(doc) : null;
  return table;
}

/** The date the rates were published, or null when we have none. */
export const fxAsOf = () => table?.asOf ?? null;

/** Currency codes we can convert to or from, as a Set (empty when unloaded). */
export function fxCurrencies() {
  return new Set(table ? Object.keys(table.rates) : []);
}

/** True when both currencies are convertible (or are the same currency). */
export function canConvert(from, to) {
  if (!from || !to) return false;
  if (from === to) return true;
  return !!(table && table.rates[from] && table.rates[to]);
}

/**
 * `amount` in `from`, expressed in `to`. null when we can't do it honestly.
 *
 * Both rates are quoted against the table's base, so the conversion divides out
 * of the base rather than assuming `from` IS the base — which keeps a
 * GBP→JPY menu working without a second table.
 */
export function convert(amount, from, to) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  if (from === to) return amount;
  if (!canConvert(from, to)) return null;
  return (amount / table.rates[from]) * table.rates[to];
}
