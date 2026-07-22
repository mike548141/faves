// Ratings UI — the personal 1–3 rating control and the static curated badge.
// The store (ratings.js) is DOM-free and unit-tested; this is presentation.
//
// TWO DISTINCT MARKS, kept visually apart on purpose (see ADR 0013):
//   • Personal — an interactive ☆☆☆ control the viewer taps to set their own
//     1–3 mark. It is *their* unverified opinion, so it reads differently from
//     our curation (same principle as the personal-tags design note).
//   • Curated — a static, non-interactive "Our rating ★★☆" badge rendered from
//     the optional `rating` field in the repo data. Ours, verified, read-only.
//
// KEYBOARD + SCREEN READER. The personal control is a group of three real
// <button> toggles: each is Tab-focusable and Enter/Space-operable with no
// custom key handling, and carries an interpolated aria-label ("Rate 2 —
// Great"). aria-pressed reflects the *filled* state (value ≥ n), mirroring the
// visual fill. A visually-hidden aria-live region announces the new summary
// ("Your rating: 2 of 3" / "No personal rating") on every change. Clearing is
// its own discoverable ✕ button (shown only once a rating exists) rather than a
// hard-to-find "tap the active star again", so the star taps stay predictable.
// Interpolated aria-labels stay English by the same rule reo.js applies to
// "Serves 4" etc.; the one whole-string visible label ("Our rating") is
// data-i18n so translate() can swap it.

import { ratings, clampRating, MIN, MAX } from "./ratings.js";
import { el } from "./dom.js";
import { t } from "./reo.js";

// 1–3 meaning, matched across personal + curated. Honest and light-touch.
const SCALE_LABEL = { 1: "Good", 2: "Great", 3: "Best" };

const starGlyph = (filled) => (filled ? "★" : "☆");

/**
 * An interactive personal rating control for one `entry`
 * ({ type, venueId, venueName, name? }). `thing` names it for the accessible
 * label. Self-updating: subscribes to the shared store so every control for the
 * same thing (and a cross-tab change) stays in sync.
 */
export function ratingControl(entry, thing) {
  const name = thing || entry.name || entry.venueName || "this";
  const group = el("div", { className: "rating", role: "group" });
  group.setAttribute("aria-label", `${t("rating.your", "Your rating")} — ${name}`);

  const stars = [];
  for (let n = MIN; n <= MAX; n++) {
    const btn = el("button", { type: "button", className: "rating-star" });
    btn.dataset.value = String(n);
    btn.setAttribute("aria-label", `Rate ${n} — ${SCALE_LABEL[n]}`);
    btn.addEventListener("click", (e) => {
      // These often sit in a row that is itself a link (a recipe dish name);
      // don't navigate or bubble when the user is just setting a rating.
      e.preventDefault();
      e.stopPropagation();
      ratings.set(entry, n);
    });
    stars.push(btn);
    group.append(btn);
  }

  const clearBtn = el("button", { type: "button", className: "rating-clear", hidden: true });
  clearBtn.setAttribute("aria-label", `Clear your rating — ${name}`);
  clearBtn.append(el("span", { "aria-hidden": "true", textContent: "✕" }));
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    ratings.clear(entry);
  });
  group.append(clearBtn);

  // Polite live summary so a screen reader hears the new state on change.
  const live = el("span", { className: "sr-only", "aria-live": "polite" });
  group.append(live);

  function render() {
    const val = ratings.get(entry);
    for (const btn of stars) {
      const n = Number(btn.dataset.value);
      const filled = val >= n;
      btn.textContent = starGlyph(filled);
      btn.setAttribute("aria-pressed", String(filled));
    }
    clearBtn.hidden = val === 0;
    live.textContent = val
      ? `Your rating: ${val} of ${MAX}`
      : "No personal rating";
  }

  render();
  ratings.subscribe(render); // control lives for the page; no teardown needed
  return group;
}

/**
 * A static, non-interactive curated household rating badge for `value` (1..3),
 * or null when there's nothing to show. Rendered from the repo data's optional
 * `rating` field — ours, verified, read-only — and styled distinctly from the
 * personal control so the two never read as the same mark.
 */
export function curatedRating(value) {
  const v = clampRating(value);
  if (!v) return null;
  const badge = el("span", { className: "rating-curated", role: "img" });
  badge.setAttribute("aria-label", `Our rating: ${v} of ${MAX}`);
  badge.append(
    el("span", {
      className: "rating-curated-label",
      "aria-hidden": "true",
      "data-i18n": "rating.our",
      textContent: "Our rating",
    }),
    el("span", {
      className: "rating-curated-stars",
      "aria-hidden": "true",
      textContent: starGlyph(true).repeat(v) + starGlyph(false).repeat(MAX - v),
    })
  );
  return badge;
}
