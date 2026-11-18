import { chromium } from 'playwright-core';
import crypto from 'crypto';

let browserInstance = null;

/**
 * Lazily launches and reuses a headless Chromium browser (Chrome or Edge on Windows).
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const launchOptions = {
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  };

  for (const channel of ['chrome', 'msedge']) {
    try {
      browserInstance = await chromium.launch({ ...launchOptions, channel });
      return browserInstance;
    } catch {
      // Try next available channel
    }
  }

  throw new Error(
    'Không tìm thấy trình duyệt Chrome hoặc Microsoft Edge trên máy để chạy công cụ lấy dữ liệu.'
  );
}

/**
 * Closes the shared browser instance gracefully.
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

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
 * Maps search radius in km to an appropriate Google Maps zoom level.
 */
function radiusToZoom(radiusKm) {
  if (radiusKm <= 0.6) return 16;
  if (radiusKm <= 1.5) return 15;
  if (radiusKm <= 3.5) return 14;
  if (radiusKm <= 8) return 13;
  if (radiusKm <= 16) return 12;
  if (radiusKm <= 24) return 11;
  return 10;
}

/**
 * Upgrades Google Maps thumbnail URLs to a crisper resolution.
 */
function upgradePhotoUrl(url) {
  if (!url || !url.startsWith('http')) return null;
  if (url.includes('gstatic.com') || url.includes('ggpht.com/a/')) return null;
  if (url.includes('=w') || url.includes('=s')) {
    return url.replace(/=[ws]\d+(-h\d+)?[^&]*/i, '=w640-h480-k-no');
  }
  return url;
}

/**
 * Dismisses Google consent banner if present; throws if CAPTCHA/block is detected.
 */
async function checkPageAndConsent(page) {
  const url = page.url();
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) || '');

  if (
    url.includes('google.com/sorry') ||
    /unusual traffic|captcha|không phải người máy|verify you are human/i.test(bodyText)
  ) {
    const err = new Error(
      'Google Maps đang yêu cầu xác minh bảo mật (CAPTCHA / lưu lượng bất thường). Vui lòng thử lại sau ít phút.'
    );
    err.code = 'CAPTCHA_BLOCKED';
    throw err;
  }

  // Handle Google EU/global consent screen if shown
  const consentBtn = page.locator(
    'button:has-text("Chấp nhận tất cả"), button:has-text("Accept all"), form[action*="consent"] button'
  );
  if ((await consentBtn.count()) > 0) {
    await consentBtn.first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }
}

/**
 * Scrapes a single category query on Google Maps around (searchLat, searchLng),
 * filtering results within radiusKm of (centerLat, centerLng).
 */
