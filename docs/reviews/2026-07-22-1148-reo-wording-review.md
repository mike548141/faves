# Te reo Māori UI wording review — pre-launch pass

**Date (UTC):** 2026-07-22 11:48
**Reviewer:** AI (Claude Opus 4.8), working in worktree `faves-wave5-reo-review`.
**Scope of source reviewed:** every te reo string the app ships — the full `MI`
table in `site/js/reo.js` (68 keys), the language-option labels in
`site/js/settings-ui.js`, and the `<html lang>` / lang-attribute mechanics.

## Honest scope statement (read this first)

🚩 **This pass raises the floor; it does not replace a fluent-speaker review.**
I am an AI, not a native or fluent speaker of te reo Māori. I have:

- confirmed the **mechanical** class (tohutō / macrons) is clean — **zero**
  missing or wrong macrons across all 68 strings;
- confirmed the **standard UI terms** match attested mi-NZ localisation
  convention (Microsoft/Google Māori language packs, NZ-government usage) —
  e.g. *Tautuhinga* (Settings), *Tāpirihia* (Add), *Muku* (Delete), *Tiaki*
  (Save), *Whakakore* (Cancel), *Katia* (Close);
- fixed a real **accessibility** defect in how the language is marked in the DOM
  (see below);
- **flagged, not "fixed", every string I could not ground a better form for.**
  I made **no** speculative wording changes — where a string is plausible but I
  can't cite attested usage for an improvement, I left it and flagged it.

🎯 **Remaining owner option:** a review by a fluent speaker of the 9 flagged
strings (and a sanity pass over the rest) before the public launch. This
document is the hand-off list for that review. Do **not** read this as
"reo wording signed off".

## Counts

| Verdict | Count |
|---|---|
| ✅ kept (idiomatic / attested / correct) | 59 |
| 🔧 fixed (wording) | 0 |
| 🤔 flagged for a fluent speaker | 9 |
| **Total strings** | **68** |

Plus **1 code fix** (lang-of-parts a11y mechanics — not a wording change).

## The one code fix — `lang="mi"` mechanics (a11y)

**Was:** the i18n engine flipped the whole `<html lang>` to `"mi"` whenever te
reo mode was on. Everything that *stays English by design* — venue/menu/recipe
content, all allergen & safety text, interpolated strings ("Serves 4", hours) —
then sat inside `lang="mi"`, so a screen reader pronounced all of it as Māori.
On a menu screen that is the majority of the page.

**Now:** WCAG 2.2 SC 3.1.2 *Language of Parts*. The document root stays `en-NZ`
(English is the source of truth); `translate()` stamps `lang="mi"` **only** on
the elements it actually renders in te reo, and reverts losslessly on
switch-back. Fixed in `site/js/reo.js` (`markLang()` + the new marking pass in
`translate()`, root set to `en-NZ` in `initReo()`).

## Per-string verdicts

Grounding sources referenced: **Te Aka** Māori Dictionary (maoridictionary.co.nz);
attested **mi-NZ** software localisations (Microsoft/Google Māori); NZ-government
te reo UI usage. All strings carry correct macrons unless noted (none were wrong).

### Home / search / toggles

| Key | English | Te reo | Verdict |
|---|---|---|---|
| `app.sub` | Our favourite Wellington kai — menus, in one place. | Ā mātou kai tino pai o Pōneke — ngā tahua kai, kotahi te wāhi. | 🤔 grammar & terms fine (*Ā mātou* a-category correct for kai; *tahua kai* = menu, *Pōneke* = Wellington); flagged as a **marketing tagline** — register/flow wants a native ear. |
| `search.ph` | Search for a place or dish… | Rapua he wāhi, he kai rānei… | ✅ *Rapua* imperative; reads naturally. |
| `search.clear` | Clear search | Whakawātea rapu | 🤔 *whakawātea* = to clear/free up (plausible); can't ground it over alternatives (*ūkui* / *muku*) for the "clear field" convention. |
| `nav.backToTop` | Back to top | Hoki ki runga | ✅ |
| `toggle.openNow` | Open now | E tuwhera ana | ✅ continuous aspect correct. |
| `toggle.cheapEats` | Cheap eats | Kai utu-iti | ✅ transparent coinage (low-cost food). |
| `toggle.nearMe` | Near me | E tata ana | ✅ |
| `service.all` | Everywhere | Ngā wāhi katoa | ✅ |
| `service.takeaway` | Takeaway | Mau atu | 🤔 *mau atu* = carry away (plausible); verbless-label idiom for "takeaway" not grounded. |
| `service.dineIn` | Dine-in | Kai ā-whare | ✅ *ā-whare* = on-premises. |
| `filter.allAreas` | All areas | Ngā rohe katoa | ✅ *rohe* = area/district. |
| `filter.allCuisines` | All cuisines | Ngā momo kai katoa | ✅ |

