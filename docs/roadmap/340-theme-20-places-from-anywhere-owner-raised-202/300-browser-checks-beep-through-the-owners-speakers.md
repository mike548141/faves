- [x] **The browser checks beep through the owner's speakers** `[S][tools]`
  — owner-raised 2026-09-28: *"my laptop beeping away when you are working
  … The beeping is annoying, a test should be run when the code it relates
  to has changed."*
  ✅ **DONE 2026-09-28 (session `40d6dea4`).** Verified: the launched Chrome
  carries `--mute-audio`, and `cook_check` passed 85/85 muted, including
  all eight sound assertions (tone, buzz, bell, read-aloud start and stop).
  📌 **CLAIMED 2026-09-27 (session `40d6dea4`)** — inline.
  (claimed 2026-09-27-2051, wt: main)

  **Cause.** `cook_check.mjs` deliberately drives the REAL alarm (Web
  Audio oscillators) and the REAL read-aloud (`speechSynthesis`), wrapping
  them to count calls. Its header assumes a "null sink"; headless Chrome on
  macOS plays both through the laptop's speakers. `tools/lib/browser.mjs`
  launched Chrome with no `--mute-audio`, so every run of a sound-making
  check was audible.

  **Fix.** `launchChrome` passes `--mute-audio` unless `FAVES_AUDIO=1`.
  The audio APIs still run, so the assertions still count real calls; only
  the output is silenced.

  **The other half of the owner's point — run a check when its code
  changed.** Only `cook_check` makes sound. The verify list already scopes
  it ("run it after touching `cook.js`, `cook-ui.js` …"), and in session
  `40d6dea4` it ran twice: once by the recipe-notes worker, which did touch
  `cook-ui.js`, and once to prove this fix. Scoping was mostly honoured, so
  the durable answer is silence, not more discipline. Five parallel
  sessions each running it for their own changes would still add up.
