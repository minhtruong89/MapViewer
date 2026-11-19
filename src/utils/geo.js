/**
 * Haversine distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Bayesian weighted rating balancing star score and review volume.
 */
export function computeTrustScore(rating, reviewCount, priorMean = 4.0, priorWeight = 50) {
  if (!rating || Number(rating) <= 0) return 0;
  const r = Math.min(5, Math.max(0, Number(rating)));
  const v = Math.max(0, Number(reviewCount) || 0);
  return (v * r + priorWeight * priorMean) / (v + priorWeight);
}

/**
 * Formats travel duration in minutes into concise Vietnamese labels (e.g. "12p", "1g15p").
 */
export function formatDurationMin(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  const m = Math.max(1, Math.round(minutes));
  if (m < 60) return `${m}p`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}g${rem}p` : `${h}g`;
}

/**
 * Builds a multi-stop car driving directions URL for Google Maps (2 to 10 stops).
 */
export function buildGoogleMapsRouteUrl(stops) {
  if (!Array.isArray(stops)) return null;
  const valid = stops
    .filter(
      (s) =>
        s &&
        typeof s.lat === 'number' &&
        Number.isFinite(s.lat) &&
        typeof s.lng === 'number' &&
        Number.isFinite(s.lng)
    )
    .slice(0, 10);

  if (valid.length < 2) return null;

  const first = valid[0];
  const last = valid[valid.length - 1];
  const middle = valid.slice(1, -1);

  const waypointsParam =
    middle.length > 0
      ? `&waypoints=${encodeURIComponent(middle.map((s) => `${s.lat},${s.lng}`).join('|'))}`
      : '';

  return `https://www.google.com/maps/dir/?api=1&origin=${first.lat},${first.lng}&destination=${last.lat},${last.lng}${waypointsParam}&travelmode=driving`;
}
