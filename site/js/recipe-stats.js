// The recipe page's stats panel — Prep · Cook · Serves · Difficulty (ADR 0125).
// Pure, so the wording and the estimate marking are unit-tested rather than
// eyeballed: the panel's whole claim is that a number the recipe did not give
// us is never shown bare (owner ruling 2026-08-16: estimates allowed, labelled).

export const DIFFICULTY_LABEL = {
  "very-easy": "Very easy",
  easy: "Easy",
  medium: "Medium",
  challenging: "Challenging",
};

// Minutes as a reader says them. Hours past the hour, because "570 min" is a
// sum the reader would have to do, and a long prep (an overnight rest) is the
// case where the number matters most.
export function formatMinutes(n) {
  if (!Number.isInteger(n) || n < 0) return null;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * The cells to draw, in order, each `{ key, label, value, estimated }`. A field
 * the recipe does not carry is left out rather than shown as "—": a panel of
 * blanks reads as broken, and "not stated" is already what absence means here.
 * `serves` is passed in already scaled, so the panel and the scaler agree.
 */
export function recipeStats(item, serves = item.serves) {
  const est = new Set(Array.isArray(item.estimated) ? item.estimated : []);
  const cells = [];
  const prep = formatMinutes(item.prepMinutes);
  if (prep) cells.push({ key: "prepMinutes", label: "Prep", value: prep });
  const cook = formatMinutes(item.cookMinutes);
  if (cook) cells.push({ key: "cookMinutes", label: "Cook", value: cook });
  if (Number.isInteger(serves)) cells.push({ key: "serves", label: "Serves", value: String(serves) });
  const diff = DIFFICULTY_LABEL[item.difficulty];
  if (diff) cells.push({ key: "difficulty", label: "Difficulty", value: diff });
  return cells.map((c) => ({ ...c, estimated: est.has(c.key) }));
}
