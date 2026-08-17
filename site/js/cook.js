// Cook mode — the model half (ROADMAP 17d, ADR 0034). One step on screen at a
// time, and the screen kept awake while you cook. `cook-ui.js` owns the DOM;
// everything here is pure or dependency-injected, so the two things that are
// easy to get wrong — the step boundaries and the wake-lock lifecycle — are
// provable under `node --test` without a browser.
//
// WHY THE WAKE LOCK IS THE WHOLE POINT. A recipe you cook from is a page you
// stare at with wet hands and never touch for four minutes; the phone sleeps
// and you have to dry off to see step 5. `navigator.wakeLock` fixes that in one
// call — but it has three sharp edges, and all three are handled below rather
// than in the UI:
//
//   1. IT IS NOT EVERYWHERE. Safari only got it in iOS 16.4, and a browser
//      without it must simply behave as it always did — no error, no warning,
//      no dead switch. Every entry point here returns a reason instead of
//      throwing, and the caller shows the "screen stays on" note only on a
//      genuine hold.
//   2. THE OS TAKES IT BACK. Hiding the page (a phone call, a tab switch, the
//      screen locking anyway) releases the lock permanently — re-showing the
//      page does NOT restore it. So we keep our own `wanted` flag and re-ask on
//      every visibilitychange; without that, cook mode silently stops working
//      the first time someone answers a text.
//   3. IT MUST BE GIVEN BACK. A lock left held after cook mode closes burns
//      battery on a page nobody is reading. release() is the only way out and
//      it clears `wanted`, so a late visibilitychange can't resurrect it.

/** Steps a recipe can be cooked from. A recipe with none can't enter cook mode. */
export function stepsOf(item) {
  const steps = item?.steps;
  return Array.isArray(steps) ? steps.filter((s) => typeof s === "string" && s.trim() !== "") : [];
}

/** Whether the "Cook mode" affordance should exist at all (23 of 24 recipes). */
export const canCook = (item) => stepsOf(item).length > 0;

// --- What each step needs, in the step's own words ------------------------
//
// Owner, 2026-08-16, in two goes. First: the Ingredients button sat on every
// step, including "Preheat the oven to 180°C and line a 1.5–2L ovenproof dish
// with baking paper" — a step with nothing to measure. Then the better idea
// that replaced the button altogether: *"I want some other UI element shown by
// default that shows just the ingredients and quantity used at that step… Then
// the text describing the step can stay short and simple to read."*
//
// So a step no longer offers the whole list behind a tap; it SHOWS the lines it
// is about, and shows nothing when it is about none of them. The instruction
// gets to stay short because the quantities are already on screen beside it.
//
// 🛑 WHAT THIS CANNOT DO, AND WHY. The owner's example — 2 cups of sugar in
// total, 1 cup used at this step — is not derivable. `ingredients` is a flat
// list of free-text lines and `steps` is a flat list of sentences; nothing ties
// a line to a step, and no line records a split. So this shows the recipe's
// stated quantity for each ingredient the step names, which is right whenever
// an ingredient is used all at once (every case in the current corpus) and
// overstates it when a recipe divides one line across two steps. Splitting a
// quantity needs the ingredient/step link in the DATA — a schema change, an
// ADR, and a pass over all 23 recipes. Recorded as ROADMAP Theme 36b; guessing
// the split here would be inventing a fact about food, which this repo does not
// do.
//
// THE BIAS IS DELIBERATE AND ONE-WAY: when in doubt, SHOW the line. A missing
// ingredient mid-cook is a real failure; a redundant one is a blemish. A recipe
// whose ingredients cannot be parsed at all shows its whole list on every step,
// exactly as the old button did.
//
// 🚩 THIS PARAGRAPH USED TO CLAIM "every rule below only ever *fails to hide*",
// AND THAT WAS FALSE — measured, not argued. The ambiguity rule below hid the
// line the step was asking for on three real recipes: Upside-Down Plum Cake's
// butter (topping and batter both list one), Chocolate Self-Saucing Pudding's
// cocoa (pudding and sauce both list one) and Easy Pad Thai's peanuts (the oil
// and the roasted nuts). A corpus sweep found 23 such (step, line) pairs. The
// rule is fixed rather than the sentence — see `ingredientsForStep` — because
// the bias IS the design, and a rule that hides what a step names is not a
// blemish, it is the failure the bias exists to prevent. What the sentence can
// honestly say now: no rule below hides a line whose own words the step uses.
// It still cannot promise the converse — a step naming an ingredient in words
// the line never uses ("the dry ingredients", a synonym) matches nothing, and
// nothing here can know it should.

