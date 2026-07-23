// Native maps handoff. Tapping a venue's address opens the phone's maps app
// showing the venue *on a map* — a pin at the place, so you can see where it is
// (and start directions yourself from there). Owner ruling 2026-07-23 backed out
// the drive-time-directions-on-tap of ADR 0010: a pin is what the address tap
// should do (ADR 0016).
//
// Crucially the pin targets the **street address string**, not our stored
// lat/lng. Dev-time geocoded coordinates can sit ~100 m off — proven: R & S
// Satay's stored coords (-41.29379, 174.7751) land on Garrett St, one street
// over from its real 148 Cuba St — so a coord-targeted link opens on the wrong
// street. Maps geocodes the address string exactly, so we hand it the address
// and fall back to coords only if a record somehow has none (validate.py
// requires an address, so that path is belt-and-braces). Coords stay for
// in-app distance maths (ranking, detour) only.
//
// Which maps provider we hand off to follows the viewer's own choice
// (Settings → "Maps app"): the web can't read the OS's default-maps-app
// preference (browsers hide installed apps as a fingerprinting surface), so we
// ask once and remember. The default, "auto", follows the device — Apple Maps
// on Apple hardware, Google elsewhere (resolveMapsTarget). An explicit Apple /
// Google / Waze choice wins on every platform.
//
// Pin form per provider (schemes reasoned about, not assumed):
//   apple → maps.apple.com/?q=<query>  — Apple Maps treats a q value as a
//           search: an address string geocodes to a pin; a "lat,lng" q is
//           parsed as coordinates and pinned.
//   google → google.com/maps/search/?api=1&query=<query>  — the documented
//           Google Maps "search" URL; a full address (or "lat,lng") resolves to
//           a single pinned place. Also the target for android/desktop under
//           "auto".
//   waze  → waze.com/ul?q=<query>  — Waze's universal link treats q as a search
//           (address geocodes to a pin); add &navigate=yes to start driving.
//
// The along-a-route "🧭 Route via maps" handoff (routeMapsUrlFor) is a separate,
// explicitly-routed feature (ADR 0014) and KEEPS its routed form — it just
// targets the venue leg by address too, same wrong-street reasoning.
//
// The logic is split so it can be unit-tested without a browser:
// detectPlatform() takes an injectable navigator; the URL builders are pure.

/** "apple" | "android" | "other" from a navigator-like object. */
export function detectPlatform(nav) {
  nav = nav || (typeof navigator !== "undefined" ? navigator : {});
  const ua = nav.userAgent || "";
  const plat = nav.platform || "";
  // Android first: its UA also contains "Linux", which we don't want to
  // mistake for desktop.
  if (/Android/.test(ua)) return "android";
  // iPadOS 13+ reports as "MacIntel" with touch points, so a Mac UA/platform
  // covers iPhone, iPad and Mac — all of which honour maps.apple.com.
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua) || /Mac|iP(hone|ad|od)/.test(plat)) {
    return "apple";
  }
  return "other";
}

/**
 * Resolve a user's "Maps app" preference to a concrete provider target
 * ("apple" | "google" | "waze"). An explicit choice wins on every platform;
 * "auto" (or anything unknown) follows the device — Apple on Apple hardware,
 * Google on Android/desktop. Pure — `nav` is injectable for tests.
 */
export function resolveMapsTarget(pref, nav) {
  if (pref === "apple" || pref === "google" || pref === "waze") return pref;
  return detectPlatform(nav) === "apple" ? "apple" : "google";
}

const hasCoords = (r) => typeof r.lat === "number" && typeof r.lng === "number";

// What Maps should resolve for a place: prefer the street address (geocoded
// exactly — our stored coords can be ~100 m off; see the header), fall back to
// raw "lat,lng" only when there's no address, then to the name. Addresses/names
// are URL-encoded; a bare "lat,lng" keeps its literal comma so Maps parses it as
// coordinates. Shared by the pin handoff and the route-via waypoint.
function placeTarget(place) {
  if (place.address) return encodeURIComponent(place.address);
  if (hasCoords(place)) return `${place.lat},${place.lng}`;
  return encodeURIComponent(place.name || "");
}

