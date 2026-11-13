- **2026-07-12 (Opus: ROADMAP reconciled to code — five shipped items marked
  done)**: Owner pushed back on "is that all the work you can do", rightly.
  Verified a green baseline (validate, check_no_deps, gen_sbom --check,
  node --test → 176 pass, all invariants hold). Went to build three `[S]`
  test-drive fixes — and found them, plus two `[M]` ones, **already built and
  wired** but still written as open in ROADMAP: back-to-top (`to-top.js`,
  5f5a456), share-this-app + FAB hide-on-scroll (`share-app.js` / picker
  `is-tucked`, 5f2b618), About surface (`about-ui.js`, 78a2cc4), contact-bar
  collapse (`menu.js` `.contact-bar`, f33ff42). All landed 2026-07-12; the doc
  hadn't caught up — enough drift that I nearly rebuilt two. Stamped each done
  with file + commit evidence; both test-drive sections now fully ticked.
  Swept the rest of ROADMAP for other silently-shipped work: none —
  `security.txt` (absent) and order-online logos remain genuinely open, both
  owner-gated (a security contact / brand assets + usage terms). Net: the
  buildable no-owner-input engineering was already done; remaining work needs
  owner intake or a decision. Docs only — no `site/` change, no SW bump.

