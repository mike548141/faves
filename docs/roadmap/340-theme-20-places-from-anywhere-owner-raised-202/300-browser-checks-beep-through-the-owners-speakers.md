- [~] **The browser checks beep through the owner's speakers** `[S][tools]`
  — owner-raised 2026-09-28: *"my laptop beeping away when you are working
  … The beeping is annoying, a test should be run when the code it relates
  to has changed."*
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
