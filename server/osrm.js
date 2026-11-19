const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'AnalyzedMapApp/1.0 (local-research-tool)';
const CACHE_MAX = 100;
const CACHE_TTL_MS = 30 * 60 * 1000;
const TABLE_BATCH_SIZE = 40;

function createLruTtlCache(maxSize = CACHE_MAX, ttlMs = CACHE_TTL_MS) {
  const store = new Map();
  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() >= entry.expiresAt) {
        store.delete(key);
        return null;
      }
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (store.has(key)) {
        store.delete(key);
      } else if (store.size >= maxSize) {
        const oldestKey = store.keys().next().value;
        if (oldestKey !== undefined) store.delete(oldestKey);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
  };
}

const TABLE_CACHE = createLruTtlCache();
const ROUTE_CACHE = createLruTtlCache();

function formatCoord(pt) {
  return `${Number(pt.lng).toFixed(5)},${Number(pt.lat).toFixed(5)}`;
}

async function fetchOsrmJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.code !== 'Ok') {
    throw new Error(`OSRM error: ${data.code || 'Unknown'}`);
  }
  return data;
}

/**
 * Computes real car driving distances & durations from one origin to multiple destinations using OSRM table API.
 */
export async function fetchDrivingDistances(origin, destinations) {
  const results = {};
  const originCoord = `${origin.lng},${origin.lat}`;
  const originKey = formatCoord(origin);

  for (let i = 0; i < destinations.length; i += TABLE_BATCH_SIZE) {
    const batch = destinations.slice(i, i + TABLE_BATCH_SIZE);
    const cacheKey = `${originKey}|${batch.map((d) => `${d.id}:${formatCoord(d)}`).join(';')}`;

    const cached = TABLE_CACHE.get(cacheKey);
    if (cached) {
      Object.assign(results, cached);
      continue;
    }

    const coordStr = [originCoord, ...batch.map((d) => `${d.lng},${d.lat}`)].join(';');
    const url = `${OSRM_BASE}/table/v1/driving/${coordStr}?sources=0&annotations=distance,duration`;
    const data = await fetchOsrmJson(url);

    const rowDistances = data.distances?.[0] || [];
    const rowDurations = data.durations?.[0] || [];
    const batchResults = {};

    batch.forEach((dest, idx) => {
      const meters = rowDistances[idx + 1];
      const seconds = rowDurations[idx + 1];
      if (typeof meters === 'number' && Number.isFinite(meters) && typeof seconds === 'number' && Number.isFinite(seconds)) {
        batchResults[dest.id] = {
          distanceKm: Number((meters / 1000).toFixed(2)),
          durationMin: Math.max(1, Math.round(seconds / 60)),
        };
      }
    });

    TABLE_CACHE.set(cacheKey, batchResults);
    Object.assign(results, batchResults);
  }

  return results;
}

/**
 * Computes a multi-stop car driving route and Leaflet polyline coordinates via OSRM route API.
 */
export async function fetchDrivingRoute(waypoints) {
  const cacheKey = waypoints.map(formatCoord).join('|');
  const cached = ROUTE_CACHE.get(cacheKey);
  if (cached) return cached;

  const coordStr = waypoints.map((pt) => `${pt.lng},${pt.lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
  const data = await fetchOsrmJson(url);

  const route = data.routes?.[0];
  if (!route) {
    throw new Error('OSRM không trả về lộ trình hợp lệ.');
  }

  const rawCoords = route.geometry?.coordinates || [];
  const geometry = rawCoords.map(([lng, lat]) => [lat, lng]);

  const parsed = {
    distanceKm: Number((route.distance / 1000).toFixed(2)),
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    legs: (route.legs || []).map((leg) => ({
      distanceKm: Number((leg.distance / 1000).toFixed(2)),
      durationMin: Math.max(1, Math.round(leg.duration / 60)),
    })),
    geometry,
  };

  ROUTE_CACHE.set(cacheKey, parsed);
  return parsed;
}
