- [x] **32c — system events, wired to what already computes them** `[S][js]`

  (claimed 2026-11-23-1422, session f9ee6733, worktree faves-qr-f9ee-events)

`versions.js` / `sw-update.js` / `cache-refresh.js` already know when the shell
or data version moved and when a refresh was taken. Emit on those transitions.
Nothing new to detect; the work is not throwing the fact away.

  ✅ **Done 2026-11-23 (queue run f9ee6733).** Three kinds emit, all from the
  closed vocabulary 32a already held (`data.updated`, `app.updated`,
  `cache.refreshed`); no kind or schema was added.
  - `site/js/system-events.js` (new): `observeVersions()` asks the CONTROLLING
    worker for its own stamps (`versions.js` `askController`, never the
    cache-name fallback, which under a waiting worker names the update that has
    not taken over) and `noteVersions()` logs `app.updated` (shell stamp) and
    `data.updated` (data generation, the 510/030 fingerprint; there is no
    `DATA_VERSION` any more) as from/to against a remembered baseline. Called
    from `sw-register.js` on every load and on `controllerchange`.
  - `cache.refreshed`: `forceRefresh` gained an injected `onRefreshed` hook,
    called after the caches are cleared and before the reload; `settings-ui.js`
    passes `noteRefreshed`. The hook is injected because `cache-refresh.js` is
    forbidden storage (its own test reads the source), and a throwing hook
    cannot stop the reload.
  - Once per transition: no baseline, an empty stamp, or a stamp the worker
    could not give logs nothing and keeps the old one; the stamp is written
    after the event, and an immediate repeat (failed write, a second tab) is
    refused by the log's own last entry of that kind.
  - 🔑 **The item said "nothing new to detect", and that held for the stamps but
    not for the baseline**: a transition needs the last stamp seen, and nothing
    kept one. `faves.seen-versions.v1` is that, device-level and classified in
    both tables a new store must be walked through: `personal-data.js`
    `EXCLUDED` (`spare: true`: not in the backup's `other` bag or sync, not
    restored or wiped by import) and `tests/erase.test.js` (wiped by Delete
    everything; the next load re-seeds it silently).
  - Evidence: `tests/system-events.test.js` (22 cases; break-probed by removing
    the `EXCLUDED` entry, failing the two whitelist cases, and the dedupe,
    failing the two repeat cases); `tools/fetch_check.mjs` gained two checks in
    a real browser with a real service worker, 19 passed: one `data.updated`
    naming the install's generation and the switched one, none on a second load.
    `node tools/boot_check.mjs` 38 passed. SHELL_VERSION 2026-11-18.1 to
    2026-11-24.1.
  - Limits, said plainly. `app.updated` and `cache.refreshed` are proven by unit
    tests only; no browser check drives a shell-version change or the Settings
    refresh button. An entry's time is when a page first NOTICED the change (the
    next load; a menu update during a resumed session shows on the next screen),
    and it lands in the active person's log only, like every entry. No
    user-visible change until 32b ships the screen, so no CHANGELOG line.
