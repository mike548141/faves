# 2026-11-18 0420 UTC — a recipe's photo opens the recipe; the viewer moves to the recipe page

**Owner ask, 2026-11-18, verbatim:** *"When I click on the photo/image it should
do the same thing as clicking on the title of the recipe i.e. it should open the
recipe. But this feature would be good to have when you are on the recipe page
… and you click on the image should them show a larger version of the image as
this does on the recipe list page today"*. Interactive session, primary checkout,
alone on the machine per `cclive`.

## What changed

- `site/js/photo-viewer.js` (new, precached): the lightbox, moved out of
  `menu.js` unchanged so `recipe.js` can open it without importing the menu.
- `menu.js`: `dishPhoto(item, href)`. Where the row has a page (a recipe — the
  same `itemPage && collectionId` test that makes the title a link), the
  thumbnail is an `<a>` to the title's href, `tabIndex -1` and `aria-hidden`
  because the title is the same link one stop later. A restaurant dish keeps
  the viewer button — read as outside the ask, which named the recipe list.
- `recipe.js`: the hero `<img>` is wrapped in a `.recipe-photo-btn` that opens
  the viewer. Worth it beyond the ask: the hero is `object-fit: cover`, so the
  viewer is the only place the whole picture shows.
- `app.css`: pointer cursor on the link thumbnail; the hero button's reset.
- `SHELL_VERSION` 2026-11-16.1 → 2026-11-18.1.

## Verified

`node --test` 2020/2020 · `boot_check` 38/0 · `recipe_check` 86/0 ·
`to_top_check` 142/0 · `check_precache`, `check_versions`, `check_no_deps`,
`gen_sbom --check`, `validate` clean. A throwaway CDP probe (not kept) asserted
11 behaviours: list thumbnail is a link with the title's href, out of the tab
order, no viewer button left on the Cook at Home list, a tap lands on
`recipe.html`, the hero tap opens the viewer on the same `src`, ✕ closes it,
and a McDonald's photo is still a viewer button that opens. Screenshots at 390
and 1280 px: hero layout unchanged.

🔎 **Not guarded by a kept check.** None of the 19 browser checks asserts what
a photo tap does; the probe was deleted. Filing a guard was judged not worth a
new check for a two-line behaviour, said here so it is a choice, not a gap.
