// "Pick for us" — the party trick for deadlocked groups (Phase 4).
// Shuffles through the *currently filtered* set with a quick
// name-flicker, lands on one, then offers "go again" / "that's the
// one". With prefers-reduced-motion the result is instant.

import { t } from "./reo.js";
import { el } from "./dom.js";
import { wireDialog } from "./dialog.js";

const SERVICE_LABEL = { "dine-in": "Dine-in", takeaway: "Takeaway" };
// Guarded so the pure helpers below import cleanly under `node --test` (no
// window). In the browser this resolves to the real media-query list.
const REDUCED =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
const rand = (n) => Math.floor(Math.random() * n);

// A favourite counts this many times in the draw — a gentle thumb on the
// scale toward "the usual", not a hard win (a non-favourite can still land, so
// the shuffle stays a genuine surprise). Kept small on purpose.
export const FAV_WEIGHT = 3;

/**
 * Weighted random pick: `isFav(item)` truthy items count `FAV_WEIGHT` times,
 * everyone else once. `rnd()` returns a float in [0, 1) (injectable for tests).
 * Pure — no DOM, no globals. Returns undefined only for an empty list.
 */
export function weightedPick(items, isFav = () => false, rnd = Math.random) {
  if (!items.length) return undefined;
  const total = items.reduce((sum, it) => sum + (isFav(it) ? FAV_WEIGHT : 1), 0);
  let n = rnd() * total;
  for (const it of items) {
    n -= isFav(it) ? FAV_WEIGHT : 1;
    if (n < 0) return it;
  }
  return items[items.length - 1]; // float guard: fall through to the last
}

function metaText(r) {
  if (r.kind === "recipes") {
    const n = (r.menu || []).reduce((sum, s) => sum + (s.items?.length || 0), 0);
    return n ? `Cook at home · ${n} recipe${n === 1 ? "" : "s"}` : "Cook at home";
  }
  const services = (r.services || []).map((s) => SERVICE_LABEL[s] || s).join(", ");
  return [r.area, services].filter(Boolean).join(" · ");
}

function chips(r) {
  const row = el("div", { className: "chip-row picker-chips" });
  if (r.kind === "recipes") {
    row.append(el("span", { className: "chip chip-recipes", textContent: "🏠 Recipes" }));
  } else {
    for (const c of r.cuisine || []) {
      row.append(el("span", { className: "chip chip-cuisine", textContent: c }));
    }
  }
  if (r.status === "stub") {
    row.append(el("span", { className: "chip chip-status", textContent: "Menu coming soon" }));
  }
  return row;
}

/**
 * Wire up the picker. `getCandidates` returns the currently filtered
 * restaurant list — the shuffle always respects the filter bar (including
 * the "Cheap eats" and "Open now" toggles). `isFavourite(r)` (optional) lets
 * the draw lean toward hearted places — "favour the usual" without ever
 * excluding the rest.
 */
