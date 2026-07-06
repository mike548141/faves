# Faves — instructions for AI builders

Read `docs/STRATEGY.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, then
work from `docs/WORKPLAN.md`. Do not deviate from the architecture
without recording the decision in `docs/ARCHITECTURE.md`.

## Hard constraints

- **Zero build step.** `site/` is served as-is. No Node, no npm, no
  bundlers, no frameworks, no CDN dependencies. Vanilla HTML + CSS +
  ES-module JavaScript only. (This machine has no Node/brew — by design.)
- **Mobile first.** Design and test at 390 px first, then tablet, then
  desktop. Every interactive target ≥ 44 px.
- **Offline capable.** Service worker precaches the app shell and all
  menu data; the whole site must work in flight mode after first visit.
- **New Zealand English** throughout (favourite, organise). Correct
  macrons on te reo Māori words. Prices in NZD.
- **No personal data — one owner-approved exception.** No addresses of
  people, no phone/contact details, no health details, anywhere. For
  restaurants and menus: no personal data at all. **Exception
  (owner-approved 2026-07-06):** home recipes in the Cook at Home
  collection may keep family attributions in their titles/notes (e.g.
  "Booth's Ginger Crunch", "a Clements family dessert") at the owner's
  discretion — it's a public site and that call is his. Still never
  addresses, contact details, or health details. Allergen tagging is a
  product feature, not a personal disclosure.
- **Accessibility is non-negotiable.** WCAG 2.2 AA, semantic HTML,
  visible focus, prefers-reduced-motion respected, dark mode supported.

## Quality bar

- Lighthouse (mobile): Performance ≥ 95, Accessibility 100, Best
  Practices 100, SEO ≥ 95, installable PWA.
- Total transfer for first visit < 300 KB (excluding photos, which lazy-load).
- Works in Safari iOS, Chrome Android, and desktop evergreen browsers.

## Verify before committing

```sh
python3 tools/serve.py        # laptop + phone (same Wi-Fi); prints both URLs
python3 tools/validate.py     # data validates against the schema
```

Exercise the change in a real browser at mobile width. JSON data must
validate against the schema in `docs/ARCHITECTURE.md` — malformed menu
data is the most likely regression.
