## 2026-08-16 11:04 UTC — cross-device sync: the design was wrong, and the code said so

**Owner-directed mid-session**: *"start with work that enables device syncing of
user data… so my iphone and laptop show the same favourites, ratings etc."* That
is Theme 9 **v2** (continual sync), not v1's transfer link, which shipped
2026-08-09. Worktree `faves-sync-client`, branch `sync-client`; claimed on `main`
before any work, and the claim said in writing what it did **not** cover.

### What was taken, and what was deliberately left

**The Worker was not built and not claimed.** Standing up a Cloudflare Worker +
KV namespace is a new trust surface and ADR 0017 marks v2 ⚑ the owner's go — the
direction to start sync is not the same as authority to stand up a backend. ADR
0017's own build shape says to build the **claim-agnostic store first** anyway,
so the client half is the right thing to take alone. The claim line names the
split so a peer session can take the backend without asking.

### 🔎 The finding was bigger than the item: ADR 0017's merge bullet is wrong

It looked like transcription — 0017 had designed this in July and named the merge
rules. **Both halves are wrong against the code as it actually stands**, and
neither is visible until you try to write the function.

- *"Union hearts"* makes **un-hearting impossible**. `favourites.merge()` never
  removes — by design, and its own docstring says so, because it was built to
  receive a shared shortlist. Applied continually: device A drops a heart, B
  still has it, the next pull restores it on A, forever, from any device.
- *"Last-write-wins per scalar"* is **unimplementable**. Nothing in the personal
  layer carries a timestamp — not favourites, not ratings, not settings, not the
  profile registry, verified across all five modules. There is no write time.

The root of it: 0017 reached for the import path (*"reuse Theme 12's collector"*).
The **collector** half of that is right; the **applier** half is not. Import runs
once, watched, one-way, and `applyPersonalData` is additive on purpose. Sync runs
unattended, continually, and **symmetrically** — both devices run the same code
against each other. Same bytes, different problem.

**The fix costs no schema change** (ADR 0060): keep the snapshot the two devices
last agreed on and diff both sides against it. A one-sided absence is then a
*deletion* when base held it and an *addition* when it did not — the one
distinction the additive path cannot make. Tombstones and per-entry timestamps
both lose to it, because the base snapshot was going to have to be kept anyway.

### 🔎 Symmetry outranks any individual tie-break, and order is part of it

The non-obvious half. Both ends run the same merge, so *"prefer theirs"* — the
natural reading of a pull — has each device take the other's value and the pair
**swaps forever**. Every tie-break here is therefore a function of the values
alone. Caught a second instance of the same shape mid-build: two devices agreeing
on the *set* of hearts but not the array **order** serialise to different JSON, so
each pull sees a changed blob and pushes a new one indefinitely — against the one
resource ADR 0017 names as scarce (KV writes, 1k/day free). Order is now a
function of the inputs too. **An asymmetric merge passes every one-directional
test and only fails in the field**, which is why the suite asserts `merge(a,b) ==
merge(b,a)` on every branch rather than trusting the reading.

### Two shipped bugs found on the way, neither of them the object of the search

1. **A transfer link destroyed the "follow me" localisation preference.**
   `activeSlice()` sent `settings.get()`, which resolves `lang`/`units` `"local"`
   to the **sending** device's current answer. A link made in Wellington carried
   hard `"en"`/`"metric"` and the receiver's follow-me preference (ADR 0045, 0029)
   was permanently replaced by a snapshot of where the sender stood. Worst on
   transfer-to-a-new-device — the primary use — because a new profile is written
   whole.
2. **A merge import silently dropped `units` and `currency`.** The settings patch
   was a hardcoded four-field list written before either setting existed. A
   *new*-profile import restored them, which is exactly why nobody saw it. Now
   derived from the settings module's own defaults.

🚩 **Both are the same failure**: a whitelist and a resolved-value read, each
correct when written and each silently rotted when a later ADR added a field.
`sync-merge.js` derives its field list for that reason and says so at the site.

### Verification

825 tests green (26 new). `boot_check` 15/15, `device_check` 20/20, `cook_check`
42/42. Every python gate clean; version lockstep confirmed with the `--range`
form, not the bare one. **The merge suite was verified by breaking it** —
reintroducing the additive rule failed exactly the two deletion tests and nothing
else.

### 🎯 Left with the owner (both in ADR 0060)

- **`sync-merge.js` ships before anything imports it**, because the repo enforces
  that every module under `site/js/` is precached — 5.9 KB gzipped on every phone
  for a feature that is not yet reachable. Taken deliberately; reversible in one
  commit.
- **His Reset ruling cannot be met as stated.** He ruled this morning that a
  propagating reset must *"name the number of devices it will reach"*. Under ADR
  0017 the server is a dumb ciphertext store and every device shares one bearer
  code, so **it cannot count devices**, and asking the Worker to log it is the
  tracking the design refuses. A roster inside the blob is the only home, and a
  device that syncs once and is never opened again never leaves it — so the number
  is an **upper bound, not a count**. A confidently wrong number on a destructive
  confirmation is worse than no number.

### 🔎 Unrelated, noticed and not fixed (not this session's lane)

`pathscan` reports 4 findings on `.claude/worktrees`, a **gitignored** path that
by construction cannot exist in a checkout. It is warn-only and pre-existing, so
it fires on every commit and resolves on none — the decorative-guard shape again.
Left for whoever owns the scanner item (ROADMAP Theme 33).

---

