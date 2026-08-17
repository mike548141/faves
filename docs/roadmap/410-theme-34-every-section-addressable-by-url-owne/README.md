# Theme 34 — every section addressable by URL (owner-raised 2026-08-16)

Owner, verbatim: *"Each section, maybe each configuration item, should be
addressable directly via URL. For example I should be able to send someone a
URL and it opens straight to the Food Preferences section of the Settings
screen."*

The use case is **handing someone a place in the app**, not bookmarking. That
matters, because it sets the bar: the link has to survive being pasted into
Messages by one person and cold-opened by another, on a phone that may have
never loaded Faves before, possibly offline after that first load.

### 🔎 The finding that has to be settled first: the hash is already full

Faves has four URL mechanisms today and **three of them share the hash**, with
no convention deciding who wins. This is not a hypothetical clash — it is the
reason this theme needs a design step rather than a patch.

| What | Form | Where | Kind |
|---|---|---|---|
| Venue page | `restaurant.html?id=<venue>` | `menu.js:1548` | query, resolved at load |
| Recipe page | `recipe.html?id=<slug>` | `recipe.js:185` | query, resolved at load |
| Filters | `index.html?area=…&cuisine=…` | `filters.js:45`, synced `app.js:352` | query, `replaceState`-tracked |
| Dish anchor | `#dish-<slug>` | `menu.js:1558` | hash, an *element anchor* (+ `formerIds` fallback) |
| Section anchor | `#section-<sectionId>` | `menu.js:1275` | hash, an *element anchor* — **stored id since ADR 0058**, no longer derived from the heading |
| Favourites view | `#faves` | `app.js:862` | hash, a *view toggle* |
| Share / transfer | `#<base64url payload>` | `cart-ui.js:422`, `personal-io-ui.js:436` | hash, an *opaque payload*, consumed then stripped |

So the hash is simultaneously an anchor, a view switch and a data envelope.
`#faves` is a bare word in the same namespace as a dish slug; a share token is a
long base64url blob distinguished only by "it parsed". Adding `#settings/diet`
to that pile without a rule is how a venue that one day sells a dish called
"faves" breaks the favourites view.

🎯 **The owner-facing question underneath:** does an addressable section live in
the **query** (`?panel=diet` — survives, is obviously state, doesn't fight
anchors) or the **hash** (`#settings/diet` — never hits the network, reads more
like a place)? Recommendation: **query for state, hash stays for anchors and
payloads.** It keeps the one namespace that already has three tenants from
getting a fourth, and Cloudflare Pages serves the same static file either way,
so the query costs nothing.

🔎 **Three mechanisms checked in the code 2026-08-16 (wt: faves-schema30), which
turn two of this theme's recommendations from preferences into positions.**

1. **The query is safe to share, and I expected it not to be.** The obvious
   objection to `?panel=diet` is that the filter sync owns the query string and
   would stamp on it. It does not: `app.js:325` builds from
   `new URLSearchParams(location.search)` and only ever `set`s or `delete`s
   `area` and `cuisine`, then re-appends `location.hash`. **An unknown param
   survives a filter change untouched.** So the recommendation costs nothing to
   adopt — verified rather than assumed.
2. **But it survives too well, and that decides call 2 below.** Nothing ever
   removes it, so a reader who opens a deep link to Settings → Food preferences,
   closes Settings, then filters by cuisine, still carries `?panel=diet` — and
   on reload Settings springs open again with no idea why. **That is the
   mechanism behind "resolve on arrival, don't track", and the repo already has
   the pattern:** `cart-ui.js:586` consumes a share token and immediately does
   `history.replaceState(null, "", location.pathname + location.search)` to
   strip it. The resolver must strip its own param the same way.
3. 🔑 **The hash-crowding hazard has already bitten this repo once, and the fix
   it chose supports the recommendation.** `report-ui.js:67`'s `pageUrl()`
   deliberately drops the fragment when building a report link, and says why:
   *"On the home screen the hash may be carrying a shared order or shortlist
   token — someone else's picks have no business riding along in a report."*
   A fourth tenant in that namespace is not hypothetical risk; it is the same
   accident, and last time it was solved by getting **out** of the hash.

### The other three calls, which are UX not plumbing

1. **Does Back close it?** If opening Settings → Food preferences writes a
   history entry, the Android back gesture closes the panel — which is what a
   phone user expects of a sheet. If it doesn't, Back leaves the app entirely
   from a screen that looks like a page. Recommendation: **push on open, one
   entry for the whole dialog, not one per panel** — so Back closes Settings
   rather than walking backwards through six panels the reader tapped through.