### Navigation / favourites / picker

| Key | English | Te reo | Verdict |
|---|---|---|---|
| `nav.more` | More | Ētahi atu | ✅ attested for "More". |
| `nav.favourites` | Favourites | Ngā Makau | 🤔 *makau* = beloved/sweetheart/favourite; works but connotation is romantic — a brand-voice call worth a native check (also used at `fav.title`, `pick.usual`). |
| `nav.settings` | Settings | Ngā Tautuhinga | ✅ **attested standard** (Microsoft/Google mi). |
| `nav.about` | About | Mō tēnei | ✅ common pattern. |
| `nav.shareApp` | Share this app | Tuaritia tēnei taupānga | ✅ *taupānga* = app (attested). |
| `nav.allRestaurants` | ← All restaurants | ← Ngā wharekai katoa | ✅ *wharekai* = restaurant. |
| `nav.back` | ← Back | ← Hoki | ✅ |
| `fav.title` | Favourites | Ngā Makau | 🤔 see `nav.favourites`. |
| `fav.allPlaces` | All places | Ngā wāhi katoa | ✅ |
| `fav.share` | Share these | Tuaritia ēnei | ✅ |
| `pick.button` | Pick for us | Whiriwhiria mā mātou | ✅ *Whiriwhiria* = select; *mā mātou* = for us (excl.). |
| `pick.eyebrow` | Tonight it's… | I tēnei pō, ko… | ✅ | <!-- datescan:allow: a verbatim UI string under review, not a dated claim -->
| `pick.usual` | ♥ one of your usuals | ♥ tētahi o ō makau | ✅ (subject to the *makau* brand call). |
| `pick.go` | That's the one | Koia tēnā | ✅ idiomatic. |
| `pick.again` | Go again | Anō | ✅ |
| `pick.empty` | (no places fit — widen filters, pick again) | Kāore he wāhi e tau ana — whakawhānuitia ō tātari, ka panoni anō. | 🤔 first clause good; *ka panoni anō* uses *panoni* (**change/alter**) where "pick again" wants *kōwhiri* (**choose**) — possible English calque; leave for a native call. |

### Generic / profiles / status / footer

| Key | English | Te reo | Verdict |
|---|---|---|---|
| `generic.close` | Close | Katia | ✅ attested. |
| `generic.cancel` | Cancel | Whakakore | ✅ attested standard. |
| `profile.title` | Who's using Faves? | Ko wai kei te whakamahi i a Faves? | ✅ *i a [name]* personal-article use correct. |
| `profile.choose` | Choose who's using Faves | Tīpakohia ko wai kei te whakamahi i a Faves | 🤔 *Tīpakohia* correct; selecting a *ko wai* clause reads slightly awkward — native check. |
| `profile.browsingAs` | Browsing as | Kei te tirotiro hei | 🤔 *hei [name]* for "as [name]" reads odd (*hei* usually precedes a role, not a personal name); flag for a better frame. |
| `profile.add` | Add someone | Tāpirihia tētahi | ✅ **attested standard** (Add). |
| `profile.rename` | Rename | Whakaingoa anō | ✅ transparent (name-again). |
| `profile.delete` | Delete | Mukua | ✅ **attested standard** (Delete). |
| `profile.save` | Save | Tiaki | ✅ **attested standard** (Save). |
| `profile.firstName` | First name | Ingoa tuatahi | ✅ |
| `result.empty` | No places match those filters. Try widening them. | Kāore he wāhi e tau ana ki ēnā tātari. Whakawhānuitia. | ✅ |
| `tz.note` | Open/closed times are New Zealand time. | Kei te wā o Aotearoa ngā wā tuwhera/kati. | ✅ |
| `footer.made` | Made by | Nā | ✅ idiomatic agentive (*Nā [X]*). |
| `footer.about` | About & privacy | Mō tēnei me te tūmataiti | ✅ *tūmataiti* = privacy (attested). |
| `settings.title` | Settings | Ngā Tautuhinga | ✅ |
| `settings.langTitle` | Language | Te Reo | ✅ idiomatic section heading. |

### Menu screen chrome

