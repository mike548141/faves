// A tiny transient status toast: bottom-centre, announced politely, auto-
// dismissed. One at a time — a new message replaces the current one. Used for
// lightweight confirmations (e.g. "Link copied") where a dialog would be
// heavy-handed and the triggering control has already gone (a menu that closed).

let node;
let timer;

export function toast(message, ms = 2600) {
  if (!node) {
    node = document.createElement("div");
    node.className = "toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
  }
  node.textContent = message;
  // Reflow so re-showing an already-visible toast restarts its transition.
  void node.offsetWidth;
  node.classList.add("is-shown");
  clearTimeout(timer);
  timer = setTimeout(() => node.classList.remove("is-shown"), ms);
}
