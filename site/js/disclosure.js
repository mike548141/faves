// A small ⓘ disclosure: an info button that toggles a note anchored beside it.
// Shared by the restaurant menu's "needs a refresh" caution and the Settings
// allergen caveat, so both get identical click / outside-click / Escape
// behaviour and the same .caveat-btn / .caveat-note styling. The caller is
// responsible for giving the [btn, note] pair a position:relative ancestor so
// the note anchors correctly.
export function disclosure({ noteId, label, text }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "caveat-btn";
  btn.textContent = "ⓘ";
  btn.setAttribute("aria-label", label);
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", noteId);

  const note = document.createElement("span");
  note.id = noteId;
  note.className = "caveat-note";
  note.setAttribute("role", "note");
  // text may be a string or a ready-built node (e.g. one with a <strong> lead).
  note.append(text);

  const isOpen = () => btn.getAttribute("aria-expanded") === "true";
  const onDocPointer = (e) => {
    if (!btn.contains(e.target) && !note.contains(e.target)) setOpen(false);
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      btn.focus();
    }
  };
  function setOpen(open) {
    if (open === isOpen()) return;
    btn.setAttribute("aria-expanded", String(open));
    note.classList.toggle("is-open", open);
    // Capture-phase so it still closes when an inner handler stops bubbling.
    const fn = open ? "addEventListener" : "removeEventListener";
    document[fn]("click", onDocPointer, true);
    document[fn]("keydown", onKey);
  }
  btn.addEventListener("click", () => setOpen(!isOpen()));

  return [btn, note];
}