| Key | English | Te reo | Verdict |
|---|---|---|---|
| `menu.loading` | Loading menu… | E uta ana te tahua kai… | ✅ |
| `menu.call` | Call to order | Waea atu ki te ōta | ✅ *ōta* = order (attested loan). |
| `menu.pickup` | Pickup | Tiki atu | ✅ |
| `menu.hours` | Hours | Ngā hāora | ✅ |
| `menu.hoursNz` | Hours · NZ time | Ngā hāora · wā o Aotearoa | ✅ |
| `menu.orderOnline` | Order online | Ōta ā-ipurangi | ✅ *ā-ipurangi* = online. |
| `menu.picksHead` | If it's your first time, try… | He wā tuatahi nōu? Whakamātauria… | ✅ nicely rephrased as a question. |
| `menu.picksAria` | Our picks | Ā mātou kōwhiringa | ✅ *kōwhiringa* = choices (attested). |
| `menu.goesWith` | Goes well with | He pai i te taha o | ✅ |
| `rating.our` | Our rating | Tā mātou whakatauranga | 🤔 possessive *Tā mātou* fine; **noun *whakatauranga* for "rating" is uncertain** (attested nominalisation of *whakatau* is *whakataunga*) — I can't ground it, so left as-is. Priority flag. |
| `menu.search.ph` | Search this menu… | Rapua tēnei tahua kai… | ✅ |
| `menu.search.recipes.ph` | Search recipes… | Rapua ngā tohutao… | ✅ *tohutao* = recipe. |
| `menu.search.aria` | Search this menu | Rapua tēnei tahua kai | ✅ |
| `menu.sections.aria` | Menu sections | Ngā wāhanga o te tahua kai | ✅ |
| `menu.diet.aria` | Dietary filters | Ngā tātari kai | ✅ kept — this is the **landmark aria-label** (neutral chrome), not a safety chip; note it renders "food filters" (drops "dietary"). Within the safety boundary. |
| `menu.aside.aria` | Contact and ordering | Te whakapā me te ōta | ✅ |
| `menu.noMatch` | No dishes match. | Kāore he kai e tau ana. | ✅ |
| `menu.stub` | Full menu coming soon. | Kei te haere mai te tahua kai katoa. | ✅ |
| `menu.stubCall` | Full menu coming soon — call ahead to order in the meantime. | Kei te haere mai te tahua kai katoa — waea atu ki te ōta i te wā nei. | ✅ ("in the meantime" softened to "right now" — acceptable). |

### Recipe screens (Cook at Home)

| Key | English | Te reo | Verdict |
|---|---|---|---|
| `recipe.loading` | Loading recipe… | E uta ana te tohutao… | ✅ |
| `recipe.stub` | Recipes coming soon. | Kei te haere mai ngā tohutao. | ✅ |
| `recipe.ingredients` | Ingredients | Ngā huānga | ✅ *huānga* = ingredient/component. |
| `recipe.method` | Method | Te tukanga | ✅ *tukanga* = process. |
| `recipe.detail` | Ingredients & method | Ngā huānga me te tukanga | ✅ |

### Language-option labels (`settings-ui.js`)

| String | Verdict |
|---|---|
| "English" / "Te Reo Māori" | ✅ correct — macron on *Māori* present. |

## The two strings waves 3–4 added (explicitly re-reviewed)

- **Profiles switcher chrome** (`profile.*`, 8 keys): 6 ✅, 2 🤔 (`profile.choose`,
  `profile.browsingAs`). Names remain user content — never translated (verified
  in the code and comments).
- **`rating.our` ("Our rating", draft):** 🤔 flagged — see table. Its sibling
  `rating.your` ("Your rating") has **no** MI entry and correctly falls through
  to English.

## Safety boundary — verified

✅ No allergen/dietary/safety-load-bearing string is translated. The allergen &
dietary **tag chips** and **filter chip labels**, the refresh caveat, allergy
framing, privacy note, and error prose all stay English by falling through (no
key in `MI`). Only neutral chrome (the *landmark* aria-label `menu.diet.aria`)
is translated, which is not safety content. The boundary is now **commented at
the head of the `MI` table** in `reo.js` so future additions respect it.

## Coverage notes (not defects — the fall-through design is safe)

- `menu.branches` ("All branches") and `rating.your` ("Your rating") are used
  with `data-i18n` / `t()` but have **no** `MI` entry, so they render English.
  Fine by design (partial coverage is always safe); listed here so a future
  coverage pass can pick them up if desired.

## Verification

`python3 tools/validate.py` ✅ · `check_no_deps.py` ✅ · `gen_sbom.py --check` ✅
· `node --test` ✅ (239 pass) · `node --check site/js/reo.js` ✅.
**Not** browser-exercised (no headless browser here): the per-part `lang="mi"`
stamping and switch-back are logic-/syntax-verified only — worth a real
VoiceOver/TalkBack pass at mobile width before launch.
