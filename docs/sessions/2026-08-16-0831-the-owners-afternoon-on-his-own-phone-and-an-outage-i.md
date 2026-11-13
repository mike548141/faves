## 2026-08-16 08:31 UTC — the owner's afternoon on his own phone, and an outage I caused

Second half of the branch-picker session. The owner spent it using the live site
and reporting what he found, so the work is a long run of small fixes against
real use rather than anything planned. Recording the two that were not fixes.

### 🛑 I took the service worker off `main` for about an hour

`f708c78` added `"js/bar-shrink.js"` to `sw.js`'s precache list. The file was
never committed — it belonged to the sibling session's *uncommitted* work in the
shared tree. The install handler rejects on any non-`ok` response, so the whole
install failed: **0 registrations, 6 of 81 shell entries cached, no data cache.**
Offline mode, installability and every precached menu, gone for anyone who
landed on that deploy. Found, fixed and gated by the sibling (`1ca0a6a`,
`bd9a24d`); verified here afterwards — 80 entries, none missing.

**The lesson is not "name your paths", because I did.** That commit was
`git add site/css/app.css site/js/picker.js site/sw.js`, exactly the discipline
agreed after the previous collision. It did not help, because we were both
editing the *same file*: an explicit pathspec protects you from files you never
touched and does nothing about a file you both touched, where `git add <path>`
stages their hunks with yours as one blob. The `app.css` in that commit is +223
lines and I did not write 223 lines of CSS. The rule that covers it, now in the
record above at `9732bd2`: **`git diff <path>` before `git add <path>` on any
file a live sibling might be in, and stage hunks rather than files when the diff
contains work that is not yours.**

🔎 **The part worth carrying past this repo:** `node --test` 746, `boot_check`
15/15, `validate`, `check_no_deps` and the version-lockstep check were **all
green while the deployed site had no service worker**. Five gates, none of which
read the list that mattered. That is the fourth shape this session of *a check
whose scope quietly excludes the failure it exists to prevent* — with the bare
`check_versions` all-clear, the seven unindexed ADRs, and the drift check
reading a stale `HEAD`.

### The measurement that reshaped a feature, again

ADR 0054's branch rule was written from the owner's words — "closest, and open".
Measuring the corpus first turned up that **10 of 22 branches carry no hours at
all**, so a two-state open/closed rule would have read "never captured" as
"shut" and been incapable of firing on McDonald's, the venue that prompted the
change. Three-state, with `unknown` outranking `known-closed`, is the whole
design and it exists only because the data was counted before the predicate was
written. Same pattern as the Gold Card sizes finding earlier in the day.

### What the owner's own use found that no check did

Full-bleed dish photos turning a menu into a gallery; `justify-content:
space-between` throwing opening hours to opposite edges of the desktop sidebar
and breaking "Tue–Sun" in half; a float declared after the rating starting a
line below the title; a distance dial that hides nothing until Near me has run,
with nothing on screen saying so; "Me's saved preferences" and the question it
hid (one profile, or all?). Every one shipped green. **A phone in the owner's
hand remains the highest-yield check in this repo**, and none of the four
headless harnesses is a substitute for it.

### Owed, and open

- The desktop half of the filter spec: the real controls inline under the search
  bar. Not a media query — the controls live inside a `<dialog>` and a closed
  dialog cannot render its children on the page, so they must be lifted into a
  container that is inline when wide and slotted into the sheet when narrow.
- The overlap sweep: the Order pill floating over the list, `.to-top` covering
  69.4% of a venue's heart at 390 px, and the `Faves` wordmark at 81.7 × 31.9 px
  under the 44 px floor. Measured by the sibling this session — cite, do not
  re-take.
- Two owner decisions: whether Reset should destroy everything rather than one
  profile's preferences, and what "reset" means once sync (Theme 9) exists.

