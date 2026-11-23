// The activity screen (Theme 32b): a panel of Settings, placed straight after
// "Your data" because it is the same question seen from the other side — "Your
// data" is what you can take away, this is what has been happening to it.
//
// A PANEL, NOT A PAGE. Settings is an index of rows that drill into single-topic
// panels (settings-ui.js, ADR 0025); the log joins it as one more row rather
// than inventing a second way to navigate. Its links leave the sheet for the
// menu or recipe page, as the Favourites list's do.
//
// WHAT IT SHOWS. The active person's log (activity.js is per person), newest
// first, grouped by local day. Each row is a sentence, a time and — where the
// dish or place still exists — a link to it. The app's own entries (menu and
// version updates, a refresh) are the quiet half: behind a toggle, off by
// default, because they would outnumber everything a person did (the owner's
// stated priority is "more importantly user changes").
//
// IT SAYS THE THREE THINGS A LOG OWES ITS READER, in words, on the screen:
//   • nothing is ever erased from it (the owner's "honest log" ruling,
//     ADR 0164: a removal shows as a removal), and it never leaves this device;
//   • it keeps only the last ACTIVITY_CAP entries (no silent cap);
//   • when it started, so an empty screen does not read as a broken one.
//
// "STILL EXISTS" IS ANSWERED FROM THE DATA THE PAGE ALREADY HOLDS: the home
// summary (is the venue there, and is it a recipe collection) and the search
// index (is the dish there, under its current id). Both are precached; neither
// is fetched until this panel opens. If they cannot be read, the rows simply
// carry no link — absence of a link never claims a dish is gone.
//
// The toggle is per visit and not stored: it is a view, not a preference, and a
// stored one would be a new store to walk through the export, wipe and sync
// tables for the sake of a switch.

import { activity, ACTIVITY_CAP } from "./activity.js";
import { groupByDay, sentenceOf, linkFor, timeText, dayHeading, dayI18nKey, startedText, fill } from "./activity-view.js";
import { loadRestaurants, loadSearchIndex } from "./data.js";
import { isPersonalVenue, recipes } from "./recipes.js";
import { t, translate } from "./reo.js";
import { el } from "./dom.js";

// What the data on this page says exists, or null until (and unless) it loads.
let where = null;
let loading = null;

function buildWhere(summaries, index) {
  const kinds = new Map();
  for (const r of summaries || []) kinds.set(r.id, r.kind === "recipes" ? "recipes" : "venue");
  // venue -> (any id a dish has answered to -> its id today)
  const dishes = new Map();
  for (const v of index?.venues || []) {
    const m = new Map();
    for (const sec of v.sections || []) {
      for (const it of sec.items || []) {
        m.set(it.dishId, it.dishId);
        for (const old of it.formerIds || []) if (!m.has(old)) m.set(old, it.dishId);
      }
    }
    dishes.set(v.id, m);
  }
  return {
    venueKind: (id) => (isPersonalVenue(id) ? "recipes" : kinds.get(id) || null),
    currentDish: (venue, dish) =>
      isPersonalVenue(venue) ? (recipes.has(dish) ? dish : null) : dishes.get(venue)?.get(dish) || null,
  };
}

function ensureWhere() {
  if (where || loading) return loading || Promise.resolve();
  loading = Promise.allSettled([loadRestaurants(), loadSearchIndex()])
    .then(([s, i]) => {
      // Without the summary there is nothing to say a venue exists, so no links.
      if (s.status === "fulfilled") where = buildWhere(s.value, i.status === "fulfilled" ? i.value : null);
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function activityPanel() {
  let showSystem = false;
  let visible = false;

  const intro = el("p", {
    className: "settings-note",
    "data-i18n": "activity.intro",
    textContent:
      "What you’ve changed on this device, newest first. It stays on this device, and nothing is ever " +
      "erased from it: removing a favourite shows up here as a removal.",
  });
  const toggle = el("button", {
    type: "button",
    className: "pref-chip activity-toggle",
    "aria-pressed": "false",
    "data-i18n": "activity.showSystem",
    textContent: "Include app and menu updates",
  });
  const toggleRow = el("div", { className: "pref-chips activity-toggle-row" }, [toggle]);
  const list = el("div", { className: "activity-list" });
  const footer = el("p", { className: "settings-note activity-foot" });
  const panel = el("div", { className: "settings-panel activity-panel" }, [intro, toggleRow, list, footer]);

  function row(e) {
    const text = el("span", { className: "activity-text", textContent: sentenceOf(e, t) });
    const time = el("time", { className: "activity-time", dateTime: e.at, textContent: timeText(e.at) });
    const href = linkFor(e, where);
    if (!href) return el("li", {}, [el("div", { className: "activity-item" }, [text, time])]);
    return el("li", {}, [
      el("a", { className: "activity-item activity-link", href }, [
        text,
        time,
        el("span", { className: "activity-chevron", "aria-hidden": "true", textContent: "›" }),
      ]),
    ]);
  }

  function render() {
    const { days, hiddenSystem } = groupByDay(activity.entries(), { showSystem });
    const out = [];
    if (!days.length) {
      out.push(
        el("p", {
          className: "settings-note activity-empty",
          role: "status",
          textContent: fill(
            t(
              "activity.empty",
              "Nothing here yet. Faves started keeping this on {date}, so anything you did before then isn’t in it."
            ),
            { date: startedText() }
          ),
        })
      );
    }
    const now = new Date();
    for (const d of days) {
      out.push(
        el("section", { className: "activity-day" }, [
          el("h3", {
            className: "settings-sub activity-day-head",
            // English here; translate(list) below swaps and language-marks it.
            textContent: dayHeading(d.key, now),
            ...(dayI18nKey(d.key, now) ? { "data-i18n": dayI18nKey(d.key, now) } : {}),
          }),
          el("ul", { className: "activity-rows" }, d.items.map(row)),
        ])
      );
    }
    if (hiddenSystem) {
      const one = hiddenSystem === 1;
      out.push(
        el("p", {
          className: "settings-note activity-hidden",
          textContent: fill(
            one
              ? t("activity.hiddenOne", "{n} app or menu update is hidden.")
              : t("activity.hiddenMany", "{n} app and menu updates are hidden."),
            { n: hiddenSystem }
          ),
        })
      );
    }
    list.replaceChildren(...out);
    // The empty message already says when it began; saying it twice is noise.
    footer.textContent = days.length
      ? fill(
          t(
            "activity.foot",
            "Faves keeps the last {cap} changes, and started keeping this on {date}. Anything you did before then was never recorded."
          ),
          { cap: ACTIVITY_CAP, date: startedText() }
        )
      : fill(t("activity.footCap", "Faves keeps the last {cap} changes."), { cap: ACTIVITY_CAP });
    translate(list);
  }

  toggle.addEventListener("click", () => {
    showSystem = !showSystem;
    toggle.setAttribute("aria-pressed", String(showSystem));
    render();
  });
  activity.subscribe(() => {
    if (visible) render();
  });

  return {
    panel,
    /** The panel has just been shown: read the log fresh, then add the links. */
    onOpen() {
      visible = true;
      render();
      ensureWhere().then(() => {
        if (visible) render();
      });
    },
    /** The panel has been left. */
    close() {
      visible = false;
    },
  };
}
