// "Pick for us" — the party trick for deadlocked groups (Phase 4).
// Shuffles through the *currently filtered* set with a quick
// name-flicker, lands on one, then offers "go again" / "that's the
// one". With prefers-reduced-motion the result is instant.

const SERVICE_LABEL = { "dine-in": "Dine-in", takeaway: "Takeaway" };
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)");
const rand = (n) => Math.floor(Math.random() * n);

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
};

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
 * Wire up the picker. `getCandidates(opts)` returns the currently filtered
 * restaurant list — the shuffle always respects the filter bar. `opts` carries
 * the in-dialog options: `{ cheapOnly }` restricts the roll to $ venues.
 */
export function initPicker(getCandidates) {
  const fab = document.getElementById("pick-btn");
  const dialog = document.getElementById("picker");
  if (!fab || !dialog || typeof dialog.showModal !== "function") return;

  const inner = dialog.querySelector(".picker-inner");
  const dice = document.getElementById("picker-dice");
  const cycleEl = document.getElementById("picker-cycle");
  const resultEl = document.getElementById("picker-result");
  const actionsEl = document.getElementById("picker-actions");
  const goEl = document.getElementById("picker-go");
  const againBtn = document.getElementById("picker-again");
  const closeBtn = document.getElementById("picker-close");
  const cheapBtn = document.getElementById("picker-cheap");

  const cheapOn = () => cheapBtn?.getAttribute("aria-pressed") === "true";

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
    resultEl.replaceChildren(
      el("p", { className: "picker-eyebrow", textContent: "Tonight it’s…" }),
      el("h3", { className: "picker-name", textContent: pick.name }),
      el("p", { className: "picker-meta", textContent: metaText(pick) }),
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
        textContent: cheapOn()
          ? "No cheap eats match those filters — turn off Cheap eats or widen them."
          : "Nothing matches those filters — widen them and roll again.",
      })
    );
    actionsEl.hidden = true;
  }

  function shuffle() {
    stop();
    resultEl.replaceChildren();
    actionsEl.hidden = true;
    dice.textContent = "🎲";

    const candidates = getCandidates({ cheapOnly: cheapOn() });
    if (!candidates.length) return showEmpty();

    const finalPick = candidates[rand(candidates.length)];
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

  fab.addEventListener("click", () => {
    dialog.showModal();
    shuffle();
  });
  againBtn.addEventListener("click", shuffle);
  // Flipping "Cheap eats" re-rolls straight away, so the change is felt.
  cheapBtn?.addEventListener("click", () => {
    cheapBtn.setAttribute("aria-pressed", cheapOn() ? "false" : "true");
    shuffle();
  });
  closeBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", stop);
  dialog.addEventListener("click", (e) => {
    // Click on the backdrop (outside the content) closes.
    if (!inner.contains(e.target)) dialog.close();
  });
}
