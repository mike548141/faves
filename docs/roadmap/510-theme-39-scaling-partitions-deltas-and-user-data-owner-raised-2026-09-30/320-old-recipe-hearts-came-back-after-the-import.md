- [~] 🔥 **Old hearts on the moved recipes came back after the import**
      `[S] [sync][data]` — seen by the owner 2026-10-01 at 21:50 NZDT
      (session `faves-55`), on his laptop's Favourites screen.

  **Evidence.** At 21:13–21:15 his phone and laptop both showed the import
  correct: 16 places, 53 dishes, and the five moved recipes hearted only
  under their `u:` ids. At 21:50 the laptop showed 15 places, 60 dishes,
  "4 not on your current list", and at least one old heart (Chocolate
  Self-Saucing Pudding on its old `cook-at-home` id) back beside its moved
  copy. Going from 16 to 15 places is expected (`290` folded "My recipes"
  into Cook at Home). Going from 53 to 60 dishes is not. Between the two,
  PR #71 (published copies removed) and PR #73 (`290`) deployed.

  **Not yet known:** which device or tab wrote the old keys back. The
  runbook named the known window (a device edited after its last sync and
  before the export), and the `050` worker measured that it resurrects an
  old heart. Other candidates: a third device, a second open tab holding
  the old list in memory, or a sync merge path the tests do not cover.
  **First step:** reproduce with the owner's answer on devices and tabs,
  then fix the cause, not the symptom. The owner may tap Remove on the four
  in the meantime; they point at ids that no longer exist.

  📌 **Claimed 2026-10-01 (`faves-55`).**
