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
//
// 2026-09-07 (roadmap 200/050, owner-ruled): and a FACT is now flattened against
// ITSELF too. "Halloumi contains dairy — you asked to avoid it. Halloumi
// contains dairy, so this is no longer vegan." is one fact with two
// consequences, and it opened with the same clause twice from ADR 0048 until
// now. It is one sentence today. See `claimsKilledBy` below for the merge rule,
// what it deliberately does NOT merge, and why the allergen half still leads.
//
// 2026-09-08 (roadmap 200/070): that merge keyed on the literal TAG, so it left
// one shape standing — one SUBSTANCE said through two tags. "Salmon contains
// fish — you asked to avoid it. Salmon is fish, so this is no longer
// vegetarian." is one fish, twice. It keys on the substance now. `SUBSTANCE`
// below is a map about WORDS; it relates no two tags anywhere else, and the
// comment on it says why that distinction is the whole of the decision.

import { el } from "./dom.js";
import { dishId } from "./dish-id.js";
import { dishStepper } from "./cart-ui.js";
import { order } from "./cart.js";
import { settings } from "./settings.js";
import { effectiveAvoid } from "./dietary.js";
import {
  groupsFor,
  optionPrice,
  optionId,
  selectionAllowed,
  isSelects,
  isRequired,
  missingRequired,
  minOf,
  extraFee,
  ruleText,
  owedSentence,
  mustSeeGroups,
  mustSeeNote,
  freshAction,
  movedNote,
  selectionKey,
  defaultVariant,
  variantLabel,
  configuredPrice,
  lineOptions,
} from "./addons.js";
import { formatMoney, venueCurrency } from "./place.js";
import { isSpicy, heatLabel } from "./heat.js";
import { minQtyOf } from "./dish-rules.js";

// The sentences live in addon-warning.js (shared with the order sheet's finish control);
// re-exported so this module stays the name tests and the picker know them by.
import { warningLines, configurationWarning } from "./addon-warning.js";
export { warningLines };

/** "+$3.00", or nothing at all when the extra is free — the commonest case. */
const priceSuffix = (amount, currency) =>
  amount > 0 ? ` +${formatMoney(amount, currency)}` : "";

/**
 * HEAT, ON THE OPTION ROW ITSELF (roadmap 200/080, owner-ruled 2026-09-21).
 *
 * 🛑 What was wrong, said precisely, because the item's own summary is broader
 * than the defect and a fix aimed at the summary would have been aimed at
 * nothing. Heat was NOT missing from the app once an option was ticked: since
 * `200/060` wired the chip row to the composed tags, ticking a `spicy-2` sauce
 * paints "🌶🌶 Spicy" on the DISH row like any other composed tag. What was
 * missing is the only moment it is any use — WHILE YOU ARE CHOOSING. Wellington
 * Kebab Grill offers "Mild chilli" and "Hot chilli" side by side in one sauce
 * group, tagged `spicy-1` and `spicy-2`, and the picker drew them identically:
 * the reader had to tick one to find out, and ticking is how you order it.
 *
 * So the words come from heat.js — the same vocabulary the dish row and the
 * recipe page render — rather than a third copy of the template. That is the
 * whole of the reuse: this function decides WHERE a chip goes, never what it
 * says.
 *
 * 🔑 Heat only. The option's other tags are spoken by the warning line the
 * moment the option is ticked, and saying them here as well would be the second
 * chip for one fact that ADR 0096 ruled against. Heat has no warning-line branch
 * — it contradicts no claim and nobody avoids it in Settings — so a chip is the
 * only place it can be said at all.
 */