2. **Does the URL track, or only resolve?** Tracking (the bar updates as you
   move) makes every link copyable but writes history constantly. Resolving
   only (the URL is honoured on arrival, then left alone) is quieter and is
   what `cart-ui.js`/`personal-io-ui.js` already do with tokens. Recommendation:
   **resolve on arrival, and give the reader an explicit way to copy the link**
   — which is 34e.
3. **Which surfaces are even addressable?** Eleven modal surfaces exist
   (`settings`, `about`, `cart`, cart-receive, `cook`, filter sheet,
   `personal-io`, `picker`, `report`, photo lightbox, `share`). Some should
   never be linkable: a photo lightbox is an anchor's job, and a confirm dialog
   arrived at cold is a trap — the reader lands on "Delete this profile?" with
   no idea what asked. 🚩 **Rule to hold: a URL may open a place, never a
   pending action.**

### The staging

- **34a — the convention, and one place that owns it** `[M][js][design]`.
  A single resolver that reads the URL once at boot, decides what it names, and
  hands off; plus the written rule for who owns the hash. Everything below
  depends on it. Includes the safety property that today is accidental: an
  unknown or hostile URL must **fail to the plain screen**, never to a broken
  one — the no-JS fallback `<ul>` in `index.html` still has to be what a reader
  gets when JS dies, and it can't parse routes.

- **34b — Settings panels, the owner's actual example** `[S][js]`. Cheap once
  34a exists, because the topic keys are already there: `settings-ui.js` has
  `TOPICS` with stable keys `people` · `diet` · `places` · `locale` · `data` ·
  `refreshReset` (`settings-ui.js:849`). "Food preferences" is `diet`. The work
  is opening the dialog *at* a panel rather than at the index, and getting
  focus right — the panel `<h2>` is already the dialog's accessible name and
  already a focus target on drill-in, so a deep link should land there too, not
  on the back button.

- **34c — the other linkable surfaces** `[M][js][design]`. Apply the rule from
  34a's third call. Likely in: the Order tally, About, the filter sheet (which
  is half-addressable already via `?area=`/`?cuisine=`, so this is really
  "finish it"), cook mode at a step. Likely out: lightbox, every confirm, the
  receive-a-transfer dialog (it is a payload, not a place).

- **34d — individual configuration items** `[L][js][design]` 🔗 **converges
  with 22a**. The owner's "maybe each configuration item" is a different order
  of magnitude from 34b: it needs a **stable id per control** plus a label and
  synonyms — which is exactly the *"registry of settings with searchable
  labels"* that Theme 22a named as the missing piece for search-jumps-to-a-
  setting. Build the registry once and both land. Open design question: does an
  item link **highlight and scroll** to the control, or *operate* it? Strong
  recommendation for highlight-only — a URL that flips someone's allergen
  settings on open is a safety surface, and the standing constraint from 22a
  applies here too: **nothing may ever assert an allergen is absent.**

- **34e — the outward half: getting the link** `[S][design]`. An address only
  helps if a reader can obtain it. Today the address bar is the only route, and
  on an installed PWA in standalone mode **there is no address bar** — so the
  owner's example is literally impossible for anyone who installed the app.
  🚩 This is the item that decides whether the theme delivers the stated use
  case at all; the rest is plumbing beneath it.
  ✅ **Re-sized 2026-08-16 (wt: faves-schema30): the hard half is already built
  and shipped.** `site/js/share-core.js` is a complete two-transport share — the
  OS sheet via `navigator.share` with a clipboard fallback, a `canShare` probe,
  and a three-way outcome (`shared` / `unavailable` / failed) so a blocked
  clipboard is distinguishable from a declined sheet. It already carries the two
  constraints that make this fiddly: `navigator.share` **needs a user gesture**,
  so the payload must be composed synchronously before it is reached
  (`report-ui.js:250` is the worked example), and it does not exist on most
  desktops. Four callers already use it — report, share, share-app, sync.
  So 34e is **wiring an existing module to a new payload**, not building a share
  path. It stays `[S]`, and it stops being the item the theme's viability rests
  on. What is left is genuinely design: where the "copy a link to this" control
  lives on a Settings panel without cluttering it.

### Sizing and sequence

34a then 34b delivers the owner's own example and is the honest MVP — roughly
one session. 34e is small but is what makes it usable on an installed phone, so
it belongs in the same session, not later. 34c is a second session. 34d is its
own piece of work and should be scheduled **with 22a**, never separately.

🎯 **For the owner:** the three recommendations above (query not hash · Back
closes the dialog · links open a place, never an action) are the ones that are
awkward to reverse once links are in the wild — a link someone was sent has to
keep working.

---