// Measurements, packaging and size words — they appear in ingredient lines and
// in instructions alike ("2 cups flour" / "spoon into the dish"), so matching on
// them would make every step look like it used something.
const MEASURE_WORDS = new Set([
  "cup", "cups", "tsp", "tsps", "teaspoon", "teaspoons", "tbsp", "tbsps",
  "tablespoon", "tablespoons", "ml", "l", "litre", "litres", "g", "kg", "gram",
  "grams", "oz", "lb", "pinch", "dash", "handful", "packet", "packets", "pkt",
  "can", "cans", "tin", "tins", "jar", "bunch", "punnet", "sheet", "sheets",
  "large", "small", "medium", "extra", "approx", "about", "plus", "for", "the",
  "and", "or", "of", "to", "as", "required", "needed", "taste", "serve",
  "serving", "optional", "each", "any", "some", "few",
]);

// Crude plural stem, applied to BOTH sides so it only ever has to be
// self-consistent, never linguistically right ("wedges" → "wedg" is fine as
// long as the ingredient stems the same way). It exists because the corpus
// keeps ingredients in the plural and instructions in the singular: "3 eggs,
// separated" against "beat the egg whites", "4 prune plums" against "over the
// plum wedges". Both were wrongly hidden before this was added.
const stem = (w) => (w.length > 3 ? w.replace(/(?:es|s)$/, "") : w);

/** Lower-case, strip accents/punctuation to spaces, collapse runs, stem. */
const words = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(stem);

// Words that describe PREPARATION or EQUIPMENT rather than food. They occur in
// ingredient lines and in instructions alike, so letting one match would make a
// step claim things it never touches: "baking powder" would claim "line the
// dish with baking paper" — the exact step the owner pointed at.
const PREP_WORDS = new Set([
  "baking", "cooking", "frying", "ground", "grated", "chopped", "melted",
  "sifted", "crushed", "softened", "peeled", "sliced", "diced", "beaten",
  "warm", "cold", "hot", "room", "temperature",
]);

/**
 * The searchable terms of one ingredient line: the whole phrase, and each
 * significant word in it.
 *
 * "Sauce: ½ cup (125 ml) brown sugar" → ["brown sugar", "brown", "sugar"]
 * "100g butter, softened"             → ["butter"]
 * "Water or milk, as required…"       → ["water", "milk"]
 *
 * The shape it exploits is that a line names its ingredient BEFORE the first
 * comma and AFTER the quantity — everything past the comma is preparation
 * ("softened", "finely chopped"), which is instruction language and would match
 * steps it has nothing to do with. A leading "Sauce:"-style label is a grouping
 * hint, not an ingredient, so it goes too.
 */
export function ingredientTerms(line) {
  const head = String(line ?? "")
    .replace(/^[^:,]{0,20}:\s*/, "") // "Sauce: …" — a group label, not a thing
    .split(",")[0] // before the first comma: the thing, not its preparation
    .replace(/\([^)]*\)/g, " "); // "(190 ml)" — a restatement of the quantity
  const terms = new Set();
  for (const fragment of head.split(/\bor\b|\band\b|\//)) {
    const kept = words(fragment).filter(
      (w) => w.length >= 3 && !MEASURE_WORDS.has(w) && !PREP_WORDS.has(w)
    );
    if (!kept.length) continue;
    terms.add(kept.join(" ")); // the whole phrase — "brown sugar"
    for (const w of kept) terms.add(w); // and each word — "brown", "sugar"
  }
  return [...terms];
}