const heatChips = (option) =>
  (option.tags || [])
    .filter(isSpicy)
    .map((t) => el("span", { className: "tag tag-spicy addon-option-tag", textContent: heatLabel(t) }));

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
 *
 * `onVariant({ price, options })` is called whenever the chosen VARIANT changes
 * (a `selects` group, ADR 0130/0133), and once on build: `price` is that
 * variant's whole `dishPrice` — never the dish's price plus it — and `options`
 * is what the row's own ＋ Add should record for it (empty for the default,
 * which IS the dish as listed). Never called for a dish with no variant group.
 *
 * `onGate(gate, { price, options })` is called on build and on every change:
 * `gate` is `null` when the dish may be added, or `{ reason, onBlocked }` while
 * a REQUIRED group (ADR 0156) is unanswered, and the second argument is what
 * the row's own ＋ Add should record — the variant plus any required choice —
 * so the row cannot order the dish without the choice the picker insists on.
 *
 * It also returns `reveal()` and `live` (ADR 0159). The row calls `reveal()`
 * after its own ＋ Add takes the dish from none to one: when the dish has a
 * must-see group (every `selects` ladder; any group flagged `mustSee`) and the
 * picker is closed, it opens, says in words why, and scrolls the first question
 * into view if it is off-screen. It never moves focus — the person is mid-tap
 * on the Add they just pressed. `live` is the polite status region that
 * announces it; it sits beside the picker, not inside, because a live region in
 * a closed <details> is not reliably spoken.
 */