// Google Maps' universal directions link; used by the route handoff for the
// venue leg (and its no-destination fallback) on Android and desktop.
const googleDir = (dest) =>
  `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

/**
 * Build a "show this place on the map" (pin) URL for a venue on a given target
 * provider, targeting its street address so Maps geocodes the exact spot.
 * `target` is a provider ("apple"|"google"|"waze"); the platform strings
 * "android"/"other" are accepted as aliases for Google. Pure — no globals — so
 * it's directly testable.
 */
export function mapsUrlFor(r, target) {
  const q = placeTarget(r);
  if (target === "apple") return `https://maps.apple.com/?q=${q}`;
  if (target === "waze") return `https://waze.com/ul?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`; // google/android/other
}

/** Convenience: resolve the viewer's pref (→ device when "auto") and build. */
export function mapsUrl(r, pref) {
  return mapsUrlFor(r, resolveMapsTarget(pref));
}

/**
 * "Route via maps" for Pick-along-a-route (ADR 0014): directions from the
 * viewer's current location, THROUGH a venue, to a named destination — so the
 * maps app shows the real road route for "grab dinner on the way home".
 *
 * The venue leg targets the street address (Maps geocodes it exactly — same
 * wrong-street reasoning as the pin handoff, ADR 0016); the destination stays
 * coords (a suburb centroid has no address). Google's directions params accept
 * addresses in `destination`/`waypoints` alike, so an encoded address waypoint
 * is valid.
 *
 * Waypoint support differs by platform (checked, not assumed):
 *   • Google Maps' directions URL (`/maps/dir/?api=1`) honours an intermediate
 *     `waypoints=` — so origin (current, omitted) → venue (waypoint) → dest is
 *     a real three-point route. Used on Android and desktop.
 *   • Apple Maps' URL scheme exposes only `saddr`/`daddr` — NO waypoint
 *     parameter — so we honestly can't express the stop. On Apple we route to
 *     the venue (origin→venue, `daddr` at its address, `dirflg=d` = drive) and
 *     drop the destination rather than fake it. This is still directions — the
 *     route feature stays routed even where the pin handoff is now a pin.
 *   • Waze's universal link takes a single `q` destination (+`navigate=yes`) and
 *     likewise has no waypoint param — so Waze mirrors Apple: navigate to the
 *     venue, destination dropped.
 * `target` is a provider ("apple"|"google"|"waze"; "android"/"other" alias
 * Google). `dest` is {lat,lng} (or null → plain venue directions). Pure.
 */
export function routeMapsUrlFor(place, dest, target) {
  const validDest = dest && typeof dest.lat === "number" && typeof dest.lng === "number";
  const via = placeTarget(place);
  // Apple/Waze have no waypoint param → route origin→venue (destination dropped).
  if (target === "apple") return `https://maps.apple.com/?daddr=${via}&dirflg=d`;
  if (target === "waze") return `https://waze.com/ul?q=${via}&navigate=yes`;
  // No destination → plain directions to the venue.
  if (!validDest) return googleDir(via);
  const to = `${dest.lat},${dest.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${to}&waypoints=${via}&travelmode=driving`;
}

/** Convenience: resolve the viewer's pref (→ device when "auto") and build. */
export function routeMapsUrl(place, dest, pref) {
  return routeMapsUrlFor(place, dest, resolveMapsTarget(pref));
}

// The viewer's last-known location ({lat,lng}) from the home screen's "Near me",
// kept for this browsing session only (sessionStorage) so the menu screen can
// order a multi-location venue's branches nearest-first and target the nearest
// for its maps handoff — WITHOUT prompting for location again. Device-local and
// ephemeral: never persisted to the repo, never sent anywhere (same discipline
// as the localStorage personal layer). Degrades silently where storage is
// blocked (Safari private mode).
const ORIGIN_KEY = "faves.origin.v1";

/** Remember (origin) or forget (null/undefined) the Near-me location. */
export function rememberOrigin(origin) {
  try {
    if (origin && typeof origin.lat === "number" && typeof origin.lng === "number") {
      sessionStorage.setItem(ORIGIN_KEY, JSON.stringify({ lat: origin.lat, lng: origin.lng }));
    } else {
      sessionStorage.removeItem(ORIGIN_KEY);
    }
  } catch {
    /* storage unavailable — the menu screen simply won't know the location */
  }
}

/** The remembered Near-me location, or null when unset/unavailable. */
export function recallOrigin() {
  try {
    const v = JSON.parse(sessionStorage.getItem(ORIGIN_KEY) || "null");
    return v && typeof v.lat === "number" && typeof v.lng === "number" ? v : null;
  } catch {
    return null;
  }
}