/**
 * The ingredient lines this step is about, in the recipe's own order — what the
 * per-step panel shows. Empty means the step needs nothing (it preheats, it
 * bakes, it chills), and the panel is then absent rather than empty.
 *
 * Head words are matched whole ("flour" must not fire on "flourish"), and the
 * FIRST word of a multi-word ingredient is deliberately not a term on its own —
 * that is what stops "baking powder" from claiming "line the dish with baking
 * paper", the exact step the owner pointed at.
 */
export function ingredientsForStep(step, ingredients) {
  const list = (Array.isArray(ingredients) ? ingredients : []).filter(
    (l) => typeof l === "string" && l.trim() !== ""
  );
  if (!list.length) return [];
  const haystack = ` ${words(step).join(" ")} `;
  // A step that says "ingredients" out loud is asking for the list by name —
  // Sticky Date Pudding's "place all the sauce ingredients in a pot" names not
  // one of them, and was the worst omission this rule produced. Same fallback
  // when nothing parsed: show everything rather than risk hiding what's needed.
  const termsOf = new Map(list.map((l) => [l, ingredientTerms(l)]));
  if (![...termsOf.values()].some((t) => t.length) || haystack.includes(" ingredient ")) {
    return list;
  }
  // A SINGLE word shared by two different ingredients cannot tell them apart:
  // "white sugar" and "brown sugar" both end in "sugar", so a step that beats
  // the white sugar would drag the sauce's brown sugar in with it. Such a word
  // is usable only inside its full phrase. Caught by the tests, not by reading.
  const seen = new Map();
  for (const terms of termsOf.values()) {
    for (const t of new Set(terms)) seen.set(t, (seen.get(t) || 0) + 1);
  }
  const usable = (t) => t.includes(" ") || seen.get(t) === 1;
  const named = (t) => haystack.includes(` ${t} `);
  const shown = new Set(
    list.filter((line) => termsOf.get(line).some((t) => usable(t) && named(t)))
  );

  // …AND WHEN THE SHARED WORD IS ALL THE STEP SAYS, SHOW EVERY LINE THAT CARRIES
  // IT. The pass above is only half the answer: "Cream the butter and sugar"
  // names butter and nothing more specific, so on a recipe listing butter twice
  // it settled nothing and the step showed NO butter at all. That is the bias
  // inverted — the reader is at the bench being told this step needs nothing,
  // about the one ingredient it names. Three real recipes did it (see the
  // header). So an ambiguous word the step uses falls back to showing all of its
  // lines, which is the honest answer to "I can't tell which one": both.
  //
  // The guard is what keeps the "brown sugar" case working. A fallback fires
  // only when NOTHING the word belongs to was already matched — "Beat together
  // the white sugar…" matches that line on its phrase, so "sugar" has been
  // answered and the sauce's brown sugar stays out. It is the step's own
  // specificity that decides, never a count.
  for (const [t, count] of seen) {
    if (count < 2 || t.includes(" ") || !named(t)) continue;
    const carriers = list.filter((line) => termsOf.get(line).includes(t));
    if (carriers.some((line) => shown.has(line))) continue;
    for (const line of carriers) shown.add(line);
  }
  return list.filter((line) => shown.has(line));
}

/** Whether this step needs anything at all — `ingredientsForStep`, as a test. */
export const stepUsesIngredients = (step, ingredients) =>
  ingredientsForStep(step, ingredients).length > 0;

// --- How long a step takes, and the timer that runs it -------------------
//
// Owner, 2026-08-16: *"A step like this one where no work is required by the
// chef (cooking in oven, waiting etc) should have a one tap timer."*
//
// THE DURATION IS READ, NEVER GUESSED. "Bake at 180°C for 35 minutes" says 35
// minutes; "Beat together the sugar and butter" says nothing, and this returns
// null rather than inventing a number. That line matters: a wrong timer on a
// cake is a burnt cake, and a made-up "≈3 min" would be a claim with no source.
// 17 of the 24 recipes have at least one step that states its own time, which
// is where every timer in the app comes from.
//
// A RANGE TAKES ITS LOWER BOUND. "Bake 5–8 minutes" times 5, because the timer
// exists to bring you back to the oven, and coming back early to look is right
// while coming back at 8 may already be too late.