export function dishAddOns(record, section, item, onCompose, onVariant, onGate) {
  // WHICH plate before WHAT is on it: a variant group is offered first,
  // whatever order the section and the dish named their groups in. The control
  // is otherwise the same fieldset of radios a pick-one sauce is (Theme 14's
  // ruling, 2026-08-17: the reader should not be able to tell an upsize from a
  // sauce by how it is chosen).
  const all = groupsFor(record, section, item);
  const groups = [...all.filter(isSelects), ...all.filter((g) => !isSelects(g))];
  if (groups.length === 0) return null;

  const currency = record?.currency || "NZD";
  const fmt = (n) => formatMoney(n, currency);
  const base = typeof item.price === "number" ? item.price : null;
  // A variant's entry in the selection. `price: 0` because `dishPrice` is the
  // whole plate, not an extra (configuredPrice reads it in place of the dish's
  // price); `isDefault` is what keeps the default off the order line
  // (lineOptions). Its tags compose like any option's: allergens UNION, claims
  // intersect — and validate.py makes a variant restate its dish's claims
  // exactly, so choosing one never produces a residue sentence (ADR 0130 §3).
  const variantEntry = (group, option) => ({
    group: group.id,
    id: optionId(option),
    name: variantLabel(group, option, fmt),
    price: 0,
    dishPrice: option.dishPrice,
    isDefault: option.default === true,
    tags: option.tags || [],
  });
  // A dish starts on its default variant — exactly one is always chosen, and
  // the row's price before anything is tapped is the default's.
  const selection = groups
    .filter(isSelects)
    .map((g) => [g, defaultVariant(g)])
    .filter(([, o]) => o)
    .map(([g, o]) => variantEntry(g, o));
  // This dish's identity, used for the radio/checkbox group names below and for
  // the order line the stepper counts. Two dishes of the same name on one page
  // are two dishes here, which the raw name could not express.
  const id = dishId(item);

  const warn = el("p", { className: "addon-warning", hidden: true });
  warn.setAttribute("role", "status"); // announced when it changes, not on focus
  // Said in words, not only by a dimmed button: what is missing, and where.
  const need = el("p", { className: "addon-need", hidden: true });
  const stepperSlot = el("div", { className: "addon-stepper" });
  // The first radio of each required group, so a blocked tap can take the
  // reader to the question rather than leave them to hunt for it.
  const firstInput = new Map();
  // The unit the reader just added by pressing Add, while the picker it opened is
  // still theirs to change (ADR 0159): `{ sel, total }`, or null. A change made in
  // the picker MOVES that one unit instead of making a second line.
  let fresh = null;
  // What the row's own ＋ Add last recorded (refresh() keeps it): the plate and any
  // required choice, which is exactly what a press of that Add put in the order.
  let rowCarry = { options: [] };
  // Groups the venue obliges the reader to answer: required pick-one (ADR 0156) and
  // pick-many with a minimum (ADR 0163). One set, one mechanism.
  const requiredIds = new Set(groups.filter((g) => isRequired(g) || minOf(g) > 0).map((g) => g.id));
  // In the DOM only while a choice is open — a hidden span would still be part
  // of the summary's textContent.
  const needChip = el("span", { className: "addon-summary-need", textContent: "Choice needed" });
  const summary = el("summary", { className: "dish-addons-summary" }, [el("span", { textContent: "" })]);

  function meta() {
    return {
      venueId: record.id,
      venueName: record.name,
      phone: record.phone,
      name: item.name,
      dishId: id,
      // The configured unit price: the dish — or the chosen variant's WHOLE
      // price in its place — plus what has been added to it. null stays null:
      // an unpriced dish with a paid extra is still a dish we cannot total, and
      // guessing would be worse than the honest "—".
      price: configuredPrice(base, selection, groups),
      // The dish's minimum order (ADR 0164), for the stepper only. A configured
      // dish is its own line, and it starts at the minimum like the plain one.
      ...(minQtyOf(item) > 1 ? { minQty: minQtyOf(item) } : {}),
      // Same reason as the plain row's stepper (menu.js): the line carries the
      // currency it was priced in, or it silently becomes NZD.
      currency: venueCurrency(record),
      // `id` travels with the name (ADR 0126): the line is KEYED on it, so a
      // venue renaming the option later does not strand this line. The name
      // stays because it is what the order sheet reads out at the counter.
      // The default variant is left OFF the line (lineOptions, ADR 0133): it
      // is the dish as listed, so it keys exactly as the plain row's ＋ Add and
      // every line saved before the dish had a ladder.
      options: lineOptions(selection),
    };
  }

  /**
   * Carry a change made in the picker over to the unit the reader just added
   * (ADR 0159). Runs first in refresh(), before the steppers are rebuilt, so they
   * read the order as the move leaves it. `freshAction` decides; this only does it.
   */
  function followFresh() {
    if (!fresh) return;
    const next = { options: lineOptions(selection), price: configuredPrice(base, selection, groups) };
    const act = freshAction(fresh, {
      sel: selectionKey(next.options),
      total: order.dishQty(record.id, id),
      hasLine: order.qtyOf(record.id, id, fresh.sel, "") > 0,
      gated: missingRequired(groups, selection).length > 0,
    });
    if (act === "end") fresh = null;
    if (act !== "move") return;
    const key = order.moveOne(record.id, id, fresh.sel, "", next);
    if (key == null) {
      fresh = null;
      return;
    }
    fresh.sel = selectionKey(next.options);
    // Said, because the order changed under a tap that only touched a radio.
    const said = movedNote(item.name, next.options);
    seenNote.textContent = said;
    live.textContent = said;
  }

  /** What the row shows and its own ＋ Add records for the chosen variant. */
  function variantState() {
    const v = selection.filter((s) => typeof s.dishPrice === "number");
    if (v.length === 0) return null;
    return { price: configuredPrice(base, v, groups), options: lineOptions(v) };
  }

  // `notice` is a one-off line appended AFTER the allergen text — the refused
  // fourth sauce used to overwrite the whole warning, so "Satay contains
  // peanuts — you asked to avoid it" vanished on the tap that was refused,
  // with Satay still ticked. The cap message is added to the warning, never
  // put in its place.
  function refresh(notice) {
    followFresh();
    // The reader's flags plus what Halal/Kosher imply (ADR 0140) — the same
    // dietary.js function the menu row reads, so the row accent and this line
    // cannot disagree about a pork topping.
    const s = settings.get();
    const avoidSet = effectiveAvoid(s?.diet?.avoid, s?.foodPrefs);
    const { tags, lines, flagged } = configurationWarning(item.tags, selection, avoidSet, notice);
    onCompose?.(tags);

    warn.hidden = lines.length === 0;
    warn.classList.toggle("is-flagged", flagged);
    warn.textContent = lines.join(" ");

    // A required group with nothing chosen blocks Add, here and on the row.
    const missing = missingRequired(groups, selection);
    const gate = missing.length
      ? {
          // A required pick-one group keeps its old words ("choose Sauce first");
          // a minimum says how many ("choose 2 under “Cheese” first", ADR 0163).
          reason: missing.every((g) => g.select === "one")
            ? `choose ${missing.map((g) => g.name).join(" and ")} first`
            : `${owedSentence(missing, selection)} first`,
          onBlocked() {
            details.open = true;
            // Asked again NOW: the row's stepper outlives this closure, and
            // the first unanswered group may have moved since it was built.
            const first = missingRequired(groups, selection)[0];
            if (first) firstInput.get(first.id)?.focus();
          },
        }
      : null;
    need.hidden = !gate;
    if (gate) summary.append(needChip);
    else needChip.remove();
    need.textContent = gate ? `To add this, ${owedSentence(missing, selection)}.` : "";
    stepperSlot.replaceChildren(dishStepper(meta(), gate));
    // What the row's own ＋ Add must record: the plate (variant) AND any required
    // choice already made. Without the second, answering the question here
    // would lift the gate and let the row order the dish with no sauce on it.
    const rowSel = selection.filter((x) => typeof x.dishPrice === "number" || requiredIds.has(x.group));
    rowCarry = { price: configuredPrice(base, rowSel, groups), options: lineOptions(rowSel) };
    onGate?.(gate, rowCarry);
    const v = variantState();
    if (v) onVariant?.(v);
  }

  /**
   * A `selects` group as a control (ADR 0133): radios, the default checked,
   * no "None" — a plate always has a size — and no cap to state. Each option
   * shows its WHOLE price, not a "+" surcharge, because that is what the
   * menu prints and what the row will then read. The fieldset's legend is the
   * group's accessible name, so a screen reader hears "Size, Regular, $13".
   */
  function variantFieldset(group) {
    const fields = el("div", { className: "addon-options" });
    const legend = el("legend", { className: "addon-legend" }, [
      el("span", { className: "addon-group-name", textContent: group.name }),
      el("span", { className: "addon-rule", textContent: "Choose one" }),
    ]);
    const chosen = selection.find((s) => s.group === group.id);
    for (const option of group.options || []) {
      const entry = variantEntry(group, option);
      const input = el("input", {
        type: "radio",
        className: "addon-input",
        name: `addon-${record.id}-${id}-${group.id}`,
        value: entry.name,
        checked: !!chosen && chosen.id === entry.id,
      });
      input.addEventListener("change", () => {
        if (!input.checked) return;
        // Replaced IN PLACE, so the variant stays first in the selection and
        // reads first on the order line ("Large, Bacon", not "Bacon, Large").
        const at = selection.findIndex((s) => s.group === group.id);
        if (at >= 0) selection[at] = entry;
        else selection.unshift(entry);
        refresh();
      });
      // An unlabelled variant's label already IS its price ("$24 size"), so
      // the price is not said twice.
      const labelled = typeof option.name === "string" && option.name.trim();
      fields.append(
        el("label", { className: "addon-option" }, [
          input,
          el("span", { className: "addon-option-name", textContent: entry.name }),
          ...heatChips(option),
          el("span", {
            className: "addon-option-price",
            textContent: labelled && typeof option.dishPrice === "number" ? ` ${fmt(option.dishPrice)}` : "",
          }),
        ]),
      );
    }
    const set = el("fieldset", { className: "addon-group addon-group-variant" }, [legend, fields]);
    return set;
  }

  const body = el("div", { className: "addon-groups" });
  // WHY the picker opened, said as text on the page for a sighted reader and as
  // a status for a screen reader — the same sentence, so neither has to infer it.
  // Present only after a reveal; cleared when the reader closes the picker.
  const seenNote = el("p", { className: "addon-seen", hidden: true });
  const live = el("p", { className: "sr-only" });
  live.setAttribute("role", "status");
  const mustSee = mustSeeGroups(groups);

  for (const group of groups) {
    if (isSelects(group)) {
      body.append(variantFieldset(group));
      continue;
    }
    const single = group.select === "one";
    const cap = single ? 1 : group.max;
    const required = isRequired(group);
    // "Required" is a word, not a colour: the venue made this choice
    // compulsory, and the reader should see that before they reach Add. The
    // words for a minimum ("Required — choose 2") and for an allowance with a
    // fee ("1 included, then $4 each") come from the same function (ADR 0163).
    const rule = ruleText(group, fmt);
    // The refused tick names the cap alone, never the fee clause.
    const capNotice = `${group.name}: choose up to ${cap}.`;
    // Said in words as the fee starts to apply, so a reader who ticks a fourth
    // sauce is told it costs, not left to find out on the order sheet.
    const feeNote =
      !single && Number.isInteger(group.included) && group.extraPrice > 0
        ? el("p", { className: "addon-fee-note", hidden: true })
        : null;
    feeNote?.setAttribute("role", "status");
    const paintFee = () => {
      if (!feeNote) return;
      const n = selection.filter((s) => s.group === group.id).length;
      const fee = extraFee(group, n);
      feeNote.hidden = fee <= 0;
      feeNote.textContent =
        fee > 0
          ? `${n - group.included} extra at ${fmt(group.extraPrice)} each: +${fmt(fee)} on this dish.`
          : "";
    };

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
    // A REQUIRED group (ADR 0156) has none: the venue's menu says "choice of",
    // so there is no valid "nothing", and nothing is pre-selected either —
    // a default would be a choice the reader never made, on a dish whose
    // allergens depend on it. Add waits instead (refresh → the gate).
    if (single && !required) {
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
      if (requiredIds.has(group.id) && !firstInput.has(group.id)) firstInput.set(group.id, input);
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
            refresh(capNotice);
            return;
          }
        }
        if (!input.checked && !single) {
          const at = selection.findIndex((s) => s.group === group.id && s.id === optionId(option));
          if (at >= 0) selection.splice(at, 1);
        } else {
          selection.push({ group: group.id, id: optionId(option), name: option.name, price: cost, tags: option.tags || [] });
        }
        paintFee();
        refresh();
      });

      // The heat chip sits between the name and the price, INSIDE the label —
      // so it is part of the control's accessible name ("Hot chilli, 🌶🌶
      // Spicy, +$1.00"), exactly as the price already is. A chip outside the
      // label would be read after the whole list by a screen reader, or not at
      // all, and heat you learn about after choosing is the silence this fixed.
      fields.append(
        el("label", { className: "addon-option" }, [
          input,
          el("span", { className: "addon-option-name", textContent: option.name }),
          ...heatChips(option),
          el("span", {
            className: "addon-option-price",
            textContent: priceSuffix(cost, currency),
          }),
        ]),
      );
    }

    body.append(el("fieldset", { className: "addon-group" }, [legend, fields, ...(feeNote ? [feeNote] : [])]));
  }

  // The summary names what the disclosure holds. A lone group names itself, as
  // it always did; a variant group beside extras says both ("Size and extras"),
  // because "Add extras" alone hides that the plate itself is a choice.
  const variantGroups = groups.filter(isSelects);
  const summaryText =
    groups.length === 1
      ? groups[0].name
      : variantGroups.length > 0 && variantGroups.length < groups.length
        ? `${variantGroups.map((g) => g.name).join(", ")} and extras`
        : "Add extras";
  summary.firstChild.textContent = summaryText;
  const details = el("details", { className: "dish-addons" }, [
    summary,
    seenNote,
    body,
    warn,
    need,
    stepperSlot,
  ]);

  details.addEventListener("toggle", () => {
    if (!details.open) {
      // Closing it is accepting what is in the order.
      fresh = null;
      seenNote.hidden = true;
      seenNote.textContent = "";
      // Emptied too, so the NEXT reveal is a change a screen reader will speak.
      live.textContent = "";
    }
  });

  /**
   * Open the picker because the reader pressed Add on a dish with a must-see
   * choice (ADR 0159). Returns whether it opened. A no-op when the dish has no
   * must-see group (a purely optional picker stays exactly as it was) and when
   * the picker is already open (nothing to show).
   *
   * NEVER focuses anything: focus is on the Add they just pressed (a repeat-
   * tapper must not be yanked mid-tap — the same reasoning as 14g). The scroll
   * is `nearest` on the first question, so it moves the page only when that
   * question would be off-screen, and instantly under prefers-reduced-motion.
   */
  function reveal() {
    if (mustSee.length === 0 || details.open) return false;
    details.open = true;
    // The Add that opened this put one unit on the row's configuration. A change
    // made here from now on updates THAT unit (B, owner-ruled 2026-10-16) until the
    // reader confirms a quantity or closes the picker. Only a reveal that actually
    // opened it starts this: a picker the reader already had open is one they were
    // already choosing in, and keeps the one-Add-one-line behaviour it always had.
    const sel = selectionKey(rowCarry.options);
    fresh = order.qtyOf(record.id, id, sel, "") > 0 ? { sel, total: order.dishQty(record.id, id) } : null;
    const note = mustSeeNote(groups);
    seenNote.textContent = note;
    seenNote.hidden = false;
    live.textContent = note;
    const reduce = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    (body.firstElementChild || details).scrollIntoView?.({ block: "nearest", behavior: reduce ? "instant" : "auto" });
    return true;
  }

  refresh();
  return { node: details, stepper: stepperSlot, reveal, live };
}
