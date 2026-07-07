# 0001 — Zero build step, vanilla HTML/CSS/ES-modules

**Status**: accepted • **Date**: 2026-07-08 (backfilled; decided at Phase 0)

## Context

Faves holds 7–20 restaurant menus — a trivially small, mostly static
dataset. It must load instantly on a phone, work offline, and stay
alive for years with near-zero maintenance. Any future editor (a family
member, or an AI in a fresh session) should be able to change it with no
onboarding. At project start the dev machine had no JS toolchain at all.

## Decision

`site/` is the complete deployable artifact: hand-written HTML, one CSS
design system, vanilla ES-module JavaScript, and JSON data. No build
step, no bundler, no framework, no runtime CDN dependency. What's in
`site/` is what ships.

## Rejected

- **A static-site generator (Eleventy, Astro, Hugo):** adds a build
  step and a dependency tree that rots, for templating we don't need at
  this scale. The failure it removes (hand-editing HTML) is cheaper than
  the failure it adds (a toolchain that breaks between sessions).
- **An SPA framework (React, Vue, Svelte):** a runtime and build
  pipeline whose weight and complexity dwarf the data. The performance
  ceiling is *lower* than plain files, not higher.
- **CDN-hosted libraries:** external runtime requests break the
  offline-capable and no-analytics/privacy goals and add a rot vector.

## Consequences

Adding a restaurant is a data task (one JSON file), never a development
task. Nothing to install, nothing to rot, instant onboarding. The
performance ceiling is as high as the platform allows (Phase 6
Lighthouse: 97–100 across the board). Node may be used for *dev tooling*
only — Lighthouse, and JS unit tests — but never as a build or runtime
dependency; the site must run behind nothing but a static file server.
See [0002](0002-json-per-restaurant-git-as-cms.md) for the data side of
the same decision.
