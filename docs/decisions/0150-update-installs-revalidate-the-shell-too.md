# 0150 — Update installs revalidate the shell too

**Status:** accepted (owner-ruled 2026-10-01, `faves-55`: "yes, after an ETag
check"). Built by roadmap `510/270`.
**Date:** 2026-10-01
**Supersedes, in part:** [ADR 0149](0149-the-first-install-revalidates-the-shell.md)
decision 2, "an update install keeps `reload`". That decision had in turn
narrowed [ADR 0056](0056-a-precache-must-not-read-the-browsers-cache.md)
decision 1. Every install now fetches the shell with `cache: "no-cache"`. The
rest of 0149 stands: data keeps `reload`, and so does everything else in 0056.

## Context

ADR 0149 let a **first** install revalidate the shell rather than download it
again. In the same reproduction, `no-cache` was just as safe on an **update**:
106 of 107 shell files came back 304, and the new cache held the current
`app.js`. That would save most of the shell's download every time
`SHELL_VERSION` is bumped, on every installed phone. It was left out because
the ruling covered only the first install. Also, `no-cache` is exactly as safe
as the server's validator, and nobody had yet watched Pages' ETag across real
deploys. The owner's gate: show that it follows the bytes first.

## Evidence

[The ETag survey](../reviews/2026-10-01-0838-pages-etag-across-deploys.md)
compared production and four earlier Pages deploys
(`<hash>.faves.pages.dev`), with every body checked against its commit in git:

- **968** file pairs had the same bytes and the same ETag, and **114** had
  different bytes and a different ETag.
- **0** pairs had different bytes but the same ETag. **0** had the same bytes
  but a different ETag.
- No (file, ETag) pair named two different bodies.
- The custom domain sends the same ETag as `pages.dev` for the same bytes.
- On production, the current ETag gets a 304. An ETag from an earlier deploy
  gets a 200 with the full current file.
- HTML gets no ETag, so it is always fetched whole.

Two instruments agreed: `curl` with `shasum`, and the committed
`tools/etag_survey.py`, which was break-probed against a server that keeps a
changed file's ETag. On the browser side, `tools/precache_check.mjs` §4 now
asserts that the shipped worker's **update** holds the current `app.js`, asked
for with a conditional request that got a 200, while the unchanged files came
back 304. That was break-probed twice: a shipped `reload` fails the
revalidation rows, and a shipped `default` also fails the "holds the current
`app.js`" rows.

## Decision

1. **Every install fetches the shell with `cache: "no-cache"`** (`SHELL_FETCH`
   in `site/sw.js`). The worker no longer chooses a mode by asking whether this
   is a first install or an update.
2. **Data keeps `reload`.** A data file the phone already holds is never
   fetched, and a changed one has a new `?h=` URL that is not in the HTTP
   cache. So revalidating would only ever save bytes on `site/data/catalogue.json`,
   which is a few hundred bytes, and every data download is hash-checked anyway
   (ADR 0147). It is not worth widening the change.

## Rejected

- **Keeping `reload` for updates.** It is correct, and on this evidence it
  costs about 555 KB gzip per `SHELL_VERSION` bump per installed phone, for no
  added safety.
- **Shipping without the deploy survey.** The safety rests on the server's
  validator, and until today that rested on an inference.
- **`no-cache` for data as well.** See decision 2: the saving is a few hundred
  bytes, against touching the hash-checked sync path.

## Consequences

- **An update in which one shell file changed: 114 requests, 621 → 66 KB gzip**
  (1,703 → 225 KB raw). This was measured by `tools/chatty_check.mjs`'s new
  update scenario, and three runs agreed. The request count does not move,
  because a revalidation is still a request. What comes down whole is `sw.js`,
  the changed file, the catalogue and the four HTML files. Break-probe 4
  re-measures the `reload` figure on every run and asserts that it fails the
  budget.
- The local Pages stand-in (`startPagesServer`) now sends no ETag on HTML, as
  Pages does. This moved the cold-install figure from 1,072 to 1,085 KB gzip,
  which is inside its budget.
- 🔑 **Any change to how Pages builds its ETag changes this decision's
  safety.** If Pages ever answered 304 for bytes that had changed, an update
  would build its new shell from the previous deploy. That is the 2026-08-16
  incident by another route, and `reload` is not exposed to it. Re-run
  `tools/etag_survey.py` against two deploys whenever Pages' serving changes
  in a way anyone notices. It reads the network, so it is in no CI job.
- 🔎 Found along the way, for `510/260`: `faves.pages.dev` serves the
  production deploy with `_headers`' `max-age=0`. Only the custom domain sends
  `max-age=14400`. So the override is in the custom domain's Cloudflare zone,
  not in Pages.
