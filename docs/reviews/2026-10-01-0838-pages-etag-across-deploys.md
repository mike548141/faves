# Does Cloudflare Pages' ETag track the bytes?

Evidence for roadmap `510/270`, 2026-10-01 (session `faves-55`). The owner's
gate: before an **update** install may revalidate the shell with
`cache: "no-cache"`, show against real deploys that Pages' ETag changes when a
file's bytes change and stays the same when they don't. Decided in
[ADR 0150](../decisions/0150-update-installs-revalidate-the-shell-too.md).

## The answer

✅ **Yes. The ETag follows the bytes exactly.** Across production and four
earlier Pages deploys, **no changed file kept its ETag and no unchanged file
lost it.** The ETag does not depend on the deploy, and the production custom
domain sends the same ETag as the `pages.dev` deploys for the same bytes. So
the saving is real as well as safe.

| Pairs compared (per file, every pair of deploys) | Count |
|---|---|
| same bytes, same ETag (a 304 is possible: **the saving**) | **968** |
| different bytes, different ETag (new bytes are sent: **the safety**) | **114** |
| same bytes, different ETag (safe, but no saving) | **0** |
| different bytes, **same** ETag (🛑 unsafe: a 304 would keep old bytes) | **0** |
| a file with no ETag on one side (HTML, or a file one deploy lacked) | 48 |

There are 137 distinct (file, ETag) pairs across the five deploys, and **none
of them names two different bodies.**

## The deploys

Each Pages deploy keeps its own permanent URL, `<hash>.faves.pages.dev`. Each
one is a real deploy of this project, and its bytes never change afterwards.
Every body read was checked against `git show <commit>:site/<path>`. All of
them matched, except two files the oldest deploy did not have, which came back
as Pages' HTML stand-in with no ETag. So each deploy below is the commit it
claims to be.

