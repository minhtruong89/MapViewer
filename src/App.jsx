import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertCircle, Sparkles, History } from 'lucide-react';
import Header from './components/Header';
import SearchSidebar from './components/SearchSidebar';
import ResultsToolbar from './components/ResultsToolbar';
import PlaceCard from './components/PlaceCard';
import PlaceModal from './components/PlaceModal';
import SaveToMapModal from './components/SaveToMapModal';
import SavedMapsView from './components/SavedMapsView';
import { useSavedMaps } from './hooks/useSavedMaps';
import { useSearchHistory } from './hooks/useSearchHistory';
import { computeTrustScore } from './utils/geo';

const CENTERS_STORAGE_KEY = 'analyzed_map_centers_v1';
const LAST_CENTER_STORAGE_KEY = 'analyzed_map_last_center_v1';

const DEFAULT_PRESET_CENTERS = [
  { name: 'Hồ Xuân Hương, Đà Lạt', lat: 11.940419, lng: 108.442254 },
  { name: 'Chợ Đà Lạt', lat: 11.942278, lng: 108.437539 },
  { name: 'Hồ Tuyền Lâm, Đà Lạt', lat: 11.9012, lng: 108.4325 },
  { name: 'Hoàng Hoa Thám, HCM', lat: 10.80604, lng: 106.69057 },
];

const FALLBACK_DEFAULT_CENTER = DEFAULT_PRESET_CENTERS[1]; // Chợ Đà Lạt

