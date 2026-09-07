// The add-on picker on a dish row (ADR 0048, Theme 14a + 14d).
//
// Its own module rather than more menu.js, which is already the largest file in
// the app. Everything here is presentation; every rule it enforces — what may
// be chosen, what that does to the dish's safety tags — is decided in
// addons.js and unit-tested there.
//
// THE POINT OF THE WARNING LINE. A dish that carried no warning when you tapped
// it can stop being safe once you configure it: satay on a kebab is peanuts.
// So the composed warning updates on every change, WHILE you are choosing —
// not once the line has landed in the order tally. Being told after you have
// ordered is being told too late.
//
// Two ways a dietary claim can die, said differently on purpose. "Halloumi
// contains dairy" is a fact we hold. "We can't say whether Mushrooms is dairy
// free" is an absence. Flattening them into one warning would teach the reader
// to discount both, and a discounted allergen warning is worse than none.
//
// 14h: THAT RULE HELD AND THE ABSENCE LINE STILL DROWNED THE FACTS, by volume
// instead of by wording (owner-raised 2026-08-17, ruled 2026-08-22 — ADR 0092).
// Two fixes, in the order he ruled them, and the distinction above is intact in
// both:
//
//   (a) Say the fact where a fact exists. `has-meat`/`has-fish` on the option
//       moves Bacon, Salami and Salmon off the absence branch entirely — the
//       line is now "Bacon is meat, so this is no longer vegetarian."
//   (b) Collapse what is genuinely still unknown into ONE sentence for the
//       whole configuration, listed LAST and quietly, rather than one sentence
//       per claim per option repeating the same name.
//
// So the two shapes are still said differently — more differently than before,
// because the facts are now first, individual and loud, and the absence is one
// closing line. What is flattened is the absence against ITSELF, never against
// a fact. There is no branch here where an untagged option is silently treated
// as safe: the claim still dies, and the sentence still says so.

import { el } from "./dom.js";
import { dishId } from "./dish-id.js";
import { dishStepper } from "./cart-ui.js";
import { settings } from "./settings.js";
import { dishFlagged } from "./dietary.js";
import { groupsFor, optionPrice, selectionPrice, selectionAllowed, composeTags } from "./addons.js";
import { formatMoney } from "./place.js";

const ALLERGEN_LABEL = {
  "contains-nuts": "nuts",
  "contains-peanuts": "peanuts",
  "contains-shellfish": "shellfish",
  "contains-fish": "fish",
  "contains-egg": "egg",
  "contains-dairy": "dairy",
  "contains-gluten": "gluten",
  "contains-soy": "soy",
  "contains-sesame": "sesame",
};

const CLAIM_LABEL = {
  v: "vegetarian",
  vg: "vegan",
  gf: "gluten free",
  df: "dairy free",
  "gf-option": "gluten free",
  "v-option": "vegetarian",
  "df-option": "dairy free",
  "vg-option": "vegan",
};

// How a contradicting tag is SAID. An allergen reads "contains dairy"; the two
// non-allergen facts read "is meat" / "is fish", because "Bacon contains meat"
// is not how anybody says it. Falls back to the raw tag rather than dropping
// the clause, so a vocabulary addition is visible instead of silent.
const CARRIES = {
  "has-meat": "is meat",
  "has-fish": "is fish",
};
const carries = (tag) => CARRIES[tag] || `contains ${ALLERGEN_LABEL[tag] || tag}`;

