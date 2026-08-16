// "Tell us what's wrong or missing" — the report *composer* (ROADMAP Theme 4c-i,
// ADR 0028). Pure and DOM-free so the wording is unit-testable; report-ui.js owns
// the dialog and the hand-off.
//
// WHY IT COMPOSES TEXT RATHER THAN POSTING ANYTHING. The owner ruled the
// transport on 2026-08-09: build the report on the device and hand it to the OS
// share sheet or the clipboard, so it arrives as an ordinary message. Zero infra,
// works in flight mode, no trust surface, no accounts — and for a
// family-and-friends audience the message *is* the channel. So this module's
// whole job is to turn "what they tapped" into a paragraph a person can read and
// a block the owner can act on without a conversation.
//
// SAFETY (non-negotiable, inherited verbatim from the allergen framing): a report
// is **a suggestion to the person who keeps Faves, never a live edit**. Nothing
// composed here changes what the app shows or flags — an allergen tag only moves
// when a human checks the menu and edits the data. The closing line of every
// report says so, because the reverse failure — someone "correcting away" a
// peanut tag — is a safety failure, not a data-quality one.
//
// NO RECIPIENT IS BAKED IN. There is deliberately no address, handle or phone
// number anywhere in this file: the repo is publication-bound, and the audience
// already has a channel to whoever shared Faves with them. The report says to
// send it to that person.
//
import { formatMoney, venueCurrency } from "./place.js";

// The composed text is always English — it's a message to the person who
// maintains the data, not app chrome (reo.js translates the dialog around it).

/**
 * A price as the app shows it ($18.50, £8.95) — mirrors menu.js's `money`.
 * Takes the venue's currency because a report quotes a price back to us and an
 * unlabelled number from a foreign menu is the ambiguity worth avoiding.
 */
export function money(n, currency) {
  return n == null ? null : formatMoney(n, currency);
}

// What can be reported, and from where. `scopes` is where the entry point lives:
// a dish row, a venue's contact card, or the app-wide ⋯ menu. `stream` is where
// it lands — "data" goes to the intake pipeline and a content session, "app" to
// the roadmap; the owner asked for those kept apart, so the report says which.
//
// `i18n` is the reo.js key for the label. The allergen entry deliberately has
// NONE: reo.js's safety boundary keeps allergen wording English until a reo
// review, and it falls through to English automatically by having no key.
export const REPORT_TYPES = [
  {
    key: "price",
    scopes: ["dish"],
    stream: "data",
    label: "The price is wrong",
    i18n: "report.type.price",
  },
  {
    key: "allergen",
    scopes: ["dish"],
    stream: "data",
    label: "An allergen is missing or wrong",
  },
  {
    key: "gone",
    scopes: ["dish"],
    stream: "data",
    label: "This dish isn’t available any more",
    i18n: "report.type.gone",
  },
  {
    key: "dish-other",
    scopes: ["dish"],
    stream: "data",
    label: "Something else about this dish",
    i18n: "report.type.dishOther",
  },
  {
    key: "venue-other",
    scopes: ["venue"],
    stream: "data",
    label: "Something here is wrong or out of date",
    i18n: "report.type.venueOther",
  },
  {
    key: "suggest",
    scopes: ["app"],
    stream: "data",
    label: "Suggest a place for Faves",
    i18n: "report.type.suggest",
  },
  {
    key: "app",
    scopes: ["app", "venue"],
    stream: "app",
    label: "A bug or an idea for the app",
    i18n: "report.type.app",
  },
];

/** The report types offered from one entry point ("dish" | "venue" | "app"). */
export function typesForScope(scope) {
  return REPORT_TYPES.filter((t) => t.scopes.includes(scope));
}

/** Look one up by key; undefined for an unknown key (callers fall back). */
export function reportType(key) {
  return REPORT_TYPES.find((t) => t.key === key);
}

// The opening line, by stream — a person writing to a person, not a form.
const OPENERS = {
  price: "Kia ora — I think a price in Faves needs fixing.",
  allergen: "Kia ora — I think an allergen tag in Faves needs a look.",
  gone: "Kia ora — I think a dish has come off this menu.",
  "dish-other": "Kia ora — I think something on this menu needs fixing.",
  "venue-other": "Kia ora — I think something about this place needs fixing.",
  suggest: "Kia ora — here’s a place I reckon belongs in Faves.",
  app: "Kia ora — here’s some feedback on the Faves app.",
};

// Every report ends the same way: where to send it, and the safety rule. Both
// halves matter. The second sentence is the allergen framing — a report is a
// suggestion, never an edit — and it is not optional on any report type.
const CLOSING =
  "Send this to whoever shared Faves with you — they’ll pass it on.\n" +
  "Nothing in the app changes until a person checks it: a report never edits a " +
  "menu, a price or an allergen tag.";

const DETAILS_HEAD = "— details, for whoever updates Faves —";