async function scrapeSingleQuery({
  centerLat,
  centerLng,
  searchLat = centerLat,
  searchLng = centerLng,
  radiusKm,
  zoomOverride = null,
  searchTerm,
  type,
  maxResults,
}) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: 'vi-VN',
    viewport: { width: 1366, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    const zoom = zoomOverride ?? radiusToZoom(radiusKm);
    const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(
      searchTerm
    )}/@${searchLat},${searchLng},${zoom}z?hl=vi`;

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await checkPageAndConsent(page);

    // Wait for results feed or a direct single-place panel (h1.DUwDvf)
    const feedSelector = 'div[role="feed"]';
    await page
      .waitForSelector(`${feedSelector}, a.hfpxzc, h1.DUwDvf`, { timeout: 15000 })
      .catch(() => {});

    const hasFeed = (await page.locator(feedSelector).count()) > 0;
    if (!hasFeed) {
      // Google Maps may have redirected directly to a single matching place
      const hasSinglePlace = (await page.locator('h1.DUwDvf').count()) > 0;
      if (!hasSinglePlace) return [];

      // Google Maps updates URL to /place/.../@lat,lng shortly after rendering h1.DUwDvf
      await page.waitForURL(/\/place\//, { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(700);
      const currentUrl = page.url();
      const single = await page.evaluate(() => {
        const name = document.querySelector('h1.DUwDvf')?.textContent?.trim() || '';
        const ratingText =
          document.querySelector('div.F7nice span[aria-hidden="true"]')?.textContent?.trim() || '';
        const reviewEl =
          document.querySelector('div.F7nice span[aria-label*="đánh giá"]') ||
          document.querySelector('div.F7nice span[aria-label*="review"]');
        const reviewText = reviewEl?.textContent?.trim() || reviewEl?.getAttribute('aria-label') || '';
        const categoryLabel =
          document.querySelector('button[jsaction*="category"]')?.textContent?.trim() || '';
        const address =
          document.querySelector('button[data-item-id="address"]')?.textContent?.trim() || '';
        const heroImg =
          document.querySelector('button[jsaction*="heroHeaderImage"] img')?.getAttribute('src') ||
          document.querySelector('button.aoRNLd img')?.getAttribute('src') ||
          Array.from(document.querySelectorAll('img[src*="googleusercontent.com"]'))
            .map((i) => i.getAttribute('src') || '')
            .find((s) => !s.includes('/a/')) ||
          '';
        return { name, ratingText, reviewText, categoryLabel, address, heroImg };
      });

      if (!single.name) return [];

      const coordMatch =
        currentUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ||
        currentUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const itemLat = coordMatch ? parseFloat(coordMatch[1]) : null;
      const itemLng = coordMatch ? parseFloat(coordMatch[2]) : null;

      let distanceKm = null;
      if (itemLat !== null && itemLng !== null) {
        distanceKm = Number(
          calculateDistanceKm(centerLat, centerLng, itemLat, itemLng).toFixed(2)
        );
        if (distanceKm > radiusKm) return [];
      }

      const rating = single.ratingText ? parseFloat(single.ratingText.replace(',', '.')) : 0;
      const digits = single.reviewText.replace(/[^\d]/g, '');
      const reviewCount = digits ? parseInt(digits, 10) : 0;

      return [
        {
          id: crypto.createHash('sha1').update(currentUrl).digest('hex').slice(0, 16),
          type,
          name: single.name,
          rating: Number.isNaN(rating) ? 0 : rating,
          reviewCount: Number.isNaN(reviewCount) ? 0 : reviewCount,
          distanceKm,
          categoryLabel: single.categoryLabel || (type === 'lodging' ? 'Nơi ở' : 'Quán ăn'),
          address: single.address.replace(/[\uE000-\uF8FF]/g, '').trim(),
          priceLevel: '',
          imageUrl: upgradePhotoUrl(single.heroImg),
          lat: itemLat,
          lng: itemLng,
          mapsUrl: currentUrl,
        },
      ];
    }

    // Scroll feed in steps so lazy-loaded images and all results load quickly
    let previousCount = 0;
    let stagnantRounds = 0;
    const maxScrolls = Math.min(22, Math.ceil(maxResults / 5) + 4);

    for (let i = 0; i < maxScrolls; i++) {
      const currentCount = await page.locator('a.hfpxzc').count();
      if (currentCount >= maxResults) break;

      if (currentCount === previousCount) {
        stagnantRounds++;
        if (stagnantRounds >= 3) break;
      } else {
        stagnantRounds = 0;
      }
      previousCount = currentCount;

      await page.evaluate((sel) => {
        const feed = document.querySelector(sel);
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      }, feedSelector);

      await page.waitForTimeout(stagnantRounds > 0 ? 1500 : 900);

      const endReached = await page.evaluate(() => {
        const text = document.body.innerText;
        return (
          text.includes('Bạn đã xem hết danh sách') ||
          text.includes("You've reached the end of the list")
        );
      });
      if (endReached) break;
    }

    // Scroll any cards whose lazy-loaded thumbnail hasn't rendered yet into view
    await page.evaluate(async () => {
      const cards = Array.from(document.querySelectorAll('div.Nv2PK'));
      for (const card of cards) {
        const hasImg = Array.from(card.querySelectorAll('img')).some((img) => {
          const s = img.getAttribute('src') || '';
          return s.includes('googleusercontent.com') || s.includes('streetviewpixels');
        });
        if (!hasImg) {
          card.scrollIntoView({ behavior: 'instant', block: 'center' });
          await new Promise((r) => setTimeout(r, 180));
        }
      }
    });
    await page.waitForTimeout(400);

    const rawPlaces = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.Nv2PK'));
      return cards.map((card) => {
        const linkEl = card.querySelector('a.hfpxzc');
        const href = linkEl?.getAttribute('href') || '';
        const name =
          linkEl?.getAttribute('aria-label') ||
          card.querySelector('.qBF1Pd')?.textContent?.trim() ||
          '';

        const ratingText = card.querySelector('span.MW4etd')?.textContent?.trim() || '';
        const reviewText = card.querySelector('span.UY7F9')?.textContent?.trim() || '';

        // Info lines inside card
        const infoBlocks = Array.from(card.querySelectorAll('.W4Efsd')).map((el) =>
          el.textContent?.replace(/\s+/g, ' ').trim()
        );

        // Find best thumbnail image inside card
        const imgs = Array.from(card.querySelectorAll('img'));
        let imageUrl = '';
        for (const img of imgs) {
          const src = img.getAttribute('src') || '';
          if (
            src.includes('googleusercontent.com') ||
            src.includes('streetviewpixels') ||
            src.includes('lh3.') ||
            src.includes('lh5.')
          ) {
            imageUrl = src;
            break;
          }
        }

        return {
          name,
          href,
          ratingText,
          reviewText,
          infoBlocks,
          imageUrl,
        };
      });
    });

    const results = [];
    const seen = new Set();

    for (const item of rawPlaces) {
      if (!item.name || !item.href) continue;
      if (seen.has(item.href)) continue;
      seen.add(item.href);

      // Parse coordinates from Google Maps URL (!3dLAT!4dLNG)
      const coordMatch = item.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      const itemLat = coordMatch ? parseFloat(coordMatch[1]) : null;
      const itemLng = coordMatch ? parseFloat(coordMatch[2]) : null;

      let distanceKm = null;
      if (itemLat !== null && itemLng !== null) {
        distanceKm = Number(
          calculateDistanceKm(centerLat, centerLng, itemLat, itemLng).toFixed(2)
        );
        if (distanceKm > radiusKm) {
          continue;
        }
      }

      // Parse rating (handles comma or dot: "4,6" -> 4.6)
      const rating = item.ratingText
        ? parseFloat(item.ratingText.replace(',', '.'))
        : 0;

      // Parse review count: "(1.234)" -> 1234, "(1,2 N)" -> 1200
      let reviewCount = 0;
      if (item.reviewText) {
        const cleaned = item.reviewText.replace(/[()]/g, '').trim();
        if (/k|n/i.test(cleaned)) {
          const num = parseFloat(cleaned.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!Number.isNaN(num)) reviewCount = Math.round(num * 1000);
        } else {
          const digits = cleaned.replace(/[^\d]/g, '');
          if (digits) reviewCount = parseInt(digits, 10);
        }
      }

      // Extract category, price, and address from infoBlocks (strip icon glyphs)
      const detailLine = (
        item.infoBlocks.find((b) => b && !b.includes(item.ratingText)) || ''
      )
        .replace(/[\uE000-\uF8FF]/g, '')
        .trim();
      const parts = detailLine
        .split('·')
        .map((p) => p.trim())
        .filter(Boolean);

      let categoryLabel = type === 'lodging' ? 'Nơi ở' : 'Quán ăn';
      let address = '';
      let priceLevel = '';

      for (const part of parts) {
        if (/^[₫$]+$/.test(part) || /\d+\s*₫/.test(part)) {
          priceLevel = part;
        } else if (!categoryLabel || part.length < 28 && !/\d/.test(part) && !address) {
          categoryLabel = part;
        } else if (!address) {
          address = part;
        }
      }

      if (!address && parts.length > 1) {
        address = parts[parts.length - 1];
      }

      if (address) {
        address = address
          .replace(/(Đang mở cửa|Đã đóng cửa|Sắp đóng cửa|Sắp mở cửa|Mở cửa cả ngày)/g, ' · $1')
          .replace(/^\s*·\s*/, '')
          .trim();
      }

      results.push({
        id: crypto.createHash('sha1').update(item.href).digest('hex').slice(0, 16),
        type,
        name: item.name,
        rating: Number.isNaN(rating) ? 0 : rating,
        reviewCount: Number.isNaN(reviewCount) ? 0 : reviewCount,
        distanceKm,
        categoryLabel,
        address,
        priceLevel,
        imageUrl: upgradePhotoUrl(item.imageUrl),
        lat: itemLat,
        lng: itemLng,
        mapsUrl: item.href,
      });

      if (results.length >= maxResults) break;
    }

    return results;
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Searches Google Maps for Lodging and/or Restaurants around a center point within radiusKm.
 */
export async function scrapeGoogleMaps({
  lat,
  lng,
  radiusKm = 3,
  category = 'all',
  customQuery = '',
  maxResults = 30,
}) {
  const tasks = [];

  if (customQuery && customQuery.trim()) {
    const inferredType = category === 'lodging' ? 'lodging' : 'restaurant';
    tasks.push({
      searchTerm: customQuery.trim(),
      type: inferredType,
      limit: maxResults,
    });
  } else {
    if (category === 'lodging' || category === 'all') {
      tasks.push({
        searchTerm: 'khách sạn homestay nơi ở',
        type: 'lodging',
        limit: category === 'all' ? Math.ceil(maxResults / 2) : maxResults,
      });
    }
    if (category === 'restaurant' || category === 'all') {
      tasks.push({
        searchTerm: 'quán ăn nhà hàng',
        type: 'restaurant',
        limit: category === 'all' ? Math.ceil(maxResults / 2) : maxResults,
      });
    }
  }

  const taskResults = await Promise.all(
    tasks.map((task) =>
      scrapeSingleQuery({
        centerLat: lat,
        centerLng: lng,
        radiusKm,
        searchTerm: task.searchTerm,
        type: task.type,
        maxResults: task.limit,
      })
    )
  );

  const allResults = [];
  const seenUrls = new Set();

  for (const items of taskResults) {
    for (const item of items) {
      if (!seenUrls.has(item.mapsUrl)) {
        seenUrls.add(item.mapsUrl);
        allResults.push(item);
      }
    }
  }

  return allResults;
}

/**
 * Fetches additional photos, metadata, and up to 30 newest reviews for a Google Maps place URL.
 */
export async function scrapePlaceDetails(mapsUrl) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    locale: 'vi-VN',
    viewport: { width: 1280, height: 850 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1800);
    await checkPageAndConsent(page);

    await page
      .waitForSelector('h1.DUwDvf, button[jsaction*="photo"]', { timeout: 10000 })
      .catch(() => {});

    // 1. Extract overview info & photos first
    const details = await page.evaluate(() => {
      const address =
        document.querySelector('button[data-item-id="address"]')?.textContent?.trim() || '';
      const phone =
        document.querySelector('button[data-item-id^="phone:"]')?.textContent?.trim() || '';
      const website =
        document.querySelector('a[data-item-id="authority"]')?.getAttribute('href') || '';
      const hours =
        document.querySelector('[aria-label*="Giờ"]')?.getAttribute('aria-label') || '';

      const photoUrls = new Set();
      const imgs = Array.from(document.querySelectorAll('img'));
      for (const img of imgs) {
        const src = img.getAttribute('src') || '';
        if (
          (src.includes('googleusercontent.com') || src.includes('streetviewpixels')) &&
          !src.includes('/a/') &&
          !src.includes('=s32') &&
          !src.includes('=s40')
        ) {
          photoUrls.add(src);
        }
      }

      return {
        address,
        phone,
        website,
        hours,
        photos: Array.from(photoUrls).slice(0, 12),
        reviews: [],
      };
    });

    details.photos = details.photos
      .map((u) => u.replace(/=[ws]\d+(-h\d+)?[^&]*/i, '=w1000-h750-k-no'))
      .filter(Boolean);

    // 2. Switch to "Bài đánh giá" (Reviews) tab and sort by "Mới nhất" (Newest)
    const reviewsTab = page.locator(
      'button[role="tab"]:has-text("Bài đánh giá"), button[role="tab"]:has-text("Reviews")'
    );

    if ((await reviewsTab.count()) > 0) {
      await reviewsTab.first().click().catch(() => {});
      await page.waitForTimeout(1500);

      // Click Sort button ("Sắp xếp" / "Sort")
      const sortBtn = page.locator(
        'button[aria-label*="Sắp xếp"], button[aria-label*="Sort"], button:has-text("Sắp xếp")'
      );
      if ((await sortBtn.count()) > 0) {
        await sortBtn.first().click().catch(() => {});
        await page.waitForTimeout(700);

        const newestOption = page.locator(
          'div[role="menuitemradio"]:has-text("Mới nhất"), div[role="menuitemradio"]:has-text("Newest"), [data-index="1"][role="menuitemradio"]'
        );
        if ((await newestOption.count()) > 0) {
          await newestOption.first().click().catch(() => {});
          await page.waitForTimeout(1500);
        }
      }

      // Scroll the reviews scrollable container until 30 reviews are loaded
      let prevReviews = 0;
      let stagnant = 0;
      for (let i = 0; i < 18; i++) {
        const count = await page.locator('div.jftiEf').count();
        if (count >= 30) break;

        if (count === prevReviews) {
          stagnant++;
          if (stagnant >= 3) break;
        } else {
          stagnant = 0;
        }
        prevReviews = count;

        const box = await page.locator('div.jftiEf').last().boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.wheel(0, 2500);
        }
        await page.evaluate(() => {
          const firstCard = document.querySelector('div.jftiEf');
          let el = firstCard?.parentElement;
          while (el && el !== document.body) {
            if (el.scrollHeight > el.clientHeight + 20) {
              el.scrollTop = el.scrollHeight;
              return;
            }
            el = el.parentElement;
          }
          const container = document.querySelector('div.m6QErb.DxyBCb.kA9KIf.dS8AEf');
          if (container) container.scrollTop = container.scrollHeight;
        });
        await page.waitForTimeout(stagnant > 0 ? 1400 : 900);
      }

      // Expand truncated "Thêm" / "More" review text
      await page.evaluate(() => {
        document.querySelectorAll('div.jftiEf button.w8nwRe').forEach((btn) => btn.click());
      });
      await page.waitForTimeout(300);

      details.reviews = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div.jftiEf')).slice(0, 30);
        return cards.map((card, idx) => {
          const author = card.querySelector('.d4r55')?.textContent?.trim() || 'Người dùng Google';
          const authorPhoto = card.querySelector('img.NBa7we')?.getAttribute('src') || '';
          const ratingLabel =
            card.querySelector('span.kvMYJc')?.getAttribute('aria-label') || '';
          const ratingMatch = ratingLabel.match(/(\d+(?:[.,]\d+)?)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : 0;
          const relativeTime = card.querySelector('span.rsqaWe')?.textContent?.trim() || '';
          const text = card.querySelector('span.wiI7pd')?.textContent?.trim() || '';

          const reviewPhotos = Array.from(card.querySelectorAll('div.KtCyie button'))
            .map((btn) => {
              const bg = btn.style?.backgroundImage || '';
              const m = bg.match(/url\(["']?(.*?)["']?\)/);
              return m ? m[1].replace(/=[ws]\d+(-h\d+)?[^&]*/i, '=w600-h450-k-no') : null;
            })
            .filter(Boolean);

          return {
            id: `${idx}-${author}`,
            author,
            authorPhoto,
            rating,
            relativeTime,
            text,
            photos: reviewPhotos,
          };
        });
      });
    }

    return details;
  } finally {
    await context.close().catch(() => {});
  }
}
