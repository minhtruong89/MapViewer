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
  isValidGoogleMapsUrl,
  normalizeCategory,
} from './validators.js';

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
