// Order tally UI: a floating "order" button (shown once there's something
// in it) and a dialog that lists the running order grouped by venue, with
// subtotals, a captioned estimated total, collect mode (tick off at
// pickup), and clear. Injected into whatever page calls initOrderUI(), so
// it rides along on the home, menu and recipe screens without duplicating
// markup. The model lives in cart.js; this is purely presentation + wiring.

import { order } from "./cart.js";

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
};

const money = (n) => "$" + Number(n).toFixed(2).replace(/\.00$/, "");
const tel = (p) => "tel:" + p.replace(/\s+/g, "");
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * The + / − / count control for one dish. Bound to the shared order store
 * and self-updating, so the menu row and the dialog line always agree.
 * `meta` = { venueId, venueName, phone, name, price }.
 */
export function dishStepper(meta) {
  const wrap = el("div", { className: "stepper" });
  function render() {
    const q = order.qtyOf(meta.venueId, meta.name);
    wrap.dataset.qty = q;
    if (q === 0) {
      const add = el("button", {
        type: "button",
        className: "stepper-add",
        textContent: "＋ Add",
      });
      add.setAttribute("aria-label", `Add ${meta.name} to your order`);
      add.addEventListener("click", () => order.add(meta));
      wrap.replaceChildren(add);
    } else {
      const dec = el("button", { type: "button", className: "stepper-btn", textContent: "−" });
      dec.setAttribute("aria-label", `One fewer ${meta.name}`);
      dec.addEventListener("click", () => order.setQty(meta.venueId, meta.name, q - 1));
      const count = el("span", { className: "stepper-count", textContent: String(q) });
      const inc = el("button", { type: "button", className: "stepper-btn", textContent: "＋" });
      inc.setAttribute("aria-label", `One more ${meta.name}`);
      inc.addEventListener("click", () => order.add(meta));
      wrap.replaceChildren(dec, count, inc);
    }
  }
  render();
  order.subscribe(render);
  return wrap;
}

function lineRow(item, collectMode) {
  const price = el("span", {
    className: "order-line-price",
    textContent: item.price == null ? "—" : money(item.price * item.qty),
  });

  if (collectMode) {
    const box = el("input", { type: "checkbox", className: "order-check", checked: item.collected });
    box.addEventListener("change", () => order.toggleCollected(item.venueId, item.name));
    const label = el("label", { className: "order-collect-line" }, [
      box,
      el("span", { className: "order-line-name", textContent: `${item.qty}× ${item.name}` }),
    ]);
    const li = el("li", { className: "order-line" }, [label, price]);
    if (item.collected) li.classList.add("collected");
    return li;
  }

  return el("li", { className: "order-line" }, [
    dishStepper(item),
    el("span", { className: "order-line-name", textContent: item.name }),
    price,
  ]);
}

export function initOrderUI() {
  // Guard: only one instance per page even if two modules call this.
  if (document.querySelector(".order-fab")) return;

  const count = el("span", { className: "order-fab-count" });
  const fab = el("button", { type: "button", className: "order-fab", hidden: true }, [
    el("span", { "aria-hidden": "true", textContent: "🧾" }),
    el("span", { className: "order-fab-label", textContent: "Order" }),
    count,
  ]);

  const body = el("div", { className: "order-body" });
  const totalEl = el("span", { className: "order-total" });
  const collectBtn = el("button", { type: "button", className: "order-collect-toggle" }, [
    "Collect mode",
  ]);
  collectBtn.setAttribute("aria-pressed", "false");
  const clearBtn = el("button", { type: "button", className: "order-clear", textContent: "Clear" });

  const dialog = el("dialog", { className: "order-sheet", "aria-labelledby": "order-title" }, [
    el("div", { className: "order-inner" }, [
      el("div", { className: "order-head" }, [
        el("h2", { id: "order-title", className: "order-title", textContent: "Your order" }),
        (() => {
          const b = el("button", { type: "button", className: "order-close", textContent: "✕" });
          b.setAttribute("aria-label", "Close");
          b.addEventListener("click", () => dialog.close());
          return b;
        })(),
      ]),
      body,
      el("div", { className: "order-foot" }, [
        el("div", { className: "order-total-row" }, [
          el("span", { textContent: "Estimated total" }),
          totalEl,
        ]),
        el("p", {
          className: "order-caption",
          textContent: "Estimated from our menu — confirm at the till.",
        }),
        el("div", { className: "order-actions" }, [collectBtn, clearBtn]),
      ]),
    ]),
  ]);

  document.body.append(fab, dialog);

  let collectMode = false;
  let confirmingClear = false;

  function renderBody() {
    const groups = order.groups();
    body.replaceChildren();

    if (groups.length === 0) {
      body.append(
        el("p", {
          className: "order-empty",
          textContent: "No items yet. Tap ＋ on a dish to start your order.",
        })
      );
      return;
    }

    for (const g of groups) {
      const head = el("div", { className: "order-group-head" }, [
        el("h3", { className: "order-group-name", textContent: g.venueName }),
        g.phone
          ? (() => {
              const a = el("a", { className: "order-call", href: tel(g.phone) }, [
                el("span", { "aria-hidden": "true", textContent: "📞" }),
                " Call",
              ]);
              a.setAttribute("aria-label", `Call ${g.venueName} to order`);
              return a;
            })()
          : null,
      ]);
      const lines = el("ul", { className: "order-lines" }, g.items.map((i) => lineRow(i, collectMode)));
      const subtotal = el("div", { className: "order-subtotal" }, [
        el("span", { textContent: plural(g.count, "item") }),
        el("span", {
          className: "order-subtotal-amount",
          textContent: money(g.subtotal) + (g.hasUnpriced ? "+" : ""),
        }),
      ]);
      body.append(el("section", { className: "order-group" }, [head, lines, subtotal]));
    }
  }

  function renderTotal() {
    const anyUnpriced = order.groups().some((g) => g.hasUnpriced);
    totalEl.textContent = money(order.total()) + (anyUnpriced ? "+" : "");
  }

  function renderFab() {
    const n = order.count();
    fab.hidden = n === 0;
    count.textContent = String(n);
    fab.setAttribute("aria-label", `Your order — ${plural(n, "item")}`);
  }

  function resetClear() {
    confirmingClear = false;
    clearBtn.textContent = "Clear";
    clearBtn.classList.remove("confirming");
  }

  function refresh() {
    renderFab();
    if (dialog.open) {
      renderBody();
      renderTotal();
    }
  }

  fab.addEventListener("click", () => {
    collectMode = false;
    collectBtn.setAttribute("aria-pressed", "false");
    resetClear();
    renderBody();
    renderTotal();
    dialog.showModal();
  });

  collectBtn.addEventListener("click", () => {
    collectMode = !collectMode;
    collectBtn.setAttribute("aria-pressed", String(collectMode));
    renderBody();
  });

  clearBtn.addEventListener("click", () => {
    if (!confirmingClear) {
      confirmingClear = true;
      clearBtn.textContent = "Clear — sure?";
      clearBtn.classList.add("confirming");
      return;
    }
    order.clear();
    resetClear();
  });

  dialog.addEventListener("close", resetClear);
  dialog.addEventListener("click", (e) => {
    // Backdrop click (target is the dialog itself, not its content) closes.
    if (e.target === dialog) dialog.close();
  });

  order.subscribe(refresh);
  // Keep in step if the order changes in another tab.
  window.addEventListener("storage", (e) => {
    if (e.key === "faves.order.v1") order.reload();
  });

  renderFab();
}
