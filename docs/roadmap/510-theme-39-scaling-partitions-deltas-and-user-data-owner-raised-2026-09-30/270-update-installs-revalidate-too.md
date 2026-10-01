- [~] 🎯 **Should an update install revalidate too?** `[S] [pwa][sw]` —
      found 2026-10-01 by the `170` worker (session `faves-55`). **Waits on
      the owner:** his `170` ruling covered the first install only.

  `precache_check` §4 shows `cache: "no-cache"` equally safe for an update:
  106 of 107 files come back as 304 and the new cache holds the current
  bytes. That would save most of the shell download on every
  `SHELL_VERSION` bump, for every installed phone. It rests on Pages'
  ETag changing with the bytes, which is inferred, not watched across a
  real deploy, so the build should first record two deploys' ETags.

  ⚖️ **Owner-ruled 2026-10-01 (`faves-55`): yes, after an ETag check.**
  First show, against real deploys, that Pages' ETag changes when a file's
  bytes change and stays put when they don't. Then ship `no-cache` for
  update installs, with an ADR superseding the matching part of 0149.
  📌 **Claimed 2026-10-01 (`faves-55`).**