// A tag list as the data records it, for the machine block. Kept as raw tag keys
// (contains-peanuts, spicy-1) because that's what the owner edits in the JSON.
const tagList = (tags) => (tags || []).filter(Boolean).join(", ");

// Allergen tags only, for the human sentence. "No tag = not stated" is a hard
// rule of the data model (ARCHITECTURE.md), so absence is reported as absence of
// a *record*, never as "this dish has no allergens".
const allergenTags = (tags) =>
  (tags || []).filter((t) => typeof t === "string" && t.startsWith("contains-"));

function whatLine(type, venue, dish) {
  const label = reportType(type)?.label ?? "Something needs fixing";
  if (dish?.name && venue?.name) return `${label}: “${dish.name}” at ${venue.name}.`;
  if (venue?.name) return `${label}: ${venue.name}.`;
  return `${label}.`;
}

// What the device is showing right now — the whole point of reporting from the
// dish rather than a blank contact form. Stated as "Faves is showing …" so it
// reads as our record, not as a claim about the venue.
function shownLines(type, dish, venue) {
  if (!dish) return [];
  const out = [];
  if (type === "allergen") {
    const allergens = allergenTags(dish.tags);
    out.push(
      allergens.length
        ? `Faves is showing these allergen tags: ${tagList(allergens)}.`
        : "Faves isn’t showing any allergen tags for it (no tag means not stated, " +
          "not allergen-free)."
    );
    return out;
  }
  const price = money(dish.price, venueCurrency(venue));
  out.push(price ? `Faves is showing ${price}.` : "Faves has no price recorded for it.");
  return out;
}

// The machine-usable block: one `key: value` per line, omitting what doesn't
// apply. Versions are what the *device* actually has installed (versions.js), not
// what the source claims — a stale phone is exactly the case worth knowing about,
// so an unknown stamp says "unknown" rather than going quiet.
function detailLines({ type, venue, dish, versions, url }) {
  const t = reportType(type);
  // Label *and* key: the label is what the owner scans, the key is what a future
  // triage script would group on.
  const lines = [["report", t ? `${t.label} [${type}]` : type]];
  if (t) lines.push(["goes to", t.stream === "app" ? "the app roadmap" : "the menu data"]);
  if (venue?.name) lines.push(["venue", venue.id ? `${venue.name} (${venue.id})` : venue.name]);
  if (dish?.name) lines.push(["dish", dish.name]);
  if (dish?.code) lines.push(["order code", `#${dish.code}`]);
  if (dish) lines.push(["price shown", money(dish.price, venueCurrency(venue)) ?? "none recorded"]);
  if (dish) lines.push(["tags shown", tagList(dish.tags) || "none recorded"]);
  if (venue?.verified !== undefined && venue?.name) {
    lines.push(["menu last checked", venue.verified || "never"]);
  }
  lines.push(["app version", versions?.shell || "unknown"]);
  lines.push(["menu data", versions?.data || "unknown"]);
  if (url) lines.push(["page", url]);
  return lines.map(([k, v]) => `${k}: ${v}`);
}

/**
 * Compose the whole report as plain text.
 *
 * ctx: {
 *   type,                              // a REPORT_TYPES key
 *   venue: { id, name, verified },     // omit for an app-wide report
 *   dish:  { name, price, tags, code },// omit for a venue/app report
 *   note,                              // the reporter's free text (optional)
 *   versions: { shell, data },         // from versions.js — what's installed here
 *   url,                               // deep link to what they're looking at
 * }
 * Pure: no DOM, no clock, no storage. Everything it says comes from `ctx`.
 */
export function composeReport(ctx = {}) {
  const { type, venue, dish, note, versions, url } = ctx;
  const blocks = [];

  blocks.push(OPENERS[type] || OPENERS.app);
  // An app-wide report (feedback, suggest a place) has no venue or dish to name,
  // and the opener already said what it is — a "what" line there would just echo.
  if (venue?.name || dish?.name) {
    blocks.push([whatLine(type, venue, dish), ...shownLines(type, dish, venue)].join("\n"));
  }

  const trimmed = typeof note === "string" ? note.trim() : "";
  if (trimmed) blocks.push(`My note:\n${trimmed}`);

  blocks.push([DETAILS_HEAD, ...detailLines({ type, venue, dish, versions, url })].join("\n"));
  blocks.push(CLOSING);

  return blocks.join("\n\n");
}

/**
 * A short subject for the OS share sheet (some targets show a title separately).
 * Deliberately terse and never a claim — "about", not "wrong".
 */
export function reportSubject({ type, venue, dish } = {}) {
  const label = reportType(type)?.label ?? "Faves feedback";
  if (dish?.name && venue?.name) return `Faves — ${label}: ${dish.name}, ${venue.name}`;
  if (venue?.name) return `Faves — ${label}: ${venue.name}`;
  return `Faves — ${label}`;
}