| Deploy | Commit | `SHELL_VERSION` | Shell files that differ from production |
|---|---|---|---|
| `https://lets-eat.myspot.nz` (production) | `ac9ea6f` | `2026-10-01.12` | — |
| `https://d542a23f.faves.pages.dev` (PR #70) | `7bfadd4` | `2026-10-01.12` | 0 |
| `https://86d62ffa.faves.pages.dev` (PR #69) | `02b7123` | `2026-10-01.11` | 1 (`sw.js`) |
| `https://7d5885e2.faves.pages.dev` (PR #63) | `9d989cd` | `2026-10-01.6` | 8 |
| `https://ec4b049a.faves.pages.dev` (PR #59) | `8829f9d` | `2026-10-01.2` | 23 |

The set of files is `site/sw.js`'s `SHELL` list (112 paths) plus `sw.js`
itself. Each one was fetched uncompressed, following Pages' 308 redirects.

## Production through its own deploy, and this PR's deploy

The best data point was not planned. **Production redeployed between two
surveys of the same hostname.** At 08:17 UTC it served `ac9ea6f`, with
`SHELL_VERSION` `.12`. By 08:50 UTC it served `32a7292`, with `.15`, and every
body was checked against that commit. The same URLs, before and after a real
production deploy:

| `https://lets-eat.myspot.nz`, 08:17 → 08:50 UTC | Count |
|---|---|
| unchanged bytes, unchanged ETag | **104** |
| changed bytes, new ETag (`css/app.css`, `js/app.js`, `js/favourites.js`, `js/favourites-ui.js`) | **4** |
| unchanged bytes, new ETag | 0 |
| **changed bytes, unchanged ETag** | **0** |

After that deploy, sending `app.js`'s pre-deploy ETag
(`"5102af9e…"`) got **200, 73,828 B**. Sending the new ETag (`"a6543172…"`)
got **304, 0 B**. This is exactly what an installed phone's update install
will do.

Then this PR's own deploy (`https://5b864cb1.faves.pages.dev`, commit
`23f2c04`) was added as a sixth deploy. The survey was run again across all
six: **1,452** same/same and **173** diff/diff, with **0** in either unsafe or
wasteful column, and 143 distinct (file, ETag) pairs, none naming two bodies.
Against production, the PR deploy differs in `sw.js` alone, and that is the one
`diff/diff` row.

## How it was measured: two independent instruments

1. **`curl` and `shasum`** (a throwaway script, not committed): one GET per
   path for the ETag and a SHA-256 of the body, plus a second GET asking for
   `br, gzip` to record the ETag a browser actually sees. Compared in Python.
2. **`tools/etag_survey.py`** (committed, so anyone can run it again): the same
   measurement in Python's standard library. It also sends each file's own
   ETag back as `If-None-Match`.

Both gave the same table. The only difference is the extra `sw.js` row, which
the `curl` run left out.

```
python3 tools/etag_survey.py https://lets-eat.myspot.nz \
  https://d542a23f.faves.pages.dev https://86d62ffa.faves.pages.dev \
  https://7d5885e2.faves.pages.dev https://ec4b049a.faves.pages.dev
```

**The tool was break-probed** against a local server that tells lies:

| Server | Expected | Got |
|---|---|---|
| changes `js/app.js` and keeps its ETag | exit 1, `diff/SAME` | ✅ exit 1, two `✗` lines naming `js/app.js` |
| changes `js/app.js` and gives it a new ETag | exit 0, one `diff/diff` | ✅ exit 0 |
| a new ETag on every deploy, bytes unchanged | exit 0, warns "no saving" | ✅ exit 0, `same/DIFF` 113, ⚠ line |

A server that never answers 304 would also fail it, but that case was not
probed.

## Conditional requests on production

Run against `js/app.js` on `https://lets-eat.myspot.nz`. The "old" ETag below
is `app.js`'s ETag from the PR #63 deploy, which had different bytes.

| `If-None-Match` sent | `identity` | `br, gzip` |
|---|---|---|
| the current ETag, strong | 304, 0 B | 304, 0 B |
| the current ETag, `W/` | 304, 0 B | 304, 0 B |
| the old ETag, strong | **200, 74,364 B** | **200, 26,720 B** |
| the old ETag, `W/` | **200, 74,364 B** | **200, 26,636 B** |

A file that is missing, asked with any ETag, gets a 200 with `text/html`. That
is Pages' stand-in, and the worker's `requireAsset` refuses it (ADR 0100).
**HTML gets no ETag at all** (`/`, `index.html`, `restaurant.html`,
`recipe.html`), so a revalidating install always fetches HTML whole. Every
other shell file had an ETag on every deploy, and the survey sent each one
back: **109 of 109** came back 304 on each of the four newer deploys, and
**107 of 107** on the oldest.

ETags arrive strong (`"…"`) or weak (`W/"…"`), depending on whether the edge
compressed the response. The hex part is the same either way, and
`If-None-Match` compares weakly, so the server makes the same comparison the
table does.

## 🔎 A finding for `510/260`: Pages honours `_headers`; the custom domain overrides it

The same production deploy (`SHELL_VERSION` `2026-10-01.12`, the same ETag),
fetched through two hostnames:

| Hostname | `js/app.js` `cache-control` |
|---|---|
| `https://faves.pages.dev` (the production branch on `pages.dev`) | `public, max-age=0, must-revalidate` (this is `_headers`) |
| `https://d542a23f.faves.pages.dev` (a deploy) | `public, max-age=0, must-revalidate` |
| `https://lets-eat.myspot.nz` (the custom domain) | `public, max-age=14400, must-revalidate`, `cf-cache-status: REVALIDATED` |

So the four hours do **not** come from Pages. They are added by the custom
domain's Cloudflare zone. The likely setting is the zone's Browser Cache TTL,
because 14,400 s is exactly one of its preset values. That is an inference: the
zone's configuration was not read. This narrows `510/260` to a single setting
on the zone. It does not change this item: `no-cache` asks the server whatever
the `max-age` is.

## What was NOT shown

- **A deploy mid-rollout.** The survey reads what each deploy serves once it is
  finished. An edge that briefly paired one deploy's ETag with another's bytes
  would not show up here. `reload` would be fooled by that edge too (ADR 0149).
- **Brotli bytes.** The hashes are of the uncompressed body. The compressed
  responses carried the same ETag hex (checked by the `curl` run).
- **Other browsers.** The browser half, meaning that `no-cache` really sends
  the stored ETag and keeps the stored body only on a 304, is
  `tools/precache_check.mjs` §4, in Chrome only.

## The third data point, after the merge

The `510/270` merge deploys to production. Once it is live (when
`curl -s https://lets-eat.myspot.nz/sw.js | grep SHELL_VERSION` shows the new
version), run:

```
python3 tools/etag_survey.py https://lets-eat.myspot.nz \
  https://d542a23f.faves.pages.dev https://5b864cb1.faves.pages.dev
```

**Pass:** exit 0, and the `diff/SAME` column is 0. `sw.js` must show up as
`diff/diff` against `d542a23f`. Every shell file the merge did not change must
be `same/same`, which means it kept the ETag it had before the deploy.
**Fail:** a `✗` line. If that happens, revert `SHELL_FETCH` to `"reload"` in
`site/sw.js`, bump `SHELL_VERSION`, and reopen ADR 0150.
