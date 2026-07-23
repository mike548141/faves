// Ratings UI — the personal 1–5 rating control and the static curated badge.
// The store (ratings.js) is DOM-free and unit-tested; this is presentation.
//
// TWO DISTINCT MARKS, kept visually apart on purpose (see ADR 0013):
//   • Personal — an interactive ★★★☆☆ scale the viewer taps/drags to set their
//     own 1–5 mark. It is *their* unverified opinion, so it reads differently
//     from our curation (same principle as the personal-tags design note).
//   • Curated — a static, non-interactive "Our rating ★★★★☆" badge rendered from
//     the optional `rating` field in the repo data. Ours, verified, read-only.
//
// WHY A SLIDER, NOT FIVE BUTTONS (ADR 0019). Five 44px button targets in a row
// (220px+) don't fit a 390px dish row beside the heart + Add, and read as five
// separate toggles rather than one scale. A single slider track is one 44px-tall
// target of modest width, unmistakably a 1–5 star scale, and supports the
// tap-*or*-drag gesture the owner asked for. The heart moves to the action
// cluster and the rating sits by the name (menu.js), so the two no longer read
// as one confusing pair.
//
// KEYBOARD + SCREEN READER. The track is a real `role="slider"` (Tab-focusable):
// ←/↓ step down (past 1 clears), →/↑ step up, Home/End jump to 1/5, digit keys
// 1–5 set directly, Backspace/Delete clears. `aria-valuenow`/`aria-valuetext`
// ("3 of 5 — Good" / "Not rated") announce the mark; a polite live region echoes
// each change. Clearing is also a discoverable ✕ (shown once a rating exists).
// Interpolated labels stay English by the same rule reo.js applies to "Serves
// 4"; the one whole-string visible label ("Our rating") is data-i18n.

import { ratings, clampRating, MIN, MAX } from "./ratings.js";
import { el } from "./dom.js";
import { t } from "./reo.js";

// 1–5 meaning, matched across personal + curated. Honest, light-touch gut feel.
const SCALE_LABEL = { 1: "Poor", 2: "OK", 3: "Good", 4: "Great", 5: "Best" };

const starGlyph = (filled) => (filled ? "★" : "☆");
const valueText = (val) => (val ? `${val} of ${MAX} — ${SCALE_LABEL[val]}` : "Not rated");

/**
 * An interactive personal rating control for one `entry`
 * ({ type, venueId, venueName, name? }). `thing` names it for the accessible
 * label. Self-updating: subscribes to the shared store so every control for the
 * same thing (and a cross-tab change) stays in sync.
 */
export function ratingControl(entry, thing) {
  const name = thing || entry.name || entry.venueName || "this";

  const group = el("div", { className: "rating" });

  // The star track IS the slider — the honest role for a 1–5 scale driven by
  // tap/drag/arrows. Stars are decorative (aria-hidden); the slider carries the
  // value semantics.
  const slider = el("div", { className: "rating-slider" });
  slider.tabIndex = 0;
  slider.setAttribute("role", "slider");
  slider.setAttribute("aria-label", `${t("rating.your", "Your rating")} — ${name}`);
  slider.setAttribute("aria-valuemin", "0");
  slider.setAttribute("aria-valuemax", String(MAX));

  const stars = [];
  for (let n = MIN; n <= MAX; n++) {
    const s = el("span", { className: "rating-star", "aria-hidden": "true" });
    stars.push(s);
    slider.append(s);
  }
  group.append(slider);

  const clearBtn = el("button", { type: "button", className: "rating-clear", hidden: true });
  clearBtn.setAttribute("aria-label", `Clear your rating — ${name}`);
  clearBtn.append(el("span", { "aria-hidden": "true", textContent: "✕" }));
  clearBtn.addEventListener("click", (e) => {
    // These often sit near a link (a recipe dish name); don't navigate/bubble.
    e.preventDefault();
    e.stopPropagation();
    ratings.clear(entry);
  });
  group.append(clearBtn);

  // Polite live summary so a screen reader hears the new state on change.
  const live = el("span", { className: "sr-only", "aria-live": "polite" });
  group.append(live);

  // Paint the stars to `show` — a transient preview during hover/drag, else the
  // committed value. Only a commit updates aria + the live region (via render).
  function paint(show) {
    for (let i = 0; i < stars.length; i++) {
      const on = show >= i + 1;
      stars[i].textContent = starGlyph(on);
      stars[i].classList.toggle("is-on", on);
    }
  }

  function render() {
    const val = ratings.get(entry);
    paint(val);
    slider.setAttribute("aria-valuenow", String(val));
    slider.setAttribute("aria-valuetext", valueText(val));
    clearBtn.hidden = val === 0;
    live.textContent = val ? `Your rating: ${val} of ${MAX}` : "No personal rating";
    group.classList.toggle("is-rated", val > 0);
  }

  // Pointer x → a 1..5 star index over the track (each star an equal slice). A
  // tap on the far left still means 1 (clamped), never 0 — clearing is explicit.
  function valueFromX(clientX) {
    const r = slider.getBoundingClientRect();
    if (r.width <= 0) return ratings.get(entry) || MIN;
    const ratio = (clientX - r.left) / r.width;
    return Math.min(MAX, Math.max(MIN, Math.ceil(ratio * MAX)));
  }

  let dragging = false;
  slider.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    try { slider.setPointerCapture(e.pointerId); } catch { /* capture optional */ }
    paint(valueFromX(e.clientX));
  });
  slider.addEventListener("pointermove", (e) => {
    // Live preview while dragging, and on mouse hover (desktop) for aim.
    if (dragging || e.pointerType === "mouse") paint(valueFromX(e.clientX));
  });
  slider.addEventListener("pointerleave", () => { if (!dragging) render(); });
  slider.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    try { slider.releasePointerCapture(e.pointerId); } catch { /* no capture */ }
    ratings.set(entry, valueFromX(e.clientX)); // commit → subscribe fires render
  });
  slider.addEventListener("pointercancel", () => { dragging = false; render(); });

  // Keyboard model: the slider is focusable and steps discretely.
  slider.addEventListener("keydown", (e) => {
    const cur = ratings.get(entry);
    let next = cur;
    switch (e.key) {
      case "ArrowRight": case "ArrowUp": next = Math.min(MAX, cur + 1); break;
      case "ArrowLeft": case "ArrowDown": next = Math.max(0, cur - 1); break; // past 1 clears
      case "Home": next = MIN; break;
      case "End": next = MAX; break;
      case "Backspace": case "Delete": next = 0; break;
      default:
        if (e.key >= "1" && e.key <= String(MAX)) next = Number(e.key);
        else return; // let other keys (Tab, etc.) through
    }
    e.preventDefault();
    ratings.set(entry, next);
  });

  render();
  ratings.subscribe(render); // control lives for the page; no teardown needed
  return group;
}

/**
 * A static, non-interactive curated household rating badge for `value` (1..5),
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
