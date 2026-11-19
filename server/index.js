import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import {
  scrapeGoogleMaps,
  scrapePlaceDetails,
  openLoginBrowser,
  getAuthStatus,
  closeBrowser,
} from './scraper.js';
import {
  isValidCoordinates,
  isValidCoordPoint,
  isValidGoogleMapsUrl,
  isValidWaypoints,
  normalizeCategory,
} from './validators.js';
import { fetchDrivingDistances, fetchDrivingRoute } from './osrm.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/auth/status', (_req, res) => {
  res.json(getAuthStatus());
});

app.post('/api/auth/login', async (_req, res) => {
  try {
    const result = await openLoginBrowser();
    res.json(result);
  } catch (err) {
    console.error('Login browser error:', err);
    res.status(500).json({
      error: err.message || 'Không thể mở cửa sổ đăng nhập Google.',
    });
  }
});

/**
 * Geocodes a Vietnamese/global location name using OpenStreetMap Nominatim.
 */
app.get('/api/geocode', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Vui lòng nhập tên khu vực hoặc địa điểm.' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}&limit=6&accept-language=vi`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AnalyzedMapApp/1.0 (local-research-tool)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim trả về lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.map((item) => ({
      name: item.display_name,
      shortName: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    res.json({ suggestions });
  } catch (err) {
    console.error('Geocode error:', err);
    res.status(500).json({ error: 'Không thể tìm tọa độ khu vực. Vui lòng thử lại.' });
  }
});

/**
 * Reverse-geocodes coordinates into a short Vietnamese location label via Nominatim.
 */
app.get('/api/reverse-geocode', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (!isValidCoordinates(lat, lng)) {
    return res.status(400).json({ error: 'Tọa độ không hợp lệ.' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AnalyzedMapApp/1.0 (local-research-tool)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Nominatim trả về lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    const addr = data.address || {};
    const displayName = String(data.display_name || '').trim();
    const shortParts = [
      addr.road || addr.suburb || addr.quarter || addr.village,
      addr.city_district || addr.town || addr.city || addr.state,
    ].filter(Boolean);

    const shortName =
      shortParts.length > 0
        ? shortParts.slice(0, 2).join(', ')
        : displayName
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    res.json({ shortName, displayName });
  } catch (err) {
    console.error('Reverse geocode error:', err);
    res.status(500).json({ error: 'Không thể lấy tên địa điểm từ tọa độ.' });
  }
});

/**
 * Calculates car driving distances & durations from an origin to a list of destinations.
 */
app.post('/api/driving-distances', async (req, res) => {
  const { origin, destinations } = req.body || {};
  if (
    !isValidCoordPoint(origin) ||
    !Array.isArray(destinations) ||
    destinations.length < 1 ||
    destinations.length > 200 ||
    !destinations.every(
      (d) => typeof d?.id === 'string' && d.id.length > 0 && isValidCoordPoint(d)
    )
  ) {
    return res.status(400).json({ error: 'Dữ liệu tọa độ điểm đi / điểm đến không hợp lệ.' });
  }

  try {
    const results = await fetchDrivingDistances(origin, destinations);
    res.json({ profile: 'driving', results });
  } catch (err) {
    console.error('Driving distances error:', err);
    res.status(502).json({
      error: 'Không thể tính khoảng cách đường ô tô từ máy chủ định tuyến.',
    });
  }
});

/**
 * Calculates a multi-stop car driving route via OSRM.
 */
app.post('/api/driving-route', async (req, res) => {
  const { waypoints } = req.body || {};
  if (!isValidWaypoints(waypoints, 2, 10)) {
    return res.status(400).json({ error: 'Lộ trình cần từ 2 đến 10 điểm có tọa độ hợp lệ.' });
  }

  try {
    const route = await fetchDrivingRoute(waypoints);
    res.json({ profile: 'driving', ...route });
  } catch (err) {
    console.error('Driving route error:', err);
    res.status(502).json({
      error: 'Không thể tạo tuyến đường ô tô giữa các điểm đã chọn.',
    });
  }
});

/**
 * Searches Google Maps around a center coordinate within a radius.
 */
app.post('/api/search', async (req, res) => {
  const { lat, lng, radiusKm = 5, category = 'all', customQuery = '', maxResults = 50 } =
    req.body || {};

  if (!isValidCoordinates(lat, lng)) {
    return res.status(400).json({ error: 'Tọa độ tâm (lat, lng) không hợp lệ.' });
  }

  const clampedRadius = Math.max(0.2, Math.min(30, Number(radiusKm) || 5));
  const clampedMax = Math.max(5, Math.min(200, Number(maxResults) || 50));
  const safeCategory = normalizeCategory(category);

  try {
    const places = await scrapeGoogleMaps({
      lat,
      lng,
      radiusKm: clampedRadius,
      category: safeCategory,
      customQuery,
      maxResults: clampedMax,
    });

    res.json({
      count: places.length,
      center: { lat, lng },
      radiusKm: clampedRadius,
      places,
    });
  } catch (err) {
    console.error('Search error:', err);
    const status = err.code === 'CAPTCHA_BLOCKED' ? 429 : 500;
    res.status(status).json({
      error: err.message || 'Có lỗi xảy ra khi lấy dữ liệu từ Google Maps.',
      code: err.code || 'SCRAPE_ERROR',
    });
  }
});

/**
 * Fetches high-res photos & extra info for a single Google Maps place URL.
 */
app.get('/api/place-details', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!isValidGoogleMapsUrl(url)) {
    return res.status(400).json({ error: 'URL Google Maps không hợp lệ.' });
  }

  try {
    const details = await scrapePlaceDetails(url);
    res.json(details);
  } catch (err) {
    console.error('Details error:', err);
    const status = err.code === 'CAPTCHA_BLOCKED' ? 429 : 500;
    res.status(status).json({
      error: err.message || 'Không thể tải thêm hình ảnh cho địa điểm này.',
    });
  }
});

// Serve built frontend in production (e.g., Railway)
const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});

async function shutdown() {
  await closeBrowser();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
