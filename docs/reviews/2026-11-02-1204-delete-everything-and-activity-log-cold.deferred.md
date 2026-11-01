# Held back — angles for the activity-log and Delete-everything pass

For `2026-11-02-1204-delete-everything-and-activity-log-cold.md`. **Open only
after your own findings are durably written in the brief** (`REVIEW.md`
rule 1). Then fold this in below the verdict and delete this file.

Written by the brief-writing sub-agent (Claude Opus 5.5, of session
`2be3482c`) from the two ADRs, the commit file lists and the items' first
lines; it did not read the diffs. Hypotheses, unproven; none was driven.
Answer each: confirmed, damaged, or already covered by your finding N.

- **D1 — a sync code is a remote wipe.** Anyone who holds a group's sync
  code can post a newer marker. Does honouring it need anything beyond the
  code, and does the confirmation's warning reach the people whose devices
  will empty, or only the person pressing the button?
- **D2 — the keep-list as an exfiltration path.** The pairing survives the
  wipe. After a deletion, does the device still hold anything (the pairing,
  a cached server copy, the service worker's caches, a backup file in the
  download folder) that restores the deleted data, or lets the next person
  on the phone read it?
- **D3 — the marker's clock.** "The later id wins". Is the id ordered by a
  device clock? Can a device with a wrong clock win or lose a race it
  should not, or re-wipe a group long after?
- **D4 — "per person" on a shared phone.** Profiles share one browser
  storage. Does anything stop one profile reading another's log, by the
  backup screen, a profile switch, or devtools? Is that the threat the ADR
  means by "per person", and does it say so?
- **D5 — what the log's labels carry.** Labels are snapshotted at write
  time. Can a label (a note, a dish named by the person, a received
  shortlist from someone else) carry health or other personal detail the
  dial-only rule was written to keep out?
- **D6 — a backup file outlives a deletion.** A backup taken before
  "Delete everything" holds the log and everything else. Does the
  confirmation say so, and does a later import of that file quietly undo
  the deletion on this device, or across the group by sync?
- **D7 — the browser checks against the real Worker.** Do `sync_check` 5g
  and `tests/sync-wipe.test.js` drive the deployed Worker's code, or a
  copy that can drift from it?
- **D8 — the older-build consequence in the field.** A phone that has not
  updated writes its data back after a deletion. How long can that window
  be for an installed app that is rarely opened, and is "closed by
  updating" honest for that phone?