const UNIT_SECONDS = { sec: 1, second: 1, min: 60, minute: 60, hr: 3600, hour: 3600 };

// "for 35 minutes", "8 hours", "5–8 minutes", "1 hr", "90 seconds". The number
// must be followed by a time unit, so oven temperatures ("180°C"), tin sizes
// ("20cm") and yields ("makes 21") can never be read as a duration.
const DURATION = /(\d+(?:\.\d+)?)\s*(?:[–—-]\s*\d+(?:\.\d+)?\s*)?(sec|second|min|minute|hr|hour)s?\b/i;

/**
 * Seconds this step states it takes, or null if it doesn't say. Pure.
 *
 * Only the FIRST duration in the step is used. A step that says two things
 * ("bake 12 minutes, then a further 5–8") is timing its first leg; the second
 * is a fresh decision the cook makes when the first bell goes, and a timer that
 * silently ran 20 minutes would be wrong about both.
 */
export function stepDuration(step) {
  const m = DURATION.exec(String(step ?? ""));
  if (!m) return null;
  const value = Number(m[1]);
  const unit = UNIT_SECONDS[m[2].toLowerCase()];
  if (!Number.isFinite(value) || value <= 0 || !unit) return null;
  const seconds = Math.round(value * unit);
  // A "timer" of a few seconds is noise, and one over a day is a slow-cooker
  // instruction nobody stands and watches. Both stay as plain text.
  return seconds < 30 || seconds > 86_400 ? null : seconds;
}

/** "35:00", "1:05:00" — a clock, not prose, so it reads at arm's length. */
export function formatDuration(seconds) {
  const t = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * A countdown that survives being backgrounded, because it stores the wall
 * clock it ends at rather than decrementing a counter — a phone that sleeps
 * mid-bake stops firing intervals, and a decrementing timer would come back
 * minutes slow with no way to tell. `now` is injected so this is testable
 * without waiting 35 real minutes.
 *
 * One tap starts it, one tap pauses it, and reset() puts it back to the top.
 */
export function createTimer(totalSeconds, now = () => Date.now()) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  let endsAt = null; // set while running
  let left = total; // authoritative while paused

  const remaining = () =>
    endsAt === null ? left : Math.max(0, Math.round((endsAt - now()) / 1000));

  return {
    total,
    remaining,
    running: () => endsAt !== null && remaining() > 0,
    done: () => remaining() === 0 && (endsAt !== null || left !== total),
    /** Start, or resume from where a pause left it. No-op when already running. */
    start() {
      if (endsAt !== null || left <= 0) return;
      endsAt = now() + left * 1000;
    },
    /** Freeze the countdown, keeping what's left. No-op when already paused. */
    pause() {
      if (endsAt === null) return;
      left = remaining();
      endsAt = null;
    },
    /** One tap does whichever of the two makes sense — the owner's ask. */
    toggle() {
      endsAt === null ? this.start() : this.pause();
    },
    reset() {
      endsAt = null;
      left = total;
    },
  };
}

// --- Reading the step out loud (ROADMAP 17e) ------------------------------
//
// `speechSynthesis` is in the browser already, so this adds no dependency to a
// repo that ships without any (ADR 0001). It is genuinely the right feature for
// the screen: hands in a bowl, phone propped against it, eyes on the food.
//
// 🚩 WHAT "NO DEPENDENCY" DOES AND DOES NOT MEAN. It is true of the CODE and
// not necessarily of the RUNTIME. Several platforms serve their better voices
// from a server — Chrome's non-local voices are fetched, and iOS downloads
// enhanced voices on demand — so a phone in flight mode may fall back to a
// local voice, or say nothing at all. Faves precaches everything else and works
// offline; this one control may not, and nothing here can promise otherwise. It
// is therefore an offer, never a substitute for the text on screen, which stays
// exactly where it was.
//
// THE LEAK IS THE WAKE LOCK'S LEAK, IN ANOTHER COAT. Speech outlives the page
// that started it: `speechSynthesis` belongs to the browser, not to the
// document, so an utterance left running when cook mode closes keeps talking at
// someone reading something else. ADR 0034 learned this the hard way about a
// sentinel nobody released. Every exit path therefore cancels — closing, a step
// change, a second tap, and the page going away.

