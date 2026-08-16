#!/usr/bin/env node
// Does the recipe page's ingredient list hold its shape? (ROADMAP 37l/37c/37m/37d.)
//
// WHY THIS EXISTS. Four things landed on this screen at once and every one of
// them is a LAYOUT promise — a class of promise this repo has already been
// bitten by twice, because layout is exactly what a unit test cannot see and
// what an eyeball sees only at the one width it happened to be looking at:
//
//   37l  a recipe built from parts names them, and no line is lost in the
//        regrouping. `ingredients.test.js` proves the pure function; nothing
//        proved the render, and "the h3s appeared" is not the same claim as
//        "all twelve lines are still tickable".
//   37c  the fold is remembered. A preference is only remembered if it survives
//        a real page load out of real storage — a re-render proves nothing.
//   37m  the two tick columns line up. The bug was 1.6em of horizontal drift
//        and a step number floating to the middle of a wrapped step. Both were
//        invisible on a one-line step, which is why they survived so long.
//   37d  two columns, but only where a second one fits and only on a long list.
//        Three guards in one CSS rule, each of which is trivially satisfiable
//        by reading the stylesheet and none of which is proven by reading it.
//   17a  scaling the ingredients. `quantity.js` is proven to 23 unit tests, but
//        the two claims that would hurt are both about the DOM: that the number
//        on screen really changed, and — the one that fails SILENTLY — that a
//        TICK survives the change. Key the tick on the rendered line instead of
//        the raw one and every box empties the moment the reader picks 2×;
//        nothing throws, nothing logs, and they have lost their place in a bowl
//        they cannot un-pour. Also that a refused line is marked in WORDS, not
//        only in colour, and that a recipe with nothing to scale is offered no
//        control at all.
//
// So everything below is MEASURED off real rectangles at explicitly-set widths.
// Nothing is inferred from `getComputedStyle`, because a property can be present
// and still not do the thing — the same lesson `filter_row_check.mjs` learned
// when a row satisfied every rule it was written to and still wrapped.
//
// HOW THE STEP NUMBER IS MEASURED, GIVEN IT IS A PSEUDO-ELEMENT. `::before` has
// no element, so `getBoundingClientRect` cannot reach it and this check would
// otherwise have had to settle for asserting `align-items: start` and hoping.
// It does not: Chrome exposes pseudo-elements as real nodes over the DevTools
// protocol (`DOM.describeNode` → `pseudoElements` → `DOM.getBoxModel`), and that
// box is the layout engine's own. So "the numeral sits beside the first line"
// is arithmetic on two real boxes — the numeral's and the tick's — not a CSS
// property read. The `align-items` value is reported alongside as a diagnostic
// only; it is never what the assertion turns on.
//
// WHAT A GREEN RUN HERE CANNOT TELL YOU:
//   1. Whether two columns actually READ better. The owner asked us to
//      "consider it" and that judgement stayed his. This can only say a second
//      column appears where the rule promises one and nowhere else.
//   2. Anything about Safari/WebKit. The whole of 37d hangs on `:has()` and CSS
//      multicol fragmentation, and 37c on `<details>`'s toggle timing — three
//      features whose engines differ most. This is Chrome, and only Chrome.
//   3. Whether the fold is remembered on a real phone. What is proven is that
//      the preference survives a real navigation out of real localStorage in
//      one profile; an evicted store, a fresh install or a second device is a
//      different question (and the sync one, answered elsewhere).
//   4. Whether the component names are TRUE — that this pudding really has a
//      "Sauce" and that those four lines belong to it. No browser checks data
//      against a kitchen. The count is checked against the JSON, so nothing is
//      silently dropped; whether the JSON is right is a human's problem.
//   5. Whether the numeral is legible or the columns are readable at any
//      particular text size. Two sizes are swept because the `column-width`
//      guard is a claim about text size; that is a claim about layout, not
//      about reading.
//   6. 🛑 Whether a scaled quantity is RIGHT. This tool asks `quantity.js` what
//      the line should become and then checks the page agrees — so a parser
//      that is confidently wrong passes here every time, in perfect agreement
//      with itself. The defence against that is not in this file: it is the
//      round trip inside `scaleLine` (ADR 0076) plus 23 unit tests whose
//      expectations were hand-checked against the corpus. And no browser can
//      tell you whether doubling a recipe makes good food — the bake time
//      deliberately does not scale, and that is a judgement, not a bug.
//
//     node tools/recipe_check.mjs            # headless, exit 0 = pass
//     node tools/recipe_check.mjs -v         # narrate each step
//     node tools/recipe_check.mjs --help
//
// Exit status: 0 every assertion held; 1 at least one didn't; 2 the harness
// itself could not run (no Chrome, page never rendered, fixture missing).
//
// NOT PART OF THE SHIPPED SITE — dev tooling, like tools/serve.py. No npm
// install, no dependency added to site/ (ADR 0001).

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  Cdp,
  Report,
  createDriver,
  launchChrome,
  settleUntil,
  sleep,
  startServer,
  stopChrome,
  until,
} from "./lib/browser.mjs";
// The app's own slugger and its own list normaliser, so the ?dish= URLs this
// tool builds and the line counts it expects are the ones the app itself would
// produce. A second copy of either could drift and quietly test nothing.
import { slug } from "../site/js/slug.js";
import { ingredientBlocks, ingredientCount } from "../site/js/ingredients.js";
import { SCALES, scaleFor, scaleLineStatus } from "../site/js/quantity.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const SITE = join(ROOT, "site");
const COLLECTION = "cook-at-home";

