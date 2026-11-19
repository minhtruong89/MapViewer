const VALID_CATEGORIES = new Set(['all', 'lodging', 'restaurant']);

/**
 * Validates that lat and lng are finite numbers within valid geographic bounds.
 */
export function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Validates that a URL is an HTTPS Google Maps URL.
 */
export function isValidGoogleMapsUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'www.google.com' &&
      (parsed.pathname === '/maps' || parsed.pathname.startsWith('/maps/'))
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes place category input to a supported enum value.
 */
export function normalizeCategory(category) {
  return VALID_CATEGORIES.has(category) ? category : 'all';
}

/**
 * Validates an object containing finite { lat, lng } coordinates.
 */
export function isValidCoordPoint(pt) {
  return Boolean(pt && typeof pt === 'object' && isValidCoordinates(pt.lat, pt.lng));
}

/**
 * Validates an array of coordinate waypoints within length bounds.
 */
export function isValidWaypoints(points, minLen = 2, maxLen = 50) {
  return (
    Array.isArray(points) &&
    points.length >= minLen &&
    points.length <= maxLen &&
    points.every(isValidCoordPoint)
  );
}
