// The autocomplete popup for both search boxes. suggest.js does the ranking;
// this owns the combobox — the markup, the keyboard, and the ARIA that makes it
// a control rather than a decoration.
//
// WHY A COMBOBOX AND NOT "A DIV THAT APPEARS". A list of choices under a text
// field is one of the few widgets with a written contract (WAI-ARIA 1.2's
// combobox pattern), and readers who use one arrive already knowing how it
// works: ↓ steps into it, Escape dismisses it, Enter takes the highlighted row.
// Rolling a bespoke one costs those readers everything they already knew.
//
// THE RULE THAT SHAPES THE IMPLEMENTATION: focus never leaves the input.
// Arrowing through the options moves `aria-activedescendant`, not focus, so the
// on-screen keyboard stays up and every keystroke still lands in the field. A
// popup that steals focus on ↓ makes the next letter you type disappear, which
// on a phone reads as the app dropping input.
//
// WHAT THIS DELIBERATELY DOES NOT DO:
//   • It never rewrites the input as you arrow. "Inline autocomplete" (filling
//     the field with the highlighted option) fights the rotating placeholder,
//     fights the ✕, and — with a `filter` suggestion, whose effect is not text
//     at all — would put a word in the box that is not what happens when you
//     press it.
//   • It never opens on focus, only on typing. A panel that covers the results
//     the moment you tap the field is in the way of the reader who knew exactly
//     what they wanted.
//   • It never announces via a live region. The combobox pattern already tells
//     a screen reader what is happening through aria-expanded and
//     aria-activedescendant; a live region on top of that is the same news
//     twice, half a second apart.

import { MIN_QUERY, rankSuggestions } from "./suggest.js";

let seq = 0;

/**
 * Attach a suggestion popup to `input`.
 *
 * @param {HTMLInputElement} input
 * @param {object} opts
 *   getCandidates  () => candidate[]   — read fresh each keystroke, so a
 *                                        favourites chip that only just became
 *                                        available can be offered immediately
 *   onChoose       (candidate) => void — what pressing a row does
 *   limit          max rows (default 6)
 * @returns {{close: () => void, isOpen: () => boolean, destroy: () => void}}
 */
export function attachSuggestions(input, { getCandidates, onChoose, limit = 6 } = {}) {
  if (!input || typeof getCandidates !== "function") {
    return { close: () => {}, isOpen: () => false, destroy: () => {} };
  }
  const id = `suggest-${++seq}`;
  const list = document.createElement("ul");
  list.className = "suggest-list";
  list.id = id;
  list.setAttribute("role", "listbox");
  list.hidden = true;

  // The wrapper is `position: relative` on both screens (.search-field,
  // .menu-search-field), so the popup hangs off the field rather than off the
  // page — it stays put when the toolbar is sticky and the page scrolls.
  const host = input.parentElement || input;
  host.append(list);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", id);
  input.setAttribute("aria-autocomplete", "list");
  // Belt and braces against the phone keyboard's own suggestion strip stacking
  // on top of ours; the field already carries autocomplete="off" on both
  // screens, but this one is what stops iOS autocapitalising a dish name.
  input.setAttribute("autocorrect", "off");
  input.setAttribute("autocapitalize", "off");

  let rows = [];
  let active = -1;

  const close = () => {
    if (list.hidden) return;
    list.hidden = true;
    list.replaceChildren();
    rows = [];
    active = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const highlight = (i) => {
    if (!rows.length) return;
    // Wraps, because a list this short is faster to reach backwards than to
    // arrow past the end of.
    active = (i + rows.length) % rows.length;
    rows.forEach((r, n) => {
      const on = n === active;
      r.el.setAttribute("aria-selected", String(on));
      r.el.classList.toggle("is-active", on);
    });
    input.setAttribute("aria-activedescendant", rows[active].el.id);
    rows[active].el.scrollIntoView({ block: "nearest" });
  };

  const choose = (i) => {
    const row = rows[i];
    if (!row) return;
    close();
    onChoose?.(row.candidate);
  };

  const render = () => {
    const picked = rankSuggestions(input.value, getCandidates(), { limit });
    if (!picked.length) {
      close();
      return;
    }
    list.replaceChildren();
    rows = picked.map((candidate, n) => {
      const el = document.createElement("li");
      el.className = `suggest-row suggest-${candidate.kind}`;
      el.id = `${id}-opt-${n}`;
      el.setAttribute("role", "option");
      el.setAttribute("aria-selected", "false");
      if (candidate.icon) {
        const ico = document.createElement("span");
        ico.className = "suggest-ico";
        ico.setAttribute("aria-hidden", "true");
        ico.textContent = candidate.icon;
        el.append(ico);
      }
      const label = document.createElement("span");
      label.className = "suggest-label";
      // textContent, never innerHTML: this is the reader's own typing coming
      // back at them by way of a dish name, and it is rendered as characters.
      label.textContent = candidate.label;
      el.append(label);
      if (candidate.sub) {
        const sub = document.createElement("span");
        sub.className = "suggest-sub";
        sub.textContent = candidate.sub;
        el.append(sub);
      }
      // mousedown, not click: `click` fires after `blur`, and blur closes the
      // list, so by the time click arrived the row it landed on was gone. This
      // is the classic autocomplete bug and it only shows up with a mouse.
      el.addEventListener("mousedown", (e) => {
        e.preventDefault(); // keep focus in the field
        choose(n);
      });
      list.append(el);
      return { el, candidate };
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    active = -1;
    input.removeAttribute("aria-activedescendant");
  };

  const onInput = () => {
    if (input.value.trim().length < MIN_QUERY) close();
    else render();
  };

  const onKeyDown = (e) => {
    if (list.hidden) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlight(active + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlight(active - 1);
        break;
      case "Enter":
        // Only swallow Enter when a row is actually highlighted. Otherwise the
        // key still means "I have finished typing", and on the home screen that
        // is the form's own submit handler's business, not ours.
        if (active >= 0) {
          e.preventDefault();
          choose(active);
        }
        break;
      case "Escape":
        // Escape closes the popup FIRST and stops there. Both screens also wire
        // Escape to empty the field (search-clear.js), which would otherwise
        // wipe what the reader typed in the same keypress that dismissed a
        // panel they may only have wanted out of the way. A second Escape, with
        // the list now closed, falls through and clears as it always did.
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  };

  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", close);

  return {
    close,
    isOpen: () => !list.hidden,
    destroy() {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", close);
      close();
      list.remove();
      for (const a of ["role", "aria-expanded", "aria-controls", "aria-autocomplete"]) {
        input.removeAttribute(a);
      }
    },
  };
}
