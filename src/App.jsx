import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  BedDouble,
  Utensils,
  Layers,
  Loader2,
  Compass,
  AlertCircle,
  ArrowUpDown,
  Sparkles,
  UserCheck,
  Map as MapIcon,
} from 'lucide-react';
import InteractiveMap from './components/InteractiveMap';
import PlaceCard from './components/PlaceCard';
import PlaceModal from './components/PlaceModal';
import SaveToMapModal from './components/SaveToMapModal';
import SavedMapsView from './components/SavedMapsView';

const SAVED_MAPS_STORAGE_KEY = 'analyzed_map_saved_v1';

const PRESET_CENTERS = [
  { name: 'Hồ Xuân Hương, Đà Lạt', lat: 11.940419, lng: 108.442254 },
  { name: 'Chợ Đà Lạt', lat: 11.942278, lng: 108.437539 },
  { name: 'Hồ Tuyền Lâm, Đà Lạt', lat: 11.9012, lng: 108.4325 },
  { name: 'Hoàng Hoa Thám, HCM', lat: 10.80604, lng: 106.69057 },
];

export default function App() {
  // Search parameters
  const [center, setCenter] = useState(PRESET_CENTERS[0]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [category, setCategory] = useState('all'); // 'all' | 'lodging' | 'restaurant'
  const [customQuery, setCustomQuery] = useState('');
  const [maxResults, setMaxResults] = useState(50);

  // Geocode search
  const [locationInput, setLocationInput] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);

  // Scraping state
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // View, filter & sort state
  const [sortBy, setSortBy] = useState('rating_desc');
  const [filterType, setFilterType] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [keywordFilter, setKeywordFilter] = useState('');

  // Selection & modal
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [modalPlace, setModalPlace] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginNotice, setLoginNotice] = useState('');
  const [hasProfile, setHasProfile] = useState(false);

  // Two main modes: 'search' | 'saved'
  const [activeView, setActiveView] = useState('search');
  const [savedMaps, setSavedMaps] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_MAPS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [saveTargetPlace, setSaveTargetPlace] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(savedMaps));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedMaps]);

  const savedPlaceIds = useMemo(() => {
    const ids = new Set();
    savedMaps.forEach((m) => m.items.forEach((it) => ids.add(it.id)));
    return ids;
  }, [savedMaps]);

  function handleToggleMap(mapId, place) {
    setSavedMaps((prev) =>
      prev.map((m) => {
        if (m.id !== mapId) return m;
        const exists = m.items.some((it) => it.id === place.id);
        return {
          ...m,
          items: exists
            ? m.items.filter((it) => it.id !== place.id)
            : [...m.items, place],
        };
      })
    );
  }

  function handleCreateAndSave(mapName, place) {
    const newMap = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: mapName,
      createdAt: new Date().toISOString(),
      items: [place],
    };
    setSavedMaps((prev) => [newMap, ...prev]);
  }

  function handleRemoveItemFromMap(mapId, placeId) {
    setSavedMaps((prev) =>
      prev.map((m) =>
        m.id === mapId ? { ...m, items: m.items.filter((it) => it.id !== placeId) } : m
      )
    );
  }

  function handleDeleteMap(mapId) {
    setSavedMaps((prev) => prev.filter((m) => m.id !== mapId));
  }

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setHasProfile(Boolean(d?.hasProfile)))
      .catch(() => {});
  }, []);

  async function handleOpenLogin() {
    setLoginLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể mở trình duyệt đăng nhập.');
      setLoginNotice(
        'Đã mở cửa sổ Chrome/Edge tới Google Maps. Hãy đăng nhập tài khoản Google của bạn, sau đó ĐÓNG cửa sổ trình duyệt đó rồi bấm quét lại.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGeocode(e) {
    e.preventDefault();
    const q = locationInput.trim();
    if (!q) return;

    setGeoLoading(true);
    setGeoSuggestions([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tìm thấy địa điểm.');
      setGeoSuggestions(data.suggestions || []);
      if (data.suggestions?.length === 1) {
        const first = data.suggestions[0];
        setCenter({ name: first.shortName, lat: first.lat, lng: first.lng });
        setGeoSuggestions([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSearch() {
    setLoading(true);
    setError('');
    setHasSearched(true);
    setSelectedPlace(null);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          radiusKm,
          category,
          customQuery,
          maxResults,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi lấy dữ liệu từ Google Maps.');
      }

      setPlaces(data.places || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filtered & sorted results
  const filteredPlaces = useMemo(() => {
    const kw = keywordFilter.trim().toLowerCase();

    const filtered = places.filter((p) => {
      if (filterType !== 'all' && p.type !== filterType) return false;
      if (p.rating < minRating) return false;
      if (p.reviewCount < minReviews) return false;
      if (
        kw &&
        !p.name.toLowerCase().includes(kw) &&
        !(p.address || '').toLowerCase().includes(kw) &&
        !(p.categoryLabel || '').toLowerCase().includes(kw)
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating_desc':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'rating_asc':
          return a.rating - b.rating || a.reviewCount - b.reviewCount;
        case 'reviews_desc':
          return b.reviewCount - a.reviewCount || b.rating - a.rating;
        case 'reviews_asc':
          return a.reviewCount - b.reviewCount || a.rating - b.rating;
        case 'distance_asc':
          return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
        default:
          return 0;
      }
    });
  }, [places, filterType, minRating, minReviews, keywordFilter, sortBy]);

  // Summary metrics
  const stats = useMemo(() => {
    if (filteredPlaces.length === 0) {
      return { total: 0, avgRating: 0, totalReviews: 0, lodgingCount: 0, restaurantCount: 0 };
    }
    const rated = filteredPlaces.filter((p) => p.rating > 0);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, p) => sum + p.rating, 0) / rated.length
        : 0;
    const totalReviews = filteredPlaces.reduce((sum, p) => sum + p.reviewCount, 0);
    const lodgingCount = filteredPlaces.filter((p) => p.type === 'lodging').length;
    const restaurantCount = filteredPlaces.filter((p) => p.type === 'restaurant').length;

    return {
      total: filteredPlaces.length,
      avgRating: Number(avgRating.toFixed(2)),
      totalReviews,
      lodgingCount,
      restaurantCount,
    };
  }, [filteredPlaces]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                MapAnalyzer
              </h1>
              <p className="text-xs text-slate-500">
                Phân tích Nơi ở & Ăn uống từ Google Maps theo bán kính
              </p>
            </div>
          </div>

          {/* Main Mode Switcher: Tìm kiếm / Xem map */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveView('search')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'search'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={() => setActiveView('saved')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeView === 'saved'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Xem map
              {savedMaps.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                  {savedMaps.length}
                </span>
              )}
            </button>
          </div>

          {/* Area Geocode Search (Search mode only) */}
          {activeView === 'search' && (
            <div className="relative flex-1 max-w-md">
            <form onSubmit={handleGeocode} className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Tìm tâm khu vực (vd: Hồ Xuân Hương, Đà Lạt)..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={geoLoading}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer shrink-0"
              >
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Đặt tâm'}
              </button>
            </form>

            {geoSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                {geoSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCenter({ name: item.shortName, lat: item.lat, lng: item.lng });
                      setLocationInput(item.shortName);
                      setGeoSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 border-b last:border-b-0 border-slate-100 flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 line-clamp-2">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          <button
            type="button"
            onClick={handleOpenLogin}
            disabled={loginLoading}
            title="Mở trình duyệt để đăng nhập hoặc đổi tài khoản Google"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${
              hasProfile
                ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            {loginLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-600" />
            )}
            {hasProfile ? 'Hồ sơ Google (đã lưu)' : 'Đăng nhập Google'}
          </button>
        </div>
        {loginNotice && (
          <div className="bg-emerald-50 border-t border-emerald-200 px-4 sm:px-6 py-2 text-xs text-emerald-800 flex items-center justify-between gap-3">
            <span>{loginNotice}</span>
            <button
              type="button"
              onClick={() => setLoginNotice('')}
              className="font-bold hover:underline cursor-pointer shrink-0"
            >
              Đã hiểu
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      {activeView === 'saved' ? (
        <SavedMapsView
          savedMaps={savedMaps}
          onDeleteMap={handleDeleteMap}
          onRemoveItem={handleRemoveItemFromMap}
          onOpenDetails={(p) => setModalPlace(p)}
          onSwitchToSearch={() => setActiveView('search')}
        />
      ) : (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Sidebar: Controls */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            {/* Selected Center */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                1. Điểm trung tâm
              </label>
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
                <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="truncate">{center.name}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {center.lat.toFixed(5)}, {center.lng.toFixed(5)} · Nhấp bản đồ để đổi
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {PRESET_CENTERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCenter(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      center.name === preset.name
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {preset.name.split(',')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Radius */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Bán kính tỏa ra
                </label>
                <span className="text-sm font-extrabold text-blue-600">
                  {radiusKm} km
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="30"
                step="0.5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between gap-1 mt-2">
                {[1, 3, 5, 10, 20, 30].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      radiusKm === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                3. Loại địa điểm
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Tất cả', icon: Layers },
                  { id: 'lodging', label: 'Nơi ở', icon: BedDouble },
                  { id: 'restaurant', label: 'Ăn uống', icon: Utensils },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = category === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.id)}
                      className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Keyword & Max Results */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Từ khóa thêm (tùy chọn)
                </label>
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="vd: homestay, lẩu gà..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tối đa
                </label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            {/* Search CTA */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang quét Google Maps...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Quét dữ liệu Google Maps
                </>
              )}
            </button>
          </div>

          {/* Interactive Map on Sidebar (or Mobile) */}
          <div className="h-[340px] lg:h-[380px]">
            <InteractiveMap
              center={center}
              radiusKm={radiusKm}
              places={filteredPlaces}
              selectedPlace={selectedPlace}
              onCenterChange={setCenter}
              onSelectPlace={(p) => setSelectedPlace(p)}
            />
          </div>
        </aside>

        {/* Right Panel: Stats, Filters, Sort & Results */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-4">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể hoàn tất yêu cầu</p>
                <p className="text-xs mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Summary KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Địa điểm tìm thấy</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.lodgingCount} nơi ở · {stats.restaurantCount} ăn uống
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Sao trung bình</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-2xl font-extrabold text-slate-900">
                  {stats.avgRating || '—'}
                </p>
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Trong bán kính {radiusKm} km</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Tổng lượt review</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {stats.totalReviews.toLocaleString('vi-VN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cộng dồn các điểm</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Khu vực tâm</p>
              <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">{center.name}</p>
              <p className="text-[11px] text-blue-600 font-semibold mt-1">
                Bán kính {radiusKm} km
              </p>
            </div>
          </div>

          {/* Filter & Sort Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              Lọc:
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả loại</option>
              <option value="lodging">Chỉ Nơi ở</option>
              <option value="restaurant">Chỉ Ăn uống</option>
            </select>

            {/* Min rating */}
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value={0}>Mọi số sao</option>
              <option value={4.0}>Từ 4.0 ★ trở lên</option>
              <option value={4.5}>Từ 4.5 ★ trở lên</option>
              <option value={4.8}>Từ 4.8 ★ trở lên</option>
            </select>

            {/* Min reviews */}
            <select
              value={minReviews}
              onChange={(e) => setMinReviews(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value={0}>Mọi lượt review</option>
              <option value={50}>≥ 50 review</option>
              <option value={100}>≥ 100 review</option>
              <option value={500}>≥ 500 review</option>
              <option value={1000}>≥ 1.000 review</option>
            </select>

            {/* Quick text filter */}
            <input
              type="text"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="Lọc tên / đường..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none flex-1 min-w-[140px]"
            />

            {/* Sort dropdown */}
            <div className="flex items-center gap-1.5 ml-auto">
              <ArrowUpDown className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-blue-200 text-xs font-bold bg-blue-50 text-blue-800 focus:outline-none"
              >
                <option value="rating_desc">Sắp xếp: Số sao cao nhất</option>
                <option value="reviews_desc">Sắp xếp: Nhiều review nhất</option>
                <option value="distance_asc">Sắp xếp: Gần tâm nhất</option>
                <option value="rating_asc">Sắp xếp: Số sao thấp nhất</option>
                <option value="reviews_asc">Sắp xếp: Ít review nhất</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
              <h3 className="text-base font-bold text-slate-900">
                Đang thu thập dữ liệu từ Google Maps...
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Hệ thống đang quét các địa điểm quanh <strong>{center.name}</strong> trong bán kính{' '}
                <strong>{radiusKm} km</strong>. Quá trình này thường mất 10–25 giây.
              </p>
            </div>
          ) : filteredPlaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isSelected={selectedPlace?.id === place.id}
                  isSaved={savedPlaceIds.has(place.id)}
                  onSelect={(p) => setSelectedPlace(p)}
                  onOpenDetails={(p) => setModalPlace(p)}
                  onSave={(p) => setSaveTargetPlace(p)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-14 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {hasSearched
                  ? 'Không có địa điểm nào khớp bộ lọc hiện tại'
                  : 'Sẵn sàng khám phá khu vực của bạn'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                {hasSearched
                  ? 'Hãy thử tăng bán kính tìm kiếm, nới lỏng bộ lọc số sao / lượt review hoặc chọn tâm khác.'
                  : 'Chọn điểm trung tâm (vd: Hồ Xuân Hương), điều chỉnh bán kính (km) và nhấn "Quét dữ liệu Google Maps" để bắt đầu.'}
              </p>
            </div>
          )}
        </section>
      </main>
      )}

      {/* Save to Map Modal */}
      {saveTargetPlace && (
        <SaveToMapModal
          place={saveTargetPlace}
          savedMaps={savedMaps}
          onToggleMap={handleToggleMap}
          onCreateAndSave={handleCreateAndSave}
          onClose={() => setSaveTargetPlace(null)}
        />
      )}

      {/* Detail & Photo Gallery Modal */}
      {modalPlace && (
        <PlaceModal place={modalPlace} onClose={() => setModalPlace(null)} />
      )}
    </div>
  );
}