/**
 * A speaker with one utterance at a time. Everything is injected so the
 * lifecycle is provable under `node --test` against a fake synthesiser — but
 * note what that proves and what it cannot: the calls, never the sound.
 *
 * @param {object} deps
 * @param {SpeechSynthesis} [deps.synth] the API, or undefined where the browser
 *        has none — treated as "unsupported", which must show as NO CONTROL AT
 *        ALL rather than as a button that does nothing.
 * @param {Function} [deps.Utterance] the SpeechSynthesisUtterance constructor.
 * @param {() => void} [deps.onIdle] called when speech stops of its own accord,
 *        so the UI can put its button back.
 */
export function createSpeaker({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  onIdle = () => {},
} = {}) {
  let speaking = false;

  const supported = () =>
    !!synth && typeof synth.speak === "function" && typeof Utterance === "function";

  function settle() {
    if (!speaking) return;
    speaking = false;
    onIdle();
  }

  function stop() {
    speaking = false;
    if (!supported()) return { ok: false, reason: "unsupported" };
    try {
      // Cancels what is speaking AND empties the queue. Both matter: a queued
      // utterance nobody can see would start talking after the step changed.
      synth.cancel();
    } catch {
      /* a browser tearing the page down — nothing left for us to hand back */
    }
    return { ok: true, reason: "stopped" };
  }

  /** Speak `text`, replacing anything already speaking. Never queues. */
  function speak(text, { lang = "en-NZ" } = {}) {
    const words = String(text ?? "").trim();
    if (!supported()) return { ok: false, reason: "unsupported" };
    if (!words) return { ok: false, reason: "empty" };
    stop(); // a second tap replaces, never stacks
    let u;
    try {
      u = new Utterance(words);
    } catch {
      return { ok: false, reason: "denied" };
    }
    u.lang = lang;
    // `end` also fires on a cancel, and `error` fires on a platform with the
    // API but no usable voice — headless browsers and some Linux desktops.
    // Both mean "not speaking any more", which is all the button needs to know.
    u.onend = settle;
    u.onerror = settle;
    speaking = true;
    try {
      synth.speak(u);
    } catch {
      speaking = false;
      return { ok: false, reason: "denied" };
    }
    return { ok: true, reason: "speaking" };
  }

  return { supported, speaking: () => speaking, speak, stop };
}

/** Keep an index inside [0, count-1]; an empty recipe pins at 0. */
export function clampIndex(index, count) {
  const n = Number.isFinite(index) ? Math.trunc(index) : 0;
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(Math.max(n, 0), count - 1);
}

/**
 * The whole navigable state for a step index. `atLast` is what turns the
 * forward button into "Done" — cook mode's only exit that isn't a dismissal.
 */
export function stepState(index, count) {
  const total = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
  const i = clampIndex(index, total);
  return {
    index: i,
    count: total,
    number: total ? i + 1 : 0,
    atFirst: i === 0,
    atLast: total === 0 || i === total - 1,
    label: stepLabel(i, total),
  };
}

/**
 * "Step 3 of 9". Interpolated, so it stays English by reo.js's stated rule (the
 * engine swaps whole strings only) — same as "Serves 4" and the hours badges.
 */
export function stepLabel(index, count) {
  if (!Number.isFinite(count) || count <= 0) return "No steps";
  return `Step ${clampIndex(index, count) + 1} of ${Math.trunc(count)}`;
}

/**
 * Move by `delta` steps, saturating at both ends rather than wrapping. Wrapping
 * was rejected on purpose: step 9 → step 1 on a stray tap looks like the recipe
 * restarted, and in a kitchen that is a real mistake, not a nuisance.
 */
export const advance = (index, count, delta) => clampIndex(clampIndex(index, count) + (Number.isFinite(delta) ? Math.trunc(delta) : 0), count);

