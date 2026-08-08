// Closure badge — the one place a venue's lifecycle (temporal.js) reaches the
// screen. Shared by the home card and the menu header so both say the same
// thing in the same words.
//
// This is deliberately the ONLY new UI the time dimension brought (ADR 0023):
// dated prices and dated menus resolve invisibly, because a diner choosing
// dinner should see today's menu and nothing else. A closure is the exception —
// hiding it would send someone across town to a locked door, and the app would
// be quietly wrong rather than quietly simple.

import { el } from "./dom.js";
import { t } from "./reo.js";

// "27 Aug" — short, NZ order, no year when it's this year. Accepts the reduced
// precision the schema allows ("2026-08" → "Aug 2026"; "2026" → "2026"), so a
// vaguely-dated reopening never renders as a false exact day.
function shortDate(iso, today) {
  if (typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-");
  const month = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ][Number(m) - 1];
  if (!m) return y;
  if (!d) return y === today.slice(0, 4) ? month : `${month} ${y}`;
  return y === today.slice(0, 4) ? `${Number(d)} ${month}` : `${Number(d)} ${month} ${y}`;
}

/**
 * A `.hours-badge` for a venue that isn't trading, or null when it is (the
 * overwhelmingly common case — the caller then falls through to its normal
 * open/closed hours badge).
 *
 * A temporary closure states when it's due back *only when we were told*; an
 * `overdue` one (the stated date passed with no reopening recorded) drops the
 * date rather than showing a promise the record can no longer support.
 */
export function closureBadge(r, today = "") {
  const c = r?.closure;
  if (!c || c.state === "trading") return null;

  let label;
  if (c.state === "closed-permanently") {
    label = t("closure.permanent", "Permanently closed");
  } else {
    label = t("closure.temporary", "Temporarily closed");
    const back = !c.overdue && shortDate(c.until, today);
    if (back) label += ` · ${t("closure.back", "back")} ${back}`;
  }

  const badge = el("span", { className: "hours-badge", textContent: label });
  badge.dataset.state = c.state;
  return badge;
}