/** "A", "A and B", "A, B and C" — NZ English, no serial comma. */
function joinList(items, last = "and") {
  if (items.length < 2) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/**
 * ONE sentence for everything the configuration leaves unknown (ADR 0092).
 *
 * Was: one sentence per claim per option — "We can't say whether Spinach is
 * vegetarian, so we can't say this still is. We can't say whether Spinach is
 * gluten free, so we can't say this still is." Two sentences, one option, one
 * fact, and the reader learns to skip the whole block.
 *
 * It says "aren't tagged", not "we can't say whether" — because that is the
 * true statement and it is shorter. It never says an extra IS safe, which is
 * the line ADR 0025 draws and this must not cross: the claim has already been
 * dropped from the dish by the time this renders, and the sentence explains
 * which labels no longer cover what the reader configured.
 */
function unstatedLine(drops) {
  // `silent` names every option that failed the claim; `from` is the fallback
  // for a drop composed before that field existed.
  const names = [...new Set(drops.flatMap((d) => (d.silent?.length ? d.silent : [d.from])))];
  const claims = [...new Set(drops.map((d) => CLAIM_LABEL[d.tag] || d.tag))];
  const verb = names.length > 1 ? "aren't" : "isn't";
  const labels = claims.length > 1 ? "those labels describe" : "that label describes";
  return `${joinList(names)} ${verb} tagged ${joinList(claims, "or")}, so ${labels} the dish as listed.`;
}

/** "+$3.00", or nothing at all when the extra is free — the commonest case. */
const priceSuffix = (amount, currency) =>
  amount > 0 ? ` +${formatMoney(amount, currency)}` : "";

/**
 * Build the picker for one dish, or return null when the dish offers nothing.
 *
 * Returns `{ node, stepper }` — `node` is the disclosure to append to the dish
 * row, and `stepper` the Add control it owns. The stepper is rebuilt on every
 * change because it counts a *configuration*: once you tick a sauce you are no
 * longer adding to the same order line.
 *
 * `onCompose(tags)` is called with the composed tag list whenever the selection
 * changes, so the dish row can re-apply its own flagged treatment and keep
 * `dataset.tags` — which the live diet filter re-reads — in step.
 */
export function dishAddOns(record, section, item, onCompose) {
  const groups = groupsFor(record, section, item);
  if (groups.length === 0) return null;

  const currency = record?.currency || "NZD";
  const base = typeof item.price === "number" ? item.price : null;
  const selection = [];
  // This dish's identity, used for the radio/checkbox group names below and for
  // the order line the stepper counts. Two dishes of the same name on one page
  // are two dishes here, which the raw name could not express.
  const id = dishId(item);

  const warn = el("p", { className: "addon-warning", hidden: true });
  warn.setAttribute("role", "status"); // announced when it changes, not on focus
  const stepperSlot = el("div", { className: "addon-stepper" });

  function meta() {
    const extra = selectionPrice(selection);
    return {
      venueId: record.id,
      venueName: record.name,
      phone: record.phone,
      name: item.name,
      dishId: id,
      // The configured unit price: the dish plus what has been added to it.
      // null stays null — an unpriced dish with a paid extra is still a dish we
      // cannot total, and guessing would be worse than the honest "—".
      price: base == null ? null : base + extra,
      options: selection.map((s) => ({ group: s.group, name: s.name, price: s.price })),
    };
  }

  // `notice` is a one-off line appended AFTER the allergen text — the refused
  // fourth sauce used to overwrite the whole warning, so "Satay contains
  // peanuts — you asked to avoid it" vanished on the tap that was refused,
  // with Satay still ticked. The cap message is added to the warning, never
  // put in its place.
  function refresh(notice) {
    const { tags, added, dropped } = composeTags(item.tags, selection);
    onCompose?.(tags);

    const avoid = settings.get()?.diet?.avoid;
    const avoidSet = avoid instanceof Set ? avoid : new Set(avoid || []);
    const lines = [];

    // Flagged allergens first and loudest: this is the reader's own list, and
    // it is the reason they will look at all.
    const hit = added.filter((a) => avoidSet.has(a.tag));
    for (const a of hit) {
      lines.push(`${a.from} contains ${ALLERGEN_LABEL[a.tag] || a.tag} — you asked to avoid it.`);
    }
    // Then allergens they did not flag, stated plainly rather than as a warning.
    for (const a of added.filter((a) => !avoidSet.has(a.tag))) {
      lines.push(`${a.from} contains ${ALLERGEN_LABEL[a.tag] || a.tag}.`);
    }
    // Facts first, one per claim, exactly as before. The absences are held back
    // and said once at the end — the order is the point: what we KNOW leads.
    const unstated = [];
    for (const d of dropped) {
      if (d.reason !== "contradicted") {
        unstated.push(d);
        continue;
      }
      const claim = CLAIM_LABEL[d.tag] || d.tag;
      lines.push(`${d.from} ${carries(d.allergen)}, so this is no longer ${claim}.`);
    }
    if (unstated.length > 0) lines.push(unstatedLine(unstated));

    if (notice) lines.push(notice);
    warn.hidden = lines.length === 0;
    warn.classList.toggle("is-flagged", hit.length > 0 || dishFlagged(tags, avoidSet));
    warn.textContent = lines.join(" ");

    stepperSlot.replaceChildren(dishStepper(meta()));
  }

  const body = el("div", { className: "addon-groups" });

  for (const group of groups) {
    const single = group.select === "one";
    const cap = single ? 1 : group.max;
    const rule = single
      ? "Choose one"
      : typeof cap === "number"
        ? `Choose up to ${cap}`
        : "Choose any";

    const fields = el("div", { className: "addon-options" });
    const legend = el("legend", { className: "addon-legend" }, [
      el("span", { className: "addon-group-name", textContent: group.name }),
      el("span", { className: "addon-rule", textContent: rule }),
    ]);

    // A pick-one group needs an explicit way back out. A radio, once set, can
    // never be cleared by clicking it, so without this "Add gravy $3" is a
    // one-way door — and the group is often a single optional extra, where
    // changing your mind is the commonest thing you would do. The None radio
    // is deliberately NOT pushed into the selection: it carries no tags, and
    // an empty tag list run through the intersection rule would strip every
    // dietary claim off the dish for choosing nothing.
    if (single) {
      const none = el("input", {
        type: "radio",
        className: "addon-input",
        // Keyed on the dish id, not its name: a radio group's name is what
        // makes two inputs mutually exclusive, so two same-named dishes on one
        // page shared one group — picking a sauce on the second silently
        // cleared the first.
        name: `addon-${record.id}-${id}-${group.id}`,
        value: "",
        checked: true,
      });
      none.addEventListener("change", () => {
        for (let i = selection.length - 1; i >= 0; i--) {
          if (selection[i].group === group.id) selection.splice(i, 1);
        }
        refresh();
      });
      fields.append(
        el("label", { className: "addon-option" }, [
          none,
          el("span", { className: "addon-option-name", textContent: "None" }),
        ]),
      );
    }

    for (const option of group.options || []) {
      const cost = optionPrice(group, option);
      const input = el("input", {
        type: single ? "radio" : "checkbox",
        className: "addon-input",
        name: `addon-${record.id}-${id}-${group.id}`,
        value: option.name,
      });
      input.addEventListener("change", () => {
        if (single) {
          // A radio group replaces rather than accumulates.
          for (let i = selection.length - 1; i >= 0; i--) {
            if (selection[i].group === group.id) selection.splice(i, 1);
          }
        } else if (input.checked) {
          const taken = selection.filter((s) => s.group === group.id).length;
          if (!selectionAllowed(group, taken + 1)) {
            // The cap is the venue's rule, not ours (ADR 0048 §1) — so refuse
            // the tick rather than silently letting the order sheet ask for
            // something the shop will not make.
            input.checked = false;
            refresh(`${group.name}: ${rule.toLowerCase()}.`);
            return;
          }
        }
        if (!input.checked && !single) {
          const at = selection.findIndex((s) => s.group === group.id && s.name === option.name);
          if (at >= 0) selection.splice(at, 1);
        } else {
          selection.push({ group: group.id, name: option.name, price: cost, tags: option.tags || [] });
        }
        refresh();
      });

      fields.append(
        el("label", { className: "addon-option" }, [
          input,
          el("span", { className: "addon-option-name", textContent: option.name }),
          el("span", {
            className: "addon-option-price",
            textContent: priceSuffix(cost, currency),
          }),
        ]),
      );
    }

    body.append(el("fieldset", { className: "addon-group" }, [legend, fields]));
  }

  const details = el("details", { className: "dish-addons" }, [
    el("summary", { className: "dish-addons-summary" }, [
      el("span", { textContent: groups.length === 1 ? groups[0].name : "Add extras" }),
    ]),
    body,
    warn,
    stepperSlot,
  ]);

  refresh();
  return { node: details, stepper: stepperSlot };
}