/** Keyboard → step move. Returns null for a key cook mode doesn't own. */
export function keyToIndex(key, index, count) {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return advance(index, count, 1);
    case "ArrowLeft":
    case "ArrowUp":
      return advance(index, count, -1);
    case "Home":
      return clampIndex(0, count);
    case "End":
      return clampIndex(count - 1, count);
    default:
      return null;
  }
}

/**
 * A wake lock with a memory. Everything is injected so the lifecycle is
 * testable against a fake `navigator.wakeLock`-shaped object.
 *
 * @param {object} deps
 * @param {{request:(type:string)=>Promise<any>}} [deps.wakeLock] the API, or
 *        undefined on a browser that doesn't have it (the common case on older
 *        iOS — treated as "unsupported", never as an error).
 * @param {() => boolean} [deps.isVisible] whether the page is on screen.
 */
export function createWakeLock({
  wakeLock = globalThis.navigator?.wakeLock,
  isVisible = () => globalThis.document?.visibilityState !== "hidden",
} = {}) {
  let sentinel = null;
  let wanted = false;
  let inflight = null;

  const supported = () => typeof wakeLock?.request === "function";
  // A sentinel the OS has taken back reports `released: true`; treat that as
  // not-held even if no `release` event reached us.
  const held = () => sentinel != null && sentinel.released !== true;

  function forget(s) {
    if (sentinel === s) sentinel = null;
  }

  /**
   * Hand the sentinel back without forgetting that cook mode wants one. Used
   * both by release() and by hiding the page — the difference is only what
   * happens to `wanted`.
   */
  async function drop() {
    const s = sentinel;
    sentinel = null;
    if (!s) return "idle";
    try {
      await s.release?.();
      return "released";
    } catch {
      // Already released, or the page is going away. Our reference is gone
      // either way, so nothing can double-release it.
      return "failed";
    }
  }

  async function acquire() {
    wanted = true;
    if (!supported()) return { ok: false, reason: "unsupported" };
    if (held()) return { ok: true, reason: "held" };
    // A second request while the first is in flight would take out two locks
    // and leak one — visibilitychange can fire twice in a heartbeat.
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const s = await wakeLock.request("screen");
        // Cook mode may have closed while the request was in the air. Nothing
        // holds a reference to this sentinel yet, so if we stored it, release()
        // has already run and the lock would be stranded held forever.
        if (!wanted) {
          await s?.release?.().catch?.(() => {});
          return { ok: false, reason: "abandoned" };
        }
        // The OS can drop it at any time (low battery, and on some platforms
        // simply backgrounding). Clearing our reference is what lets the next
        // visibilitychange re-acquire instead of believing it still holds one.
        s?.addEventListener?.("release", () => forget(s));
        sentinel = s;
        return { ok: true, reason: "acquired" };
      } catch {
        // NotAllowedError (permissions policy, or a page the UA won't grant).
        // Degrade silently: cook mode works, the screen just sleeps as usual.
        return { ok: false, reason: "denied" };
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  async function release() {
    wanted = false;
    const reason = await drop();
    return { ok: reason !== "failed", reason };
  }

  /**
   * Call on every `visibilitychange`. Re-acquires only when cook mode still
   * wants the lock and the page is actually on screen — requesting while hidden
   * is rejected by the spec, so it would just log noise.
   */
  async function onVisibilityChange() {
    if (!wanted) return { ok: false, reason: "not-wanted" };
    if (!isVisible()) {
      // The platform releases the lock when the page hides — but release it
      // ourselves too rather than merely forgetting the sentinel. Measured in
      // headless Chrome: a page that *reports* hidden without the platform
      // having actually released leaves a lock nothing holds a reference to,
      // and it is then never given back. `wanted` stays set, so returning to
      // the recipe re-acquires.
      await drop();
      return { ok: false, reason: "hidden" };
    }
    if (held()) return { ok: true, reason: "held" };
    return acquire();
  }

  return { supported, held, wanted: () => wanted, acquire, release, onVisibilityChange };
}