export default function App() {
  // Search parameters
  const [presetCenters, setPresetCenters] = useState(() => {
    try {
      const raw = localStorage.getItem(CENTERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (c) =>
              typeof c?.lat === 'number' &&
              Number.isFinite(c.lat) &&
              typeof c?.lng === 'number' &&
              Number.isFinite(c.lng) &&
              c?.name
          );
        }
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_PRESET_CENTERS;
  });

  const [center, setCenter] = useState(() => {
    try {
      const raw = localStorage.getItem(LAST_CENTER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed?.lat === 'number' &&
          Number.isFinite(parsed.lat) &&
          typeof parsed?.lng === 'number' &&
          Number.isFinite(parsed.lng) &&
          parsed?.name
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback to Chợ Đà Lạt
    }
    return FALLBACK_DEFAULT_CENTER;
  });

  const [radiusKm, setRadiusKm] = useState(5);
  const [category, setCategory] = useState('all'); // 'all' | 'lodging' | 'restaurant'
  const [customQuery, setCustomQuery] = useState('');
  const [maxResults, setMaxResults] = useState(50);

  // GPS locate state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Scraping state
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // View, filter & sort state
  const [sortBy, setSortBy] = useState('trust_desc');
  const [filterType, setFilterType] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [keywordFilter, setKeywordFilter] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Selection, modal & auth state
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [modalPlace, setModalPlace] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginNotice, setLoginNotice] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [supportsGuiLogin, setSupportsGuiLogin] = useState(false);

  // Background thumbnail enrichment & OSRM driving distances
  const [searchSeq, setSearchSeq] = useState(0);
  const [bgProgress, setBgProgress] = useState(null);
  const [drivingStatus, setDrivingStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'fallback'
  const enrichedIdsRef = useRef(new Set());
  const bgAbortRef = useRef(null);
  const drivingAbortRef = useRef(null);

  // Two main modes: 'search' | 'saved'
  const [activeView, setActiveView] = useState('search');
  const [saveTargetPlace, setSaveTargetPlace] = useState(null);

  const {
    savedMaps,
    savedPlaceIds,
    toggleMap,
    createAndSave,
    renameMap,
    removeItem,
    deleteMap,
    updateItemMeta,
    updatePlaceInSavedMaps,
    exportMapsJson,
    importMapsJson,
  } = useSavedMaps();

  const {
    history: searchHistory,
    saveSearchSnapshot,
    updateSnapshotPlaces,
    removeHistoryEntry,
    clearHistory,
  } = useSearchHistory();
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const activeHistoryIdRef = useRef(activeHistoryId);
  activeHistoryIdRef.current = activeHistoryId;

  useEffect(() => {
    try {
      localStorage.setItem(CENTERS_STORAGE_KEY, JSON.stringify(presetCenters));
    } catch {
      // Ignore storage quota errors
    }
  }, [presetCenters]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_CENTER_STORAGE_KEY, JSON.stringify(center));
    } catch {
      // Ignore storage quota errors
    }
  }, [center]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keywordFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordFilter]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setHasProfile(Boolean(d?.hasProfile));
        setSupportsGuiLogin(Boolean(d?.supportsGuiLogin));
      })
      .catch(() => {});

    return () => {
      drivingAbortRef.current?.abort();
    };
  }, []);

  const handleSetAndAddCenter = useCallback((newCenter) => {
    setCenter(newCenter);
    setPresetCenters((prev) => {
      const exists = prev.some(
        (c) =>
          c.name.toLowerCase() === newCenter.name.toLowerCase() ||
          (Math.abs(c.lat - newCenter.lat) < 0.0001 &&
            Math.abs(c.lng - newCenter.lng) < 0.0001)
      );
      if (exists) return prev;
      return [...prev, newCenter];
    });
  }, []);

  const handleRemovePresetCenter = useCallback((nameToRemove) => {
    setPresetCenters((prev) => prev.filter((c) => c.name !== nameToRemove));
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }
    if (!window.isSecureContext) {
      setGpsError('Định vị GPS yêu cầu kết nối HTTPS hoặc localhost.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setCenter({ name: 'Vị trí của tôi', lat, lng });
        setGpsLoading(false);

        try {
          const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data?.shortName) {
            setCenter((prev) =>
              prev &&
              Math.abs(prev.lat - lat) < 0.00001 &&
              Math.abs(prev.lng - lng) < 0.00001
                ? { ...prev, name: `Vị trí của tôi (${data.shortName})` }
                : prev
            );
          }
        } catch {
          // Keep coordinate label when reverse geocoding fails
        }
      },
      (err) => {
        setGpsLoading(false);
        switch (err.code) {
          case 1:
            setGpsError(
              'Bạn đã từ chối quyền truy cập vị trí. Hãy cấp quyền định vị cho trình duyệt.'
            );
            break;
          case 2:
            setGpsError('Không thể xác định vị trí hiện tại.');
            break;
          case 3:
            setGpsError('Hết thời gian chờ tín hiệu GPS. Vui lòng thử lại.');
            break;
          default:
            setGpsError('Không thể lấy vị trí GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const fetchSearchDrivingDistances = useCallback(
    async (originCenter, placeList, historyId) => {
      drivingAbortRef.current?.abort();
      const destinations = (placeList || [])
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ id: p.id, lat: p.lat, lng: p.lng }));

      if (destinations.length === 0) {
        setDrivingStatus('idle');
        return;
      }

      const controller = new AbortController();
      drivingAbortRef.current = controller;
      setDrivingStatus('loading');

      try {
        const res = await fetch('/api/driving-distances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: originCenter.lat, lng: originCenter.lng },
            destinations,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('OSRM error');
        const data = await res.json();
        if (controller.signal.aborted) return;

        const map = data.results || {};
        const hasAny = Object.keys(map).length > 0;

        if (hasAny) {
          const applyDriving = (list) =>
            list.map((p) => {
              const info = map[p.id];
              return info
                ? {
                    ...p,
                    drivingDistanceKm: info.distanceKm,
                    drivingDurationMin: info.durationMin,
                  }
                : p;
            });

          setPlaces(applyDriving);
          if (historyId) {
            updateSnapshotPlaces(historyId, applyDriving);
          }
          setDrivingStatus('ready');
        } else {
          setDrivingStatus('fallback');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setDrivingStatus('fallback');
        }
      }
    },
    [updateSnapshotPlaces]
  );

  const handlePlaceEnriched = useCallback(
    (placeId, data) => {
      enrichedIdsRef.current.add(placeId);
      const firstPhoto = data?.photos?.[0] || null;
      const nextAddr = data?.address || '';
      const nextTel = data?.phone || '';
      if (!firstPhoto && !nextAddr && !nextTel) return;

      const patchItem = (p) =>
        p.id === placeId
          ? {
              ...p,
              imageUrl: p.imageUrl || firstPhoto,
              address: nextAddr || p.address,
              phone: p.phone || nextTel || '',
            }
          : p;

      setPlaces((prev) => prev.map(patchItem));
      setSelectedPlace((prev) => (prev && prev.id === placeId ? patchItem(prev) : prev));
      updatePlaceInSavedMaps(placeId, data);
      if (activeHistoryIdRef.current) {
        updateSnapshotPlaces(activeHistoryIdRef.current, (prev) => prev.map(patchItem));
      }
    },
    [updatePlaceInSavedMaps, updateSnapshotPlaces]
  );

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

  async function handleSearch() {
    bgAbortRef.current?.abort();
    drivingAbortRef.current?.abort();
    enrichedIdsRef.current.clear();
    setBgProgress(null);
    setDrivingStatus('idle');
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

      const fetchedPlaces = data.places || [];
      setPlaces(fetchedPlaces);
      const snapId = saveSearchSnapshot({
        center,
        radiusKm,
        category,
        customQuery,
        maxResults,
        places: fetchedPlaces,
      });
      setActiveHistoryId(snapId);
      setSearchSeq((s) => s + 1);
      fetchSearchDrivingDistances(center, fetchedPlaces, snapId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleRestoreHistory = useCallback(
    (entry) => {
      if (!entry) return;
      bgAbortRef.current?.abort();
      drivingAbortRef.current?.abort();
      enrichedIdsRef.current.clear();
      setBgProgress(null);
      setError('');

      const restoredPlaces = entry.places || [];
      setCenter(entry.center);
      setRadiusKm(entry.radiusKm);
      setCategory(entry.category);
      setCustomQuery(entry.customQuery || '');
      setMaxResults(entry.maxResults || 50);
      setPlaces(restoredPlaces);
      setHasSearched(true);
      setSelectedPlace(null);
      setActiveHistoryId(entry.id);
      setSearchSeq((s) => s + 1);

      if (restoredPlaces.some((p) => p.drivingDistanceKm != null)) {
        setDrivingStatus('ready');
      } else {
        setDrivingStatus('idle');
        fetchSearchDrivingDistances(entry.center, restoredPlaces, entry.id);
      }
    },
    [fetchSearchDrivingDistances]
  );

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
        case 'trust_desc':
          return (
            computeTrustScore(b.rating, b.reviewCount) -
              computeTrustScore(a.rating, a.reviewCount) ||
            b.reviewCount - a.reviewCount
          );
        case 'rating_desc':
          return b.rating - a.rating || b.reviewCount - a.reviewCount;
        case 'rating_asc':
          return a.rating - b.rating || a.reviewCount - b.reviewCount;
        case 'reviews_desc':
          return b.reviewCount - a.reviewCount || b.rating - a.rating;
        case 'reviews_asc':
          return a.reviewCount - b.reviewCount || a.rating - b.rating;
        case 'distance_asc':
          return (
            (a.drivingDistanceKm ?? a.distanceKm ?? 999) -
            (b.drivingDistanceKm ?? b.distanceKm ?? 999)
          );
        default:
          return 0;
      }
    });
  }, [places, filterType, minRating, minReviews, keywordFilter, sortBy]);

  const filteredPlacesRef = useRef(filteredPlaces);
  filteredPlacesRef.current = filteredPlaces;

  // Background queue: fetch missing thumbnails (and full address/phone) sequentially
  // Pauses when leaving Search tab, restarts in display order when sorted/filtered, and cancels on new search.
  useEffect(() => {
    if (searchSeq === 0 || loading || activeView !== 'search') {
      setBgProgress(null);
      return;
    }

    const queue = filteredPlacesRef.current.filter(
      (p) => !p.imageUrl && !enrichedIdsRef.current.has(p.id)
    );
    if (queue.length === 0) {
      setBgProgress(null);
      return;
    }

    const controller = new AbortController();
    bgAbortRef.current = controller;
    let cancelled = false;

    async function runQueue() {
      setBgProgress({ done: 0, total: queue.length });

      for (let i = 0; i < queue.length; i++) {
        if (cancelled || controller.signal.aborted) break;
        const item = queue[i];

        try {
          const res = await fetch(
            `/api/place-details?url=${encodeURIComponent(item.mapsUrl)}`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            enrichedIdsRef.current.add(item.id);
            const firstPhoto = data.photos?.[0] || null;

            if (firstPhoto || data.address || data.phone) {
              const patchItem = (p) =>
                p.id === item.id
                  ? {
                      ...p,
                      imageUrl: p.imageUrl || firstPhoto,
                      address: data.address || p.address,
                      phone: p.phone || data.phone || '',
                    }
                  : p;

              setPlaces((prev) => prev.map(patchItem));
              updatePlaceInSavedMaps(item.id, data);
              if (activeHistoryIdRef.current) {
                updateSnapshotPlaces(activeHistoryIdRef.current, (prev) =>
                  prev.map(patchItem)
                );
              }
            }
          } else {
            enrichedIdsRef.current.add(item.id);
          }
        } catch (err) {
          if (err.name === 'AbortError') break;
          enrichedIdsRef.current.add(item.id);
        }

        if (!cancelled) {
          setBgProgress({ done: i + 1, total: queue.length });
        }
      }

      if (!cancelled) {
        setBgProgress(null);
      }
    }

    runQueue();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    searchSeq,
    loading,
    activeView,
    sortBy,
    filterType,
    minRating,
    minReviews,
    debouncedKeyword,
    updatePlaceInSavedMaps,
    updateSnapshotPlaces,
  ]);

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
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        savedMapsCount={savedMaps.length}
        onSelectCenter={handleSetAndAddCenter}
        onError={setError}
        supportsGuiLogin={supportsGuiLogin}
        hasProfile={hasProfile}
        loginLoading={loginLoading}
        onOpenLogin={handleOpenLogin}
        loginNotice={loginNotice}
        onDismissLoginNotice={() => setLoginNotice('')}
      />

      {activeView === 'saved' ? (
        <SavedMapsView
          savedMaps={savedMaps}
          onDeleteMap={deleteMap}
          onRenameMap={renameMap}
          onRemoveItem={removeItem}
          onUpdateItemMeta={updateItemMeta}
          onOpenDetails={(p) => setModalPlace(p)}
          onSwitchToSearch={() => setActiveView('search')}
          onExportMaps={exportMapsJson}
          onImportMaps={importMapsJson}
        />
      ) : (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <SearchSidebar
            center={center}
            presetCenters={presetCenters}
            onSelectCenter={setCenter}
            onRemovePresetCenter={handleRemovePresetCenter}
            onMapCenterChange={setCenter}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            onLocateMe={handleLocateMe}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            category={category}
            onCategoryChange={setCategory}
            customQuery={customQuery}
            onCustomQueryChange={setCustomQuery}
            maxResults={maxResults}
            onMaxResultsChange={setMaxResults}
            loading={loading}
            onSearch={handleSearch}
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            searchHistory={searchHistory}
            activeHistoryId={activeHistoryId}
            onRestoreHistory={handleRestoreHistory}
            onRemoveHistory={(id) => {
              removeHistoryEntry(id);
              if (id === activeHistoryId) setActiveHistoryId(null);
            }}
            onClearHistory={() => {
              clearHistory();
              setActiveHistoryId(null);
            }}
          />

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

            <ResultsToolbar
              stats={stats}
              radiusKm={radiusKm}
              centerName={center.name}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              minRating={minRating}
              onMinRatingChange={setMinRating}
              minReviews={minReviews}
              onMinReviewsChange={setMinReviews}
              keywordFilter={keywordFilter}
              onKeywordFilterChange={setKeywordFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              bgProgress={bgProgress}
              drivingStatus={drivingStatus}
            />

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
                    onSetCenter={(p) =>
                      handleSetAndAddCenter({
                        name: p.name,
                        lat: p.lat,
                        lng: p.lng,
                      })
                    }
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

                {!hasSearched && searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRestoreHistory(searchHistory[0])}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    Mở lại lần quét gần nhất: {searchHistory[0].center.name} (
                    {searchHistory[0].places.length} điểm)
                  </button>
                )}
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
          onToggleMap={toggleMap}
          onCreateAndSave={createAndSave}
          onClose={() => setSaveTargetPlace(null)}
        />
      )}

      {/* Detail & Photo Gallery Modal */}
      {modalPlace && (
        <PlaceModal
          place={modalPlace}
          onClose={() => setModalPlace(null)}
          onEnriched={handlePlaceEnriched}
        />
      )}
    </div>
  );
}
