// Native maps handoff. Tapping a venue's address opens the phone's maps app
// with *driving directions* to the venue from the viewer's current location —
// so the maps app shows the real, live drive time (a live in-app routed time
// needs a keyed external directions API, which breaks offline/zero-dep; see
// ADR 0010). We use exact coordinates when the venue has them (see lat/lng in
// the schema) and fall back to the postal address otherwise.
//
// Directions form per platform:
//   apple   → maps.apple.com ?daddr=…&dirflg=d  (Apple Maps; dirflg=d = drive)
//   android → google.com/maps/dir/ ?api=1&destination=…&travelmode=driving
//   other   → same Google Maps directions link (opens on desktop)
// Omitting the origin lets each maps app default to "current location". This
// supersedes the earlier pin-drop handoff (ADR 0005): on Android that meant
// giving up the vendor-neutral geo: chooser, but geo: has no directions mode,
// and drive time is the thing owners asked for (ROADMAP Theme 2).
//
// The logic is split so it can be unit-tested without a browser:
// detectPlatform() takes an injectable navigator; mapsUrlFor() is pure.

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

const hasCoords = (r) => typeof r.lat === "number" && typeof r.lng === "number";

// Google Maps' universal directions link; used for Android and desktop. The
// destination is coords when we have them (precise) or address text otherwise.
const googleDir = (dest) =>
  `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

/**
 * Build a driving-directions maps URL for a venue on a given platform
 * ("apple"|"android"|"other"), from the viewer's current location (origin
 * omitted). Pure — no globals — so it's directly testable.
 */
export function mapsUrlFor(r, platform) {
  const name = r.name || "";
  const label = r.address || name;
  if (hasCoords(r)) {
    const ll = `${r.lat},${r.lng}`;
    if (platform === "apple") {
      // dirflg=d = driving; no saddr → Apple Maps routes from current location.
      return `https://maps.apple.com/?daddr=${ll}&dirflg=d`;
    }
    return googleDir(ll);
  }
  // No coordinates: route to the address text instead.
  if (platform === "apple") {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(label)}&dirflg=d`;
  }
  return googleDir(encodeURIComponent(label));
}

/** Convenience: detect the running platform and build the URL. */
export function mapsUrl(r) {
  return mapsUrlFor(r, detectPlatform());
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