export function initPicker(getCandidates, isFavourite = () => false) {
  const pickBtn = document.getElementById("pick-btn"); // floats bottom-right again (owner, 2026-08-16)
  const dialog = document.getElementById("picker");
  if (!pickBtn || !dialog || typeof dialog.showModal !== "function") return;

  // Tuck the button away as you scroll DOWN, bring it back as you scroll up.
  // Owner, 2026-08-16: "make it hide when you scroll down". Direction, not
  // depth — a button that vanishes past a fixed offset is gone exactly when a
  // long list makes it most useful, whereas one that returns on the way back up
  // is there the moment you stop reading and start choosing.
  //
  // rAF-throttled like to-top.js, so a fast flick coalesces to one read+write
  // per frame. The 8px deadband stops the elastic overscroll at the top of iOS
  // from flapping it.
  let lastY = window.scrollY;
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const dy = y - lastY;
      if (Math.abs(dy) < 8) return;
      lastY = y;
      // Never tuck it near the top: that is where someone who has just landed
      // and wants a suggestion actually is.
      pickBtn.classList.toggle("is-tucked", dy > 0 && y > 120);
    });
  }
  addEventListener("scroll", onScroll, { passive: true });

  const inner = dialog.querySelector(".picker-inner");
  const dice = document.getElementById("picker-dice");
  const cycleEl = document.getElementById("picker-cycle");
  const resultEl = document.getElementById("picker-result");
  const actionsEl = document.getElementById("picker-actions");
  const goEl = document.getElementById("picker-go");
  const againBtn = document.getElementById("picker-again");
  const closeBtn = document.getElementById("picker-close");

  let timer = null;
  const stop = () => {
    clearTimeout(timer);
    timer = null;
    dice.classList.remove("rolling");
  };

  function showResult(pick) {
    stop();
    dice.textContent = "🎉";
    cycleEl.hidden = true;
    cycleEl.textContent = "";
    // Name it when the roll lands on a favourite, so the "favour the usual"
    // weighting is visible rather than a silent thumb on the scale.
    const fave = isFavourite(pick)
      ? el("p", { className: "picker-fave-note", textContent: t("pick.usual", "♥ one of your usuals") })
      : null;
    resultEl.replaceChildren(
      el("p", { className: "picker-eyebrow", textContent: t("pick.eyebrow", "Tonight it’s…") }),
      el("h3", { className: "picker-name", textContent: pick.name }),
      el("p", { className: "picker-meta", textContent: metaText(pick) }),
      fave,
      chips(pick)
    );
    goEl.href = `restaurant.html?id=${pick.id}`;
    actionsEl.hidden = false;
    goEl.focus({ preventScroll: true });
  }

  function showEmpty() {
    stop();
    dice.textContent = "🤷";
    cycleEl.hidden = true;
    resultEl.replaceChildren(
      el("p", {
        className: "picker-meta",
        textContent: t("pick.empty", "Nothing matches those filters — widen them and roll again."),
      })
    );
    actionsEl.hidden = true;
  }

  function shuffle() {
    stop();
    resultEl.replaceChildren();
    actionsEl.hidden = true;
    dice.textContent = "🎲";

    const candidates = getCandidates();
    if (!candidates.length) return showEmpty();

    // The landing pick leans toward favourites; the flicker below still cycles
    // every candidate's name, so the animation shows the full set fairly.
    const finalPick = weightedPick(candidates, isFavourite);
    if (candidates.length === 1 || REDUCED.matches) return showResult(finalPick);

    dice.classList.add("rolling");
    cycleEl.hidden = false;
    let delay = 55;
    let last = null;
    const spin = () => {
      // Ease out: each flick lingers a little longer, then we land.
      if (delay > 330) return showResult(finalPick);
      let name = candidates[rand(candidates.length)].name;
      if (name === last) name = finalPick.name;
      last = name;
      cycleEl.textContent = name;
      delay *= 1.17;
      timer = setTimeout(spin, delay);
    };
    spin();
  }

  pickBtn.addEventListener("click", () => {
    dialog.showModal();
    shuffle();
  });
  againBtn.addEventListener("click", shuffle);
  dialog.addEventListener("close", stop);
  // ✕ + backdrop (a click outside .picker-inner) close; Escape is native.
  wireDialog(dialog, { closeBtn, inner });

  // The scroll-tuck that used to live here is gone with the FAB it hid. "Pick
  // for us" is a control in the bottom bar now, and `main`'s padding-bottom
  // reserves the bar's band, so it can no longer cover the list — which is what
  // the tuck existed to undo. Measured before removing it: as a FAB it covered
  // 48 × 30.3 px of a venue's heart on the landing screen, 63 % of a 48 px
  // control, and the tuck did not fire until scrollY > 160.
  //
  // It also takes a bug class with it: `.is-tucked` was only ever cleared by a
  // scroll event, so leaving search could restore the FAB still translated
  // off-screen, and a MutationObserver on body's class had to be added to fix
  // it. Nothing here should tuck the bar.
  //
  // The bar DOES now shrink on scroll — owner's ruling 2026-08-16, after living
  // with a bar that was 69.8 px at every scroll depth, and having been offered a
  // tuck instead. That lives in `bar-shrink.js`, not here: it is a property of
  // the bar, not of the shuffle, and it never hides a control, so the hole above
  // stays shut. Read that module's header before touching it — it explains how
  // it avoids the stranded-state trap rather than papering over it.
}
