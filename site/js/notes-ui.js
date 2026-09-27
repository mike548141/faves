// Personal notes UI (ROADMAP 17e) — "Add a note" / "Edit note" on a recipe
// page, and the small editor it opens. The store (notes.js) is DOM-free and
// unit-tested; this is presentation, modelled closely on the order-line
// note's own control (cart-ui.js `noteRow`, Theme 14c) because it is the same
// shape: free text, a labelled field, a stated character cap, and rendered
// with `textContent` only — never innerHTML, so a crafted note is always
// characters on screen and never markup (tools/note_check.mjs proves that
// property for the order note; recipe_check.mjs proves it here).
//
// Quiet when there is nothing to say: an empty note draws no control beyond
// the one "Add a note" button, and that button is styled to read as an
// optional extra beside the heart, never as a field the reader must fill in.

import { notes, MAX_NOTE } from "./notes.js";
import { el } from "./dom.js";

// One counter for the whole page, so every note field this page ever opens
// gets its own id for its <label> to point at — mirrors cart-ui.js's
// `noteFieldSeq`, and for the same reason: a recipe page can rebuild this
// control more than once (a scale change re-renders the whole page), and an
// id derived from position would let a stale duplicate strand a label on the
// wrong field.
let fieldSeq = 0;

/**
 * A personal note control for the recipe keyed by `rid` (checklist.js
 * `recipeId`). `name` is the recipe's own name, used only to build the
 * accessible labels ("Add a note for Ginger Crunch") — never rendered as
 * part of the note itself. Self-updating: subscribes to the shared store, so
 * a profile switch (which calls `notes.reload()`) repaints this control with
 * whoever is now active, exactly like `ratingControl` and `heartButton`.
 */
export function noteControl(rid, name) {
  const wrap = el("div", { className: "recipe-note" });

  function showControl() {
    const text = notes.get(rid);
    const has = !!text;
    const children = [];
    if (has) {
      // The pencil mark is the same one the order-line note uses (Theme 14c)
      // — one glyph for "this is something you wrote", wherever it appears.
      // A single textContent write, never innerHTML: a note crafted with
      // markup in it must come back as literal characters.
      children.push(
        el("p", {
          className: "recipe-note-text",
          // "Your note:" ships English-only for now — see the reo-review-queue
          // entry added with this feature. reo.js swaps whole strings only, and
          // this one is built with the note's own text appended, so a key here
          // would need the engine's parameterised form first (the same
          // limitation the distance-limit lines already record there).
          textContent: `✎ Your note: ${text}`,
        })
      );
    }
    const btn = el("button", {
      type: "button",
      className: "recipe-note-btn",
      textContent: has ? "Edit note" : "Add a note",
    });
    btn.setAttribute("aria-label", `${has ? "Edit" : "Add a"} note for ${name}`);
    btn.addEventListener("click", showEditor);
    children.push(btn);
    wrap.replaceChildren(...children);
  }

  function showEditor() {
    const current = notes.get(rid);
    const fieldId = `recipe-note-${++fieldSeq}`;
    const label = el("label", {
      className: "sr-only",
      htmlFor: fieldId,
      textContent: `Note for ${name}`,
    });
    const input = el("textarea", {
      id: fieldId,
      className: "recipe-note-input",
      rows: 2,
      value: current,
      maxLength: MAX_NOTE,
      // The roadmap's own example, so the placeholder shows what this
      // control is for rather than inventing a second one.
      placeholder: "Used half the sugar, still great",
    });
    const help = el("p", {
      className: "recipe-note-help",
      id: `${fieldId}-help`,
      textContent: `Your own note on this recipe — only you see it. Up to ${MAX_NOTE} characters.`,
    });
    input.setAttribute("aria-describedby", help.id);
    const save = el("button", { type: "button", className: "recipe-note-save", textContent: "Save" });
    save.setAttribute("aria-label", `Save note for ${name}`);

    let saved = false;
    function commit() {
      if (saved) return;
      saved = true;
      notes.set(rid, input.value);
      showControl();
    }
    save.addEventListener("click", commit);
    // `change` fires on blur when the value moved, so tapping away saves
    // rather than silently discarding what was typed — same as the order
    // note. Clicking Save blurs first, so that path lands here too, hence
    // the `saved` latch stopping a double commit.
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (e) => {
      // Enter alone would insert a newline in a <textarea> the way it would
      // not in the order note's <input> — this cap is one sentence, not a
      // recipe, so Shift+Enter is reserved for the (rare) deliberate line
      // break and plain Enter means "done", matching the field's siblings.
      if (e.key !== "Enter" || e.shiftKey) return;
      e.preventDefault();
      commit();
    });

    wrap.replaceChildren(label, input, help, save);
    input.focus();
    input.select();
  }

  showControl();
  notes.subscribe(showControl); // a sync pull or another tab's edit repaints this
  return wrap;
}