// Both widths are set explicitly, never inherited from the machine's window:
// every assertion below is a claim about ONE width, and a check whose verdict
// depends on the laptop it ran on gets switched off within a week
// (branch_check.mjs's header, and the same reason it refuses to read the clock).
const NARROW = 390; // the design target (CLAUDE.md)
const WIDE = 1100; // comfortably past the 45rem two-column breakpoint
const HEIGHT = 844;

// The number of assertions a COMPLETE run makes. Checked at the end, so the
// summary line cannot be reached by a run that fell out of the middle: this
// repo has shipped a wall of PASS lines followed by a harness error and no
// verdict more than once (sync_check.mjs, still). Add an assertion, bump this.
const EXPECTED_ASSERTIONS = 29;

const HELP = `Faves recipe-page check — verify the ingredient list's layout in a real browser.

  node tools/recipe_check.mjs [options]

Serves site/ locally, launches Google Chrome headless on a throwaway profile,
and measures the recipe page at two explicit widths and two text sizes:

  · components render as real headings and no ingredient line is lost (37l)
  · the fold is remembered across a real page load (37c)
  · the ingredient and method tick columns share a left edge (37m)
  · a wrapped step's number sits beside its FIRST line, measured off the
    pseudo-element's own box over the DevTools protocol (37m)
  · two columns only where a second fits, and only on a list of six or more (37d)

Fixtures are chosen from site/data/restaurants/${COLLECTION}.json at run time —
never hard-coded line numbers — and named in the output, so an edited corpus
changes what is measured rather than silently measuring nothing.

Options:
  --dish <name|slug>  Override the GROUPED fixture (default: the mixed-shape
                      recipe with the most lines). Its component assertions
                      only mean anything if that recipe is actually grouped.
  --port <n>          Port for the local static server (default: an unused one).
  --headed            Show the browser window (for watching it work).
  --keep-profile      Leave the temporary Chrome profile behind, and say where.
  -v, --verbose       Print every step, not just the assertions.
  -h, --help          This message.

Requires Google Chrome (set FAVES_CHROME to point elsewhere). No npm install —
the site ships build-less and this tool adds no dependency to it (ADR 0001).`;

// --- What one width's worth of layout looks like --------------------------

// Every number here is off a real rectangle. `cols` is the count of DISTINCT
// left edges among a list's rows: one column is one left edge, and two columns
// is two — which is a fact about where the browser put the boxes rather than a
// fact about what the stylesheet asked for.
const LAYOUT = `(() => {
  const round = (n) => +n.toFixed(2);
  const lists = [...document.querySelectorAll(".recipe-body .ingredients")].map((ul) => {
    const items = [...ul.children].filter((n) => n.tagName === "LI");
    const lefts = items.map((li) => Math.round(li.getBoundingClientRect().left));
    const heading = ul.previousElementSibling;
    return {
      lines: items.length,
      cols: new Set(lefts).size,
      lefts: [...new Set(lefts)].sort((a, b) => a - b),
      // A row with no box is a row nobody can tick, however present it is.
      allRendered: items.every((li) => {
        const r = li.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      }),
      width: Math.round(ul.getBoundingClientRect().width),
      component:
        heading && heading.classList.contains("ingredient-component")
          ? heading.textContent
          : null,
    };
  });
  const fold = document.querySelector("details.ingredients-fold");
  const firstIngTick = document.querySelector(".recipe-body .ingredients .tick");
  const firstMethodTick = document.querySelector(".recipe-body .method .tick");
  return {
    lists,
    components: [...document.querySelectorAll(".ingredient-component")].map((h) => ({
      tag: h.tagName,
      text: h.textContent,
    })),
    // The tick rows the reader can actually tick, ingredients and method both.
    ticks: document.querySelectorAll(".recipe-detail-page .tick-box").length,
    ingredientTicks: document.querySelectorAll(".recipe-body .ingredients .tick-box").length,
    methodTicks: document.querySelectorAll(".recipe-body .method .tick-box").length,
    foldPresent: !!fold,
    foldOpen: !!fold && fold.open,
    // The h2 must live INSIDE the summary: the heading outline has to read the
    // same folded or not, or a screen-reader reader loses "Ingredients" by
    // folding it away.
    headingInSummary: !!fold?.querySelector("summary h2.recipe-head"),
    ingTickLeft: firstIngTick ? round(firstIngTick.getBoundingClientRect().left) : null,
    methodTickLeft: firstMethodTick ? round(firstMethodTick.getBoundingClientRect().left) : null,
    // Every method row, with the numbers the wrap assertion needs. The scroll
    // offsets are carried because the DevTools box model reports PAGE
    // coordinates while getBoundingClientRect reports viewport ones; the two
    // are only comparable once one of them is offset.
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    docOverflow:
      document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
    steps: [...document.querySelectorAll(".recipe-body .method > li")].map((li) => {
      const r = li.getBoundingClientRect();
      const tick = li.querySelector(".tick");
      const t = tick ? tick.getBoundingClientRect() : null;
      return {
        top: round(r.top),
        height: round(r.height),
        lineHeight: parseFloat(getComputedStyle(li).lineHeight),
        // Reported so a failure says WHY, never asserted on — a property can be
        // set and still not move anything, which is the whole reason this file
        // measures boxes.
        alignItems: getComputedStyle(li).alignItems,
        tickTop: t ? round(t.top) : null,
      };
    }),
  };
})()`;

