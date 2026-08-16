# 0044 — A menu can be written in another language

**Status:** accepted
**Date:** 2026-08-16
**Follows:** [0042](0042-the-collection-is-not-scoped-to-a-city.md) — the
collection is not scoped to a country ·
[0043](0043-a-venue-carries-its-own-clock-and-currency.md) — a venue carries its
own clock and currency

## Context

ADR 0043 taught a venue where it is. It ended by naming what it deliberately did
not do: menu *content* in another language. The owner asked for it next
(2026-08-16) — restaurants, menus and dishes outside New Zealand need to support
other languages and dialects.

A menu abroad asks two things of a reader at once, and they pull apart:

- **what the dish is** — in a language they read;
- **what the dish is called** — in the script on the wall, so they can point at
  it, and so the person taking the order recognises what they are being asked
  for.

Answering only the first strands you at the counter. Answering only the second
is the printed menu you already couldn't read.

There is also a hard constraint. WCAG 2.2 AA **3.1.2 Language of Parts** requires
a passage in another language to be marked as such. Unmarked, a screen reader
pronounces ต้มยำกุ้ง with English rules — not "slightly off" but unintelligible —
and the browser may pick a font with no glyphs for the script. Accessibility is
non-negotiable in this repo, so this is a requirement, not a refinement.

## Decision

**Translations are additive. The canonical string never moves.**

```jsonc
{
  "language": "th-Latn",              // venue-level; absent = "en-NZ"
  "menu": [{
    "section": "Soups",
    "items": [{
      "name": "Tom yam kung",         // canonical — identity AND fallback
      "desc": "Hot and sour prawn soup with lemongrass",
      "translations": {
        "name": { "th": "ต้มยำกุ้ง", "en": "Hot and sour prawn soup" },
        "desc": { "th": "ต้มยำกุ้งน้ำข้น" }
      }
    }]
  }]
}
```

**`name` stays a plain string, always.** This is the load-bearing decision. A
dish name is not display text — it is the dish's **identity**: `slug(name)` is
the anchor in the URL, `picks` refers to dishes by name, and a heart is stored
as `d:<venueId> <name>`. Making `name` an object would have quietly detached
every one of those from every dish, with nothing on screen to say so. So
`translations` is a sidecar, and `validate.py` refuses a translation for a field
the record doesn't have.

**A venue declares the language of its own canonical strings**, so a record can
be honest about what it holds. `th-Latn` — Thai written in Latin script — is not
pedantry: it is the only thing that lets a reader of Thai be handed ต้มยำกุ้ง
rather than a romanisation of it.

**Both are shown, never one.** The heading takes the best rendering for this
reader; every other rendering sits on a quieter line beneath it, separated by
`·`. That line keeps full contrast and a legible size — it is the line you hold
up to point at, not a caption. No `font-family` is set on it: the browser's own
script fallback picks a face that has the glyphs, and naming a Latin stack there
would hide the very text the line exists to show.

**Ordering, best-first:** exact reader tag → same primary subtag as the reader →
exact venue tag → same primary subtag as the venue → English → anything else,
with data order preserved inside each tier by a stable sort.

**The reader's language is the UI language setting**, not a new one. A second
dial for a distinction almost nobody wants to draw is a settings row that has to
be understood before it can be ignored; someone reading the interface in te reo
Māori has told us the most we know about their menu preference too.

**Search indexes every rendering.** Someone typing "tom yam" and someone pasting
"ต้มยำ" want the same dish, and only one of them can type the other. The index is
built once for everybody, so it never varies with a reader's setting.

## Consequences

**Every existing record is untouched and renders identically.** A record with no
`translations` produces one rendering and no second line — asserted first in
`tests/lang.test.js`, because all 38 shipped records are that record.

**Nothing shipped uses this yet.** The capability, its schema, its validation and
its tests are here; no venue carries a translation. That is deliberate — the
alternative was inventing a real shop's Thai menu to demonstrate a feature, which
would put a fabricated fact in a public repo. Verified instead by grafting a
translation onto a record in a scratch copy and reading the DOM in headless
Chrome: heading `lang="en"`, alternates `lang="th-Latn"` and `lang="th"`,
description `lang="th-Latn"`.

**`validate.py` gains a shape check, not a registry lookup.** BCP-47 tags are
matched against a pattern; the IANA registry is not in the stdlib, and a shape
check catches the realistic error — a language *name* where a tag belongs
("Thai", "Chinese") — without claiming more authority than it has.

**Still not covered, and named so it isn't mistaken for done:** allergen and
dietary tags stay English, because the safety vocabulary is a closed set the app
reasons over rather than prose (the same boundary `reo.js` already keeps); and
there is no translation *of* our own English descriptions — a translation is a
fact someone recorded, never something this app generates.

## Alternatives rejected

**Make `name` a localised object.** The obvious shape, and it silently breaks
identity: anchors, `picks`, and every stored heart and rating. Any migration
would have had to rewrite personal data on every family device to repair damage
the change itself caused.

**Translate at render time.** A translation API is a network dependency (against
ADR 0001 and the offline guarantee), and a machine gloss of an allergen-bearing
dish name is a safety claim we cannot stand behind. What a dish is called is a
fact to be recorded, not computed.

**A separate "content language" preference.** Rejected above: a settings row that
must be understood before it can be ignored, for a distinction almost nobody
draws. Reconsider if a reader ever asks for it.

**Detect the language from the script.** Cheap heuristics get Chinese/Japanese
and the Latin-script languages wrong constantly, and a wrong `lang` is worse for
a screen reader than a missing one — it sounds confident.
