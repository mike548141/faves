// Native maps handoff. Tapping a venue's address should open the phone's
// *own* maps app — Apple Maps on iOS/macOS, the default maps app on
// Android — not force everyone through one vendor's website. We use exact
// coordinates when the venue has them (see lat/lng in the schema) and fall
// back to the postal address otherwise.
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

/**
 * Build a maps URL for a venue on a given platform ("apple"|"android"|
 * "other"). Pure — no globals — so it's directly testable.
 */
export function mapsUrlFor(r, platform) {
  const name = r.name || "";
  const label = r.address || name;
  if (hasCoords(r)) {
    const ll = `${r.lat},${r.lng}`;
    if (platform === "apple") {
      return `https://maps.apple.com/?ll=${ll}&q=${encodeURIComponent(name)}`;
    }
    if (platform === "android") {
      // geo: hands off to the device's default maps app; the (Name) labels
      // the dropped pin.
      return `geo:${ll}?q=${ll}(${encodeURIComponent(name)})`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${ll}`;
  }
  // No coordinates: search by address text.
  if (platform === "apple") {
    return `https://maps.apple.com/?q=${encodeURIComponent(label)}`;
  }
  if (platform === "android") {
    return `geo:0,0?q=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

/** Convenience: detect the running platform and build the URL. */
export function mapsUrl(r) {
  return mapsUrlFor(r, detectPlatform());
}
