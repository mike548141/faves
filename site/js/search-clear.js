// The custom clear ✕ shared by the home search (app.js) and the in-menu search
// (menu.js) — the native type=search clear is WebKit-only, so both fields roll
// their own and must behave identically: clicking the ✕ empties the field, runs
// the caller's `apply`, and refocuses so you can retype; Escape does the same
// without stealing focus back. Callers still toggle `clear.hidden` inside their
// own input handler (they do other work there too).
export function wireSearchClear(input, clear, apply) {
  const reset = (refocus) => {
    input.value = "";
    apply();
    if (refocus) input.focus(); // keep the keyboard up so you can retype straight away
  };
  if (clear) clear.addEventListener("click", () => reset(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) reset(false);
  });
}