// --- Runner ---------------------------------------------------------------

async function run(opts) {
  const report = new Report(opts.verbose);

  const data = JSON.parse(
    await readFile(join(SITE, "data", "restaurants", `${COLLECTION}.json`), "utf8")
  );
  const items = (data.menu || []).flatMap((s) => s.items || []);
  const blocksOf = (i) => ingredientBlocks(i.ingredients);
  const grouped = (i) => blocksOf(i).some((b) => b.component);
  const byLines = (a, b) => ingredientCount(b.ingredients) - ingredientCount(a.ingredients);

  // Fixtures are DERIVED, never named: the corpus is edited constantly and a
  // check pinned to "Chocolate Self-Saucing Pudding" starts measuring something
  // else the first time a recipe gains a line. Each is printed below.
  //
  // The grouped one wants the harder shape — loose lines AND a component — plus
  // a method to align against, plus one list of six or more and one under six,
  // so 37d's rule and its counter-example are proven on ONE page where nothing
  // but the line count differs between them.
  const groupFixture = opts.dish
    ? items.find((i) => i.name === opts.dish || slug(i.name) === slug(opts.dish))
    : [...items]
        .filter(
          (i) =>
            grouped(i) &&
            blocksOf(i).some((b) => !b.component) &&
            (i.steps || []).length > 0 &&
            blocksOf(i).some((b) => b.lines.length >= 6) &&
            blocksOf(i).some((b) => b.lines.length < 6)
        )
        .sort(byLines)[0];
  if (!groupFixture) throw new Error(`no grouped recipe fixture in ${COLLECTION}`);

  // The contrast case for 37l: no components at all, and still a list.
  const flatFixture = [...items]
    .filter((i) => !grouped(i) && ingredientCount(i.ingredients) >= 6 && (i.steps || []).length)
    .sort(byLines)[0];
  if (!flatFixture) throw new Error(`no ungrouped recipe fixture in ${COLLECTION}`);

  // The contrast case for 37d: a whole recipe too short to columnise.
  const shortFixture = [...items]
    .filter((i) => !grouped(i) && ingredientCount(i.ingredients) > 0)
    .sort((a, b) => ingredientCount(a.ingredients) - ingredientCount(b.ingredients))
    .filter((i) => ingredientCount(i.ingredients) < 6)[0];
  if (!shortFixture) throw new Error(`no short-list recipe fixture in ${COLLECTION}`);

  // 17a's fixtures, derived the same way. `statuses` is the module's own verdict
  // on a recipe, so the tool and the page can never disagree about what SHOULD
  // happen — only about whether it did.
  const statuses = (i, key) =>
    ingredientBlocks(i.ingredients)
      .flatMap((b) => b.lines)
      .map((l) => scaleLineStatus(l.text, scaleFor(key)).status);
  const count = (i, key, want) => statuses(i, key).filter((s) => s === want).length;

  // Something to double, and a first line that actually moves — the tick-survival
  // assertion reads line one, so a fixture whose first line is "Pinch of salt"
  // would pass it while proving nothing.
  const scaleFixture = [...items]
    .filter((i) => statuses(i, "double")[0] === "scaled" && count(i, "double", "scaled") >= 3)
    .sort(byLines)[0];
  if (!scaleFixture) throw new Error(`no scalable recipe fixture in ${COLLECTION}`);

  // The half-scaled state: some lines scale and at least one is refused. This is
  // the shape 17a's safety argument is about, so a corpus that stopped
  // containing one would make the marking assertions vacuous.
  const blockedFixture = [...items]
    .filter((i) => count(i, "half", "blocked") >= 1 && count(i, "half", "scaled") >= 1)
    .sort((a, b) => count(b, "half", "blocked") - count(a, "half", "blocked"))[0];
  if (!blockedFixture) throw new Error(`no partly-scalable recipe fixture in ${COLLECTION}`);

  // The counter-example: nothing to scale at all. May legitimately not exist —
  // handled at the assertion rather than thrown here, so its absence is
  // reported as unproven instead of aborting a run that is otherwise complete.
  const unscalableFixture = [...items].find(
    (i) => ingredientCount(i.ingredients) > 0 && count(i, "double", "scaled") === 0
  );

  const { server, port } = await startServer(opts.port, SITE);
  const profileDir = await mkdtemp(join(tmpdir(), "faves-recipe-check-"));
  let chrome = null;
  let cdp = null;

  try {
    const base = `http://127.0.0.1:${port}`;
    const url = (item) => `${base}/recipe.html?id=${COLLECTION}&dish=${slug(item.name)}`;
    console.log("Faves recipe-page check — ROADMAP 37l / 37c / 37m / 37d");
    console.log(`  grouped  ${groupFixture.name} (${ingredientCount(groupFixture.ingredients)} lines,` +
      ` ${blocksOf(groupFixture).filter((b) => b.component).length} component(s))`);
    console.log(`  flat     ${flatFixture.name} (${ingredientCount(flatFixture.ingredients)} lines, no components)`);
    console.log(`  short    ${shortFixture.name} (${ingredientCount(shortFixture.ingredients)} lines)`);
    console.log(`  scaling  ${scaleFixture.name} (${count(scaleFixture, "double", "scaled")} scale at 2×)`);
    console.log(`  blocked  ${blockedFixture.name} (${count(blockedFixture, "half", "blocked")} refused at ½×,` +
      ` ${count(blockedFixture, "half", "scaled")} scaled)`);
    console.log(`  none     ${unscalableFixture ? unscalableFixture.name : "— no fixture in corpus"}`);
    console.log(`  widths   ${NARROW}px and ${WIDE}px, set explicitly`);
    console.log(`  profile  ${profileDir} (fresh — no service worker, no storage)\n`);

    chrome = await launchChrome({ profileDir, headed: opts.headed, width: NARROW, height: HEIGHT });
    cdp = await Cdp.connect(chrome.wsUrl);
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });

    const thrown = [];
    cdp.on("Runtime.exceptionThrown", (p) => {
      thrown.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "?");
    });

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    // The DOM domain is what makes the pseudo-element measurable at all.
    await cdp.send("DOM.enable", {}, sessionId);

    const driver = createDriver(cdp, sessionId, (m) => report.step(m));
    const { evalPage, settle, click } = driver;
    const layout = () => evalPage(LAYOUT);

    const size = async (width) => {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        { width, height: HEIGHT, deviceScaleFactor: 1, mobile: false },
        sessionId
      );
      await sleep(150); // give the media query and any resize listener a task
      await settle();
    };
    const goto = async (target, waitFor = ".recipe-body .ingredients .tick") => {
      await cdp.send("Page.navigate", { url: target }, sessionId);
      await until(
        async () => await evalPage(`!!document.querySelector(${JSON.stringify(waitFor)})`),
        { label: `${waitFor} on ${target}` }
      );
      await settle();
    };
    // Text size is emulated by overriding the root font-size rather than by
    // Chrome's own zoom, because 37d's `column-width` guard is a claim about
    // REM-sized columns in a pixel-sized container — zoom scales both and would
    // prove nothing. Media-query `rem` stays pegged to the initial 16px by
    // spec, so the breakpoint does not move underneath the measurement.
    const rootFont = async (px) => {
      await evalPage(`(() => {
        let s = document.getElementById("__recipe_check_text_size");
        if (!s) {
          s = document.createElement("style");
          s.id = "__recipe_check_text_size";
          document.head.append(s);
        }
        s.textContent = "html{font-size:${px}px}";
      })()`);
      await sleep(150);
      await settle();
    };

    /**
     * The real box of an element's `::before`, straight out of the layout
     * engine. Returned in PAGE coordinates, which is what the protocol reports.
     * null when the element has no `::before` at all — a distinction the caller
     * has to make, because "no numeral" and "numeral in the wrong place" are
     * different failures.
     */
    const beforeBox = async (selector, index) => {
      const { root } = await cdp.send("DOM.getDocument", { depth: 1 }, sessionId);
      const { nodeIds } = await cdp.send(
        "DOM.querySelectorAll",
        { nodeId: root.nodeId, selector },
        sessionId
      );
      const nodeId = nodeIds[index];
      if (nodeId == null) return null;
      const { node } = await cdp.send("DOM.describeNode", { nodeId, depth: 1 }, sessionId);
      const pseudo = (node.pseudoElements || []).find((p) => p.pseudoType === "before");
      if (!pseudo) return null;
      const { model } = await cdp.send("DOM.getBoxModel", { nodeId: pseudo.nodeId }, sessionId);
      const [x1, y1, , , , y3] = model.content;
      return { left: x1, top: y1, bottom: y3, width: model.width, height: model.height };
    };

    // --- 1. Components render, and nothing is lost (37l) ------------------
    await size(NARROW);
    await goto(url(groupFixture));
    const g = await layout();
    const gBlocks = blocksOf(groupFixture);
    const named = gBlocks.filter((b) => b.component);
    report.check(
      "a grouped recipe names each component as a real h3 heading, in the recipe's order",
      g.components.length === named.length &&
        g.components.every((h) => h.tag === "H3") &&
        g.components.map((h) => h.text).join("|") === named.map((b) => b.component).join("|"),
      `rendered [${g.components.map((h) => `${h.tag} “${h.text}”`).join(", ")}] for ` +
        `[${named.map((b) => b.component).join(", ")}]`
    );
    report.check(
      "every ingredient line in the JSON is still a tickable row — groups flattened, none lost",
      g.ingredientTicks === ingredientCount(groupFixture.ingredients) &&
        g.lists.reduce((n, l) => n + l.lines, 0) === ingredientCount(groupFixture.ingredients) &&
        g.lists.every((l) => l.allRendered),
      `${g.ingredientTicks} tick boxes across ${g.lists.length} lists ` +
        `(${g.lists.map((l) => l.lines).join("+")}) for ${ingredientCount(groupFixture.ingredients)} JSON lines`
    );
    report.check(
      "…and the method is still every step, so the regrouping touched only the ingredients",
      g.methodTicks === (groupFixture.steps || []).length,
      `${g.methodTicks} step rows for ${(groupFixture.steps || []).length} steps`
    );

    await goto(url(flatFixture));
    const f = await layout();
    report.check(
      "an ungrouped recipe gets NO component heading at all, and still renders its list",
      f.components.length === 0 &&
        f.lists.length === 1 &&
        f.ingredientTicks === ingredientCount(flatFixture.ingredients) &&
        f.lists[0].allRendered,
      `“${flatFixture.name}”: ${f.components.length} headings, ` +
        `${f.ingredientTicks} of ${ingredientCount(flatFixture.ingredients)} lines in ${f.lists.length} list`
    );

    // --- 2. The fold is remembered across a real reload (37c) -------------
    // A real navigation, not a re-render: the whole ask is a preference that
    // survives, and only a document rebuilt from storage can show that. The
    // profile is fresh for the RUN, not for the page load, so localStorage is
    // still there on the other side of the navigate — which is exactly the
    // property being leant on.
    await goto(url(groupFixture));
    const fold0 = await layout();
    report.check(
      "the ingredient list is a <details> that starts open, with the h2 inside its summary",
      fold0.foldPresent && fold0.foldOpen === true && fold0.headingInSummary,
      `present=${fold0.foldPresent}, open=${fold0.foldOpen}, h2 in summary=${fold0.headingInSummary}`
    );

    await click(".ingredients-summary");
    const shut = await settleUntil(layout, (s) => s.foldOpen === false);
    report.check(
      "clicking the summary collapses it",
      shut.foldOpen === false,
      `open=${shut.foldOpen}`
    );

    await goto(url(groupFixture), "details.ingredients-fold");
    const shutAgain = await layout();
    report.check(
      "collapsed survives a full page reload — the preference is genuinely stored",
      shutAgain.foldPresent && shutAgain.foldOpen === false,
      `open=${shutAgain.foldOpen} on a document rebuilt from localStorage`
    );

    // …and the other way, so the check cannot be passed by a fold that is
    // simply always shut.
    await click(".ingredients-summary");
    const open = await settleUntil(layout, (s) => s.foldOpen === true);
    await goto(url(groupFixture), "details.ingredients-fold");
    const openAgain = await layout();
    report.check(
      "…and open survives one too, so the memory is the preference and not a default",
      open.foldOpen === true && openAgain.foldOpen === true,
      `reopened=${open.foldOpen}, still open after reload=${openAgain.foldOpen}`
    );

    // --- 3. The two tick columns share a left edge (37m, horizontal) ------
    // Measured at BOTH widths. The gutter is the fix; a gutter that only
    // survives at the width someone happened to look at is not a fix.
    for (const width of [NARROW, WIDE]) {
      await size(width);
      const s = await layout();
      const gap = Math.abs(s.ingTickLeft - s.methodTickLeft);
      report.check(
        `${width}px: the ingredient ticks and the method ticks share one left edge`,
        s.ingTickLeft != null && s.methodTickLeft != null && gap <= 1,
        `ingredients ${s.ingTickLeft}px vs method ${s.methodTickLeft}px — ${gap.toFixed(2)}px apart`
      );
    }

    // --- 4. A wrapped step's number sits beside its FIRST line (37m) ------
    await size(NARROW);
    const m = await layout();
    // "Wrapped" is measured, never assumed: a step that happens to fit on one
    // line at this width would make every assertion below trivially true, which
    // is precisely how the bug survived. The tallest row is picked because it is
    // the one where a centred numeral is furthest from where it belongs.
    const tallest = m.steps.reduce((a, b) => (b.height > a.height ? b : a), m.steps[0]);
    const idx = m.steps.indexOf(tallest);
    const lines = tallest.height / tallest.lineHeight;
    report.check(
      `${NARROW}px: at least one method step really does wrap — without that the rest proves nothing`,
      lines >= 1.6,
      `step ${idx + 1} is ${tallest.height}px tall on a ${tallest.lineHeight}px line ` +
        `(≈${lines.toFixed(1)} lines) of “${groupFixture.name}”`
    );

    const numeral = await beforeBox(".recipe-body .method > li", idx);
    // Page coordinates from the protocol; viewport ones from the page. Offset
    // one by the scroll so the two are the same origin.
    const tickTopPage = tallest.tickTop + m.scrollY;
    const rowTopPage = tallest.top + m.scrollY;
    const rowCentre = rowTopPage + tallest.height / 2;
    report.check(
      `${NARROW}px: the step number's own box starts beside the tick, not below it`,
      numeral != null && Math.abs(numeral.top - tickTopPage) <= 2,
      numeral
        ? `::before top ${numeral.top.toFixed(1)}px vs tick top ${tickTopPage.toFixed(1)}px ` +
          `(${Math.abs(numeral.top - tickTopPage).toFixed(1)}px apart; align-items: ${tallest.alignItems})`
        : "no ::before box on that step — the numeral is not being rendered at all"
    );
    // The half that names the ACTUAL bug: centred, the numeral lands in the
    // middle of a paragraph. On a wrapped row the top and the centre are far
    // apart, so this is a real second assertion rather than a restatement.
    report.check(
      `${NARROW}px: …and nowhere near the vertical centre of a step that runs to ${Math.round(lines)} lines`,
      numeral != null &&
        Math.abs(numeral.top - rowCentre) > tallest.lineHeight,
      numeral
        ? `::before top ${numeral.top.toFixed(1)}px, row centre ${rowCentre.toFixed(1)}px — ` +
          `${Math.abs(numeral.top - rowCentre).toFixed(1)}px apart, on a ${tallest.lineHeight}px line`
        : "no ::before box to place"
    );
    // The numeral must also be INSIDE the 1.6em gutter it was given, or "beside
    // the first line" would be true of a number sitting on top of the words.
    const tickLeftPage = m.methodTickLeft + m.scrollX;
    report.check(
      `${NARROW}px: the numeral stays in its own gutter, left of the tick column`,
      numeral != null && numeral.left + numeral.width <= tickLeftPage + 1 && numeral.width > 0,
      numeral
        ? `::before spans ${numeral.left.toFixed(1)}–${(numeral.left + numeral.width).toFixed(1)}px, ` +
          `tick column starts at ${tickLeftPage.toFixed(1)}px`
        : "no ::before box"
    );

    // --- 5. Two columns only when there is room, and only on a long list (37d)
    // The grouped fixture carries both cases on ONE page — a long list and a
    // short one, in the same container, at the same width, with nothing but the
    // line count between them. That is what makes the short one a control
    // rather than a coincidence.
    const long = (s) => s.lists.reduce((a, b) => (b.lines > a.lines ? b : a), s.lists[0]);
    const short = (s) => s.lists.reduce((a, b) => (b.lines < a.lines ? b : a), s.lists[0]);

    await size(NARROW);
    const narrow = await layout();
    report.check(
      `${NARROW}px: every ingredient list is ONE column — a phone is left alone`,
      narrow.lists.every((l) => l.cols === 1) && narrow.docOverflow <= 0,
      narrow.lists.map((l) => `${l.lines} lines → ${l.cols} column(s) at x=${l.lefts.join("/")}`).join(" | ") +
        ` · document overflow ${narrow.docOverflow}px`
    );

    await size(WIDE);
    const wide = await layout();
    const wideLong = long(wide);
    const wideShort = short(wide);
    report.check(
      `${WIDE}px: a list of six or more splits into two columns`,
      wideLong.lines >= 6 && wideLong.cols === 2,
      `${wideLong.lines} lines → ${wideLong.cols} column(s) at x=${wideLong.lefts.join("/")} ` +
        `in a ${wideLong.width}px list`
    );
    report.check(
      `${WIDE}px: …while a list of under six stays one column, in the same container`,
      wideShort.lines < 6 && wideShort.cols === 1,
      `“${wideShort.component ?? "(unnamed)"}”: ${wideShort.lines} lines → ${wideShort.cols} column(s) ` +
        `at x=${wideShort.lefts.join("/")} in a ${wideShort.width}px list`
    );

    // A whole recipe under six lines, so the control is not just a component of
    // a grouped one — a rule that only ever fires on the second block of a
    // grouped recipe would pass the assertion above and still be wrong.
    await goto(url(shortFixture));
    await size(WIDE);
    const shortWide = await layout();
    report.check(
      `${WIDE}px: a whole recipe with a short list stays one column too`,
      shortWide.lists.length === 1 &&
        shortWide.lists[0].lines < 6 &&
        shortWide.lists[0].cols === 1,
      `“${shortFixture.name}”: ${shortWide.lists[0].lines} lines → ${shortWide.lists[0].cols} column(s) ` +
        `in a ${shortWide.lists[0].width}px list`
    );

    // The `column-width` guard, which is the half of 37d that a fixed
    // `column-count` would have failed silently: at 32px text a 16rem column is
    // 512px, two of them no longer fit the container, and the reader must get
    // ONE column back rather than two columns of four characters. Same width,
    // same list, only the text size moved.
    await goto(url(groupFixture));
    await size(WIDE);
    await rootFont(24);
    const big = await layout();
    report.check(
      `${WIDE}px at 24px text: two columns still fit, so the reader still gets them`,
      long(big).cols === 2,
      `root ${big.rootFontSize}: ${long(big).lines} lines → ${long(big).cols} column(s) ` +
        `in a ${long(big).width}px list`
    );
    await rootFont(32);
    const huge = await layout();
    report.check(
      `${WIDE}px at 32px text: a second column no longer fits, so the list goes back to one`,
      long(huge).cols === 1 && huge.docOverflow <= 0,
      `root ${huge.rootFontSize}: ${long(huge).lines} lines → ${long(huge).cols} column(s) ` +
        `in a ${long(huge).width}px list · document overflow ${huge.docOverflow}px`
    );

    // --- 6. Scaling the ingredients (17a, ADR 0076) -----------------------
    //
    // Everything here is a claim a unit test cannot reach. `quantity.js` is
    // proven to 23 tests, but "the number on screen changed" and above all
    // "the TICK survived the number changing" are facts about the DOM, and the
    // tick is the one that would fail silently: a reader who ticks the flour at
    // 1×, switches to 2× and finds it unticked has lost their place in a bowl
    // they cannot un-pour.
    await rootFont(16);
    await size(NARROW);
    await goto(url(scaleFixture));

    const scaleUi = await evalPage(`(() => {
      const btns = [...document.querySelectorAll(".scale-row .scale-btn")];
      return {
        n: btns.length,
        labels: btns.map((b) => b.textContent),
        on: btns.filter((b) => b.getAttribute("aria-checked") === "true").map((b) => b.textContent),
        minH: Math.min(...btns.map((b) => Math.round(b.getBoundingClientRect().height))),
        role: document.querySelector(".scale-row")?.getAttribute("role") || null,
      };
    })()`);
    report.check(
      "the scale picker offers the four scales, with 1× selected to begin with",
      scaleUi.n === SCALES.length && scaleUi.on.length === 1 && scaleUi.on[0] === "1×" &&
        scaleUi.role === "radiogroup",
      `${scaleUi.n} buttons ${scaleUi.labels.join(" ")} · on=${scaleUi.on.join(",")} · role=${scaleUi.role}`
    );
    // Directly above a column of tick boxes, so a mistap rescales a recipe
    // someone is halfway through measuring (CLAUDE.md: every target ≥ 44px).
    report.check(
      "every scale button clears the 44px tap target",
      scaleUi.minH >= 44,
      `shortest button ${scaleUi.minH}px`
    );

    // Tick the first line, THEN scale. The expected text comes from the same
    // module the page uses — an independently hand-written expectation here
    // would only prove the two agreed on the day it was typed.
    const firstLine = ingredientBlocks(scaleFixture.ingredients).flatMap((b) => b.lines)[0];
    const doubled = scaleLineStatus(firstLine.text, scaleFor("double")).text;
    await click(".recipe-body .ingredients .tick-box");
    await click(".scale-row .scale-btn:nth-child(3)"); // 2×
    await settle();
    const after = await evalPage(`(() => {
      const box = document.querySelector(".recipe-body .ingredients .tick-box");
      return {
        text: document.querySelector(".recipe-body .ingredients .tick-text")?.textContent ?? null,
        ticked: !!box?.checked,
        on: [...document.querySelectorAll(".scale-row .scale-btn")]
          .filter((b) => b.getAttribute("aria-checked") === "true").map((b) => b.textContent),
      };
    })()`);
    report.check(
      "picking 2× actually doubles the first line on screen",
      after.text === doubled && after.on[0] === "2×",
      `“${firstLine.text}” → “${after.text}” (expected “${doubled}”) · selected ${after.on.join(",")}`
    );
    // 🔑 THE ONE THAT MATTERS. `line.key` stays the raw text so the tick hashes
    // something that never moves (checklist.js: "HASH THE DATA, NEVER THE
    // RENDER"). Key on the rendered text instead and this box comes back empty.
    report.check(
      "a tick made at 1× is STILL TICKED after the recipe is scaled",
      after.ticked === true,
      `checkbox checked=${after.ticked} after 1× → 2×`
    );

    // A line the scaler refused, inside a recipe where other lines DID scale —
    // the half-scaled state, which is the whole safety problem 17a introduces.
    await goto(url(blockedFixture));
    await click(".scale-row .scale-btn:nth-child(1)"); // ½×
    await settle();
    const marks = await evalPage(`(() => ({
      marked: document.querySelectorAll(".recipe-body .ingredients li.is-unscaled").length,
      words: [...document.querySelectorAll(".scale-mark")].map((s) => s.textContent),
      note: document.querySelector(".scale-note")?.textContent ?? null,
    }))()`);
    const expectBlocked = ingredientBlocks(blockedFixture.ingredients)
      .flatMap((b) => b.lines)
      .filter((l) => scaleLineStatus(l.text, scaleFor("half")).status === "blocked").length;
    report.check(
      "every line the scaler refused is marked, and the count matches the module",
      marks.marked === expectBlocked && expectBlocked > 0,
      `${marks.marked} marked on screen · ${expectBlocked} blocked by quantity.js`
    );
    // Colour is not a carrier of meaning on its own (WCAG 1.4.1), and a reader
    // needs to know WHY the line disagrees with the scale they just chose.
    report.check(
      "the refusal is carried in WORDS, not only in colour",
      marks.words.length === expectBlocked && marks.words.every((w) => /\S/.test(w)) &&
        (marks.note || "").includes("cannot be scaled"),
      `${marks.words.length} in-line marks · note: ${marks.note ? `“${marks.note}”` : "MISSING"}`
    );

    // The counter-example: a recipe whose every line is "Garlic" or "Herbs" has
    // nothing to scale, and a control that changes nothing on screen reads as
    // broken rather than as honest. Skipped, loudly, if the corpus has none.
    if (unscalableFixture) {
      await goto(url(unscalableFixture));
      const nonePicker = await evalPage(`document.querySelectorAll(".scale-row").length`);
      report.check(
        "a recipe with nothing to scale is offered NO picker",
        nonePicker === 0,
        `“${unscalableFixture.name}”: ${nonePicker} picker(s)`
      );
    } else {
      report.check(
        "a recipe with nothing to scale is offered NO picker",
        false,
        "NO FIXTURE — the corpus no longer holds a recipe with zero scalable lines, " +
          "so this assertion is unproven rather than passing"
      );
    }

    report.check(
      "no uncaught page exception anywhere in the run",
      thrown.length === 0,
      thrown.length ? thrown.join("\n        ") : "none"
    );

    // The summary below is only honest if the run reached the end of the list
    // it set out to check. A harness error exits 2 before ever getting here;
    // this catches the quieter version, where a branch was skipped and the wall
    // of PASS lines looks complete.
    const ran = report.passed + report.failed;
    report.check(
      `all ${EXPECTED_ASSERTIONS} assertions actually ran`,
      ran + 1 === EXPECTED_ASSERTIONS,
      `${ran + 1} of ${EXPECTED_ASSERTIONS} — a short run is a failed run, not a pass`
    );

    return report.summary(SITE) ? 0 : 1;
  } finally {
    cdp?.close();
    await stopChrome(chrome?.proc, { keepProfile: opts.keepProfile });
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    if (opts.keepProfile) console.log(`Chrome profile kept at ${profileDir}`);
  }
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      dish: { type: "string" },
      port: { type: "string", default: "0" },
      headed: { type: "boolean", default: false },
      "keep-profile": { type: "boolean", default: false },
      verbose: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  }));
} catch (err) {
  console.error(`error: ${err.message} (try --help)`);
  process.exit(2);
}
if (values.help) {
  console.log(HELP);
  process.exit(0);
}
const port = Number(values.port);
if (!Number.isInteger(port) || port < 0) {
  console.error("error: --port needs a whole number");
  process.exit(2);
}
try {
  process.exit(
    await run({
      dish: values.dish ?? null,
      port,
      headed: values.headed,
      keepProfile: values["keep-profile"],
      verbose: values.verbose,
    })
  );
} catch (err) {
  // A harness failure is not an app verdict — exit 2 so the two never blur, and
  // print no summary line, so a wall of PASS lines can never read as a pass.
  console.error(`\nharness error: ${err.message}`);
  process.exit(2);
}
