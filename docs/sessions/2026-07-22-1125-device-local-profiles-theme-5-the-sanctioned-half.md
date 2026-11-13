## 2026-07-22 — Device-local profiles (Theme 5, the sanctioned half) — Opus 4.8

Shipped **device-local profiles** (wt: faves-wave3-local-profiles; ADR 0012):
several people share one phone, each with their own hearts + food prefs. NO
accounts, NO sync — cross-device stays out of scope (a separate signed-in app,
Theme 6). New DOM-free store `profiles.js`: a device-level registry
`faves.profiles.v1` `{v,activeId,profiles:[{id,name}]}` + a `profileScopedStorage`
wrapper that namespaces per-profile keys to `faves.p.<activeId>.<base>`
(`scopeKey`). Favourites + settings singletons now read through it; switching
profile + `reload()` re-points the whole personal layer with no consumer
rewrite. **Per-profile vs shared (scoped by *whole store*, not by field):**
per-profile = favourites + all of settings (dietary/allergen prefs [safety], the
two ranking dials, the reo language); shared/device = order tally (one order for
the table) + Near-me origin (sessionStorage). Theme follows the OS, never stored.
**Migration** (`migrate`): folds pre-profiles data into a default profile ("Me",
deterministic id `default`), **copies** old keys (doesn't move — a briefly-cached
old asset still reads them), idempotent, copy-only-when-target-empty. **UI:** a
"who's using Faves?" switcher at the top of the ⚙ Settings dialog — native radios
styled as chips, add/rename via one inline form, delete via an inline confirm
(destructive; last profile undeletable), a visually-hidden live region announces
each change, an unobtrusive "Browsing as <name>" caption in the ⋯ menu. **Safety
re-apply:** menu/recipe screens read diet once at render + have no switcher, so
the only stale case is a cross-tab switch — they `location.reload()` when the
active profile changes so no one browses under someone else's allergen filter;
the Settings diet chips re-sync live. te reo strings added for the new chrome
(draft; privacy prose stays English per reo.js). ~28 unit tests
(`tests/profiles.test.js`) cover namespacing, sanitising, migration (incl.
idempotency + no-clobber), create/rename/delete/switch/subscribe, isolation.

**Verified:** `node --test` 228 pass; `validate.py` (27 valid, 4 pre-existing
"no picks" warnings), `check_no_deps`, `gen_sbom --check` all green; `node
--check` on every changed module; served locally — index caption markup present,
`js/profiles.js` 200, sw VERSION `2026-07-22.69 → .70` (bumped once in the final
site commit; profiles.js added to SHELL). **NOT browser-exercised** (no headless
browser here): the switcher's DOM interactions, live-region announcements, focus
handling, and the cross-tab reload are logic-/syntax-verified only — worth a real
mobile pass before launch. **Owner calls to revisit:** (1) reo **language is
per-profile** (a consequence of scoping by whole store) — if it should be
device-level, split `lang` into a device key (superseding ADR, follow-up); (2)
old un-namespaced keys are left orphaned after migration (tiny) — a later cleanup
could purge them once no old assets can be cached; (3) the ranking dials ride
per-profile too — fine, but flag if they should be device-level.

