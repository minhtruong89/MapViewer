import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapIcon,
  Trash2,
  MapPin,
  BedDouble,
  Utensils,
  Bookmark,
  Pencil,
  Check,
  X,
  Download,
  Upload,
  SlidersHorizontal,
  ArrowUpDown,
  Car,
  Route,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import InteractiveMap from './InteractiveMap';
import PlaceCard from './PlaceCard';
import {
  calculateDistanceKm,
  computeTrustScore,
  formatDurationMin,
  buildGoogleMapsRouteUrl,
} from '../utils/geo';

export default function SavedMapsView({
  savedMaps,
  onDeleteMap,
  onRenameMap,
  onRemoveItem,
  onUpdateItemMeta,
  onOpenDetails,
  onSwitchToSearch,
  onExportMaps,
  onImportMaps,
}) {
  const [activeMapId, setActiveMapId] = useState(savedMaps[0]?.id || null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [editingMapId, setEditingMapId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [mapStatusFilter, setMapStatusFilter] = useState('all'); // 'all' | 'visited' | 'unvisited'
  const [importNotice, setImportNotice] = useState(null);
  const [drivingMap, setDrivingMap] = useState({});
  const [drivingStatus, setDrivingStatus] = useState('idle');
  const [routeStopIds, setRouteStopIds] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (savedMaps.length === 0) {
      setActiveMapId(null);
      return;
    }
    if (!savedMaps.some((m) => m.id === activeMapId)) {
      setActiveMapId(savedMaps[0].id);
    }
  }, [savedMaps, activeMapId]);

  const activeMap = savedMaps.find((m) => m.id === activeMapId) || null;
  const items = activeMap?.items || [];

  useEffect(() => {
    setRouteStopIds([]);
    setRouteInfo(null);
  }, [activeMapId]);

  useEffect(() => {
    if (selectedPlace && !items.some((it) => it.id === selectedPlace.id)) {
      setSelectedPlace(null);
    }
    const validIds = new Set(items.map((it) => it.id));
    setRouteStopIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items, selectedPlace]);

  // Fetch real car driving distances from selected landmark via OSRM
  useEffect(() => {
    if (!selectedPlace || selectedPlace.lat == null || selectedPlace.lng == null) {
      setDrivingMap({});
      setDrivingStatus('idle');
      return;
    }

    const destinations = items
      .filter((it) => it.id !== selectedPlace.id && it.lat != null && it.lng != null)
      .map((it) => ({ id: it.id, lat: it.lat, lng: it.lng }));

    if (destinations.length === 0) {
      setDrivingMap({});
      setDrivingStatus('idle');
      return;
    }

    const controller = new AbortController();
    setDrivingMap({});
    setDrivingStatus('loading');

    fetch('/api/driving-distances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: selectedPlace.lat, lng: selectedPlace.lng },
        destinations,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('OSRM failed');
        return res.json();
      })
      .then((data) => {
        setDrivingMap(data.results || {});
        setDrivingStatus('ready');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setDrivingStatus('fallback');
        }
      });

    return () => controller.abort();
  }, [selectedPlace?.id, selectedPlace?.lat, selectedPlace?.lng, activeMapId, items]);

  const routeStops = useMemo(() => {
    const byId = new Map(items.map((it) => [it.id, it]));
    return routeStopIds
      .map((id) => byId.get(id))
      .filter((it) => it && it.lat != null && it.lng != null);
  }, [items, routeStopIds]);

  const routeStopNumbers = useMemo(() => {
    const map = new Map();
    routeStops.forEach((s, idx) => map.set(s.id, idx + 1));
    return map;
  }, [routeStops]);

  const routeCoordsKey = routeStops.map((s) => `${s.id}:${s.lat},${s.lng}`).join('|');

  useEffect(() => {
    if (routeStops.length < 2) {
      setRouteInfo(null);
      setRouteLoading(false);
      return;
    }

    const controller = new AbortController();
    setRouteLoading(true);

    fetch('/api/driving-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: routeStops.map((s) => ({ lat: s.lat, lng: s.lng })),
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Route failed');
        return res.json();
      })
      .then((data) => {
        setRouteInfo(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setRouteInfo(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      });

    return () => controller.abort();
  }, [routeCoordsKey]);

  const relativeDistances = useMemo(() => {
    const map = new Map();
    if (!selectedPlace || selectedPlace.lat == null || selectedPlace.lng == null) {
      return map;
    }
    for (const item of items) {
      if (item.id === selectedPlace.id || item.lat == null || item.lng == null) continue;
      const km = Number(
        calculateDistanceKm(
          selectedPlace.lat,
          selectedPlace.lng,
          item.lat,
          item.lng
        ).toFixed(2)
      );
      map.set(item.id, km);
    }
    return map;
  }, [items, selectedPlace]);

  const displayedItems = useMemo(() => {
    const filtered =
      filterType === 'all' ? items : items.filter((it) => it.type === filterType);
    if (sortBy === 'default') return filtered;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'trust_desc':
          return (
            computeTrustScore(b.rating, b.reviewCount) -
              computeTrustScore(a.rating, a.reviewCount) ||
            (b.reviewCount || 0) - (a.reviewCount || 0)
          );
        case 'rating_desc':
          return (
            (b.rating || 0) - (a.rating || 0) ||
            (b.reviewCount || 0) - (a.reviewCount || 0)
          );
        case 'reviews_desc':
          return (
            (b.reviewCount || 0) - (a.reviewCount || 0) ||
            (b.rating || 0) - (a.rating || 0)
          );
        case 'distance_selected': {
          if (!selectedPlace || selectedPlace.lat == null || selectedPlace.lng == null) {
            return 0;
          }
          const da =
            a.id === selectedPlace.id
              ? -1
              : (drivingMap[a.id]?.distanceKm ?? relativeDistances.get(a.id) ?? 9999);
          const db =
            b.id === selectedPlace.id
              ? -1
              : (drivingMap[b.id]?.distanceKm ?? relativeDistances.get(b.id) ?? 9999);
          return da - db;
        }
        default:
          return 0;
      }
    });
  }, [items, filterType, sortBy, selectedPlace, relativeDistances, drivingMap]);

  const mapPlaces = useMemo(() => {
    if (mapStatusFilter === 'visited') {
      return displayedItems.filter((p) => Boolean(p.visited) || Boolean(p.alwaysShow));
    }
    if (mapStatusFilter === 'unvisited') {
      return displayedItems.filter((p) => !p.visited || Boolean(p.alwaysShow));
    }
    return displayedItems;
  }, [displayedItems, mapStatusFilter]);

  const firstWithCoords = displayedItems.find((it) => it.lat != null && it.lng != null);
  const fallbackCenter = firstWithCoords
    ? { lat: firstWithCoords.lat, lng: firstWithCoords.lng, name: activeMap?.name || '' }
    : { lat: 11.940419, lng: 108.442254, name: 'Đà Lạt' };

  const googleRouteUrl = buildGoogleMapsRouteUrl(routeStops);

  function handleToggleRouteStop(place) {
    setRouteStopIds((prev) => {
      if (prev.includes(place.id)) {
        return prev.filter((id) => id !== place.id);
      }
      if (prev.length >= 10) return prev;
      return [...prev, place.id];
    });
  }

  function moveRouteStop(index, delta) {
    setRouteStopIds((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleFileImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportMaps) return;
    try {
      const text = await file.text();
      const { importedMapsCount, importedItemsCount } = onImportMaps(text);
      setImportNotice({
        type: 'success',
        text: `Đã nhập ${importedMapsCount} map (${importedItemsCount} địa điểm mới).`,
      });
    } catch (err) {
      setImportNotice({
        type: 'error',
        text: err.message || 'Không thể nhập dữ liệu từ file JSON.',
      });
    }
  }

  function startRename(map) {
    setConfirmDeleteId(null);
    setEditingMapId(map.id);
    setEditingName(map.name);
  }

  function submitRename(mapId) {
    const trimmed = editingName.trim();
    if (trimmed && onRenameMap) {
      onRenameMap(mapId, trimmed);
    }
    setEditingMapId(null);
    setEditingName('');
  }

  const noticeBanner = importNotice && (
    <div
      className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
        importNotice.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}
    >
      <span>{importNotice.text}</span>
      <button
        type="button"
        onClick={() => setImportNotice(null)}
        className="p-0.5 rounded hover:bg-black/5 cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileImport}
        className="hidden"
      />

      {savedMaps.length === 0 ? (
        <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-10 space-y-4">
          {noticeBanner}
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Chưa có map nào được lưu</h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-md">
              Hãy chuyển sang tab <strong>Tìm kiếm</strong>, quét khu vực bạn muốn và bấm nút{' '}
              <strong>Lưu</strong> trên các địa điểm yêu thích để tạo map riêng.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onSwitchToSearch}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Đi tới Tìm kiếm
              </button>
              {onImportMaps && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Nhập file JSON
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Sidebar: Saved Maps List */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Danh sách Map ({savedMaps.length})
                </h2>

                <div className="flex items-center gap-1.5">
                  {onExportMaps && (
                    <button
                      type="button"
                      onClick={onExportMaps}
                      title="Xuất toàn bộ map đã lưu ra file JSON"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      Xuất JSON
                    </button>
                  )}
                  {onImportMaps && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Nhập thêm map từ file JSON"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      Nhập JSON
                    </button>
                  )}
                </div>
              </div>

              {noticeBanner}

              <div className="space-y-2">
                {savedMaps.map((m) => {
                  const isActive = m.id === activeMapId;
                  const isEditing = editingMapId === m.id;
                  const isConfirmingDelete = confirmDeleteId === m.id;
                  const lodgingCount = m.items.filter((i) => i.type === 'lodging').length;
                  const restaurantCount = m.items.filter(
                    (i) => i.type === 'restaurant'
                  ).length;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (isEditing) return;
                        setActiveMapId(m.id);
                        setSelectedPlace(null);
                        setConfirmDeleteId(null);
                      }}
                      className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 border-blue-500 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                submitRename(m.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingMapId(null);
                                setEditingName('');
                              }
                            }}
                            className="flex-1 min-w-0 px-2.5 py-1 text-sm font-semibold rounded-lg border border-blue-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <button
                            type="button"
                            onClick={() => submitRename(m.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                            title="Lưu tên mới"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMapId(null);
                              setEditingName('');
                            }}
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer shrink-0"
                            title="Hủy"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MapIcon
                              className={`w-4 h-4 shrink-0 ${
                                isActive ? 'text-blue-600' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={`font-bold text-sm truncate ${
                                isActive ? 'text-blue-900' : 'text-slate-900'
                              }`}
                            >
                              {m.name}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isConfirmingDelete ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteMap(m.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Xóa?
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                >
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <>
                                {onRenameMap && (
                                  <button
                                    type="button"
                                    onClick={() => startRename(m)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                    title="Đổi tên map"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMapId(null);
                                    setConfirmDeleteId(m.id);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Xóa map này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {m.items.length} điểm
                        </span>
                        {lodgingCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="w-3 h-3 text-indigo-500" />
                            {lodgingCount}
                          </span>
                        )}
                        {restaurantCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Utensils className="w-3 h-3 text-amber-500" />
                            {restaurantCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Right Panel: Relative Map & Saved Items */}
          <section className="lg:col-span-8 xl:col-span-9 space-y-4">
            {activeMap && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                      <span className="truncate">{activeMap.name}</span>
                    </h2>
                    {selectedPlace ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-blue-700">
                        <span>
                          Mốc khoảng cách: <strong>{selectedPlace.name}</strong>
                        </span>
                        {drivingStatus === 'loading' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang tính đường ô tô...
                          </span>
                        )}
                        {drivingStatus === 'ready' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                            <Car className="w-3 h-3" />
                            Đường ô tô
                          </span>
                        )}
                        {drivingStatus === 'fallback' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                            Đường chim bay
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPlace(null)}
                          className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {mapStatusFilter === 'all'
                          ? `Hiển thị ${displayedItems.length}/${items.length} điểm · Nhấp 1 địa điểm để xem khoảng cách ô tô tương đối`
                          : `Đang hiện ${mapPlaces.length}/${displayedItems.length} điểm trên bản đồ · Nhấp 1 địa điểm để xem khoảng cách ô tô tương đối`}
                      </p>
                    )}
                  </div>

                  {/* Filter & Sort Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
                      >
                        <option value="all">Tất cả loại</option>
                        <option value="lodging">Chỉ Nơi ở</option>
                        <option value="restaurant">Chỉ Ăn uống</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-blue-200 text-xs font-bold bg-blue-50 text-blue-800 focus:outline-none"
                      >
                        <option value="default">Thứ tự đã lưu</option>
                        <option value="trust_desc">Điểm uy tín cao nhất</option>
                        <option value="rating_desc">Sao cao nhất</option>
                        <option value="reviews_desc">Nhiều review nhất</option>
                        <option value="distance_selected">Gần điểm đang chọn</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Multi-stop Car Route Planner Bar */}
                {routeStops.length > 0 && (
                  <div className="bg-white rounded-2xl border border-teal-200 bg-teal-50/30 p-3.5 shadow-xs space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-teal-900">
                        <Route className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>Lộ trình ô tô ({routeStops.length}/10 điểm)</span>
                        {routeLoading && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Đang vẽ đường đi...
                          </span>
                        )}
                        {!routeLoading && routeInfo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
                            <Car className="w-3 h-3" />
                            Ô tô {routeInfo.distanceKm} km · ~
                            {formatDurationMin(routeInfo.durationMin)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {googleRouteUrl && (
                          <a
                            href={googleRouteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Chỉ đường Google Maps
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setRouteStopIds([])}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Xóa lộ trình
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {routeStops.map((stop, idx) => (
                        <div
                          key={stop.id}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-xl bg-white border border-teal-200 text-xs text-slate-800 shadow-2xs"
                        >
                          <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-extrabold inline-flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold truncate max-w-[150px]">
                            {stop.name}
                          </span>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveRouteStop(idx, -1)}
                              className="p-0.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                              title="Đưa lên trước"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < routeStops.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveRouteStop(idx, 1)}
                              className="p-0.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                              title="Đưa ra sau"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleRouteStop(stop)}
                            className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Bỏ điểm này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {routeStops.length === 1 && (
                      <p className="text-[11px] text-teal-700">
                        Hãy chọn thêm ít nhất 1 điểm nữa bằng nút <strong>+ Lộ trình</strong> để tạo đường đi ô tô.
                      </p>
                    )}
                  </div>
                )}

                {/* Interactive Relative Positions Map */}
                <div className="h-[440px]">
                  <InteractiveMap
                    center={fallbackCenter}
                    radiusKm={5}
                    places={mapPlaces}
                    selectedPlace={selectedPlace}
                    onSelectPlace={(p) => setSelectedPlace(p)}
                    showSearchCenter={false}
                    routeLine={routeInfo?.geometry || null}
                    routeStopNumbers={routeStopNumbers}
                    mapStatusFilter={mapStatusFilter}
                    onMapStatusFilterChange={setMapStatusFilter}
                    fitKey={activeMap.id}
                  />
                </div>

                {/* Saved Items Grid */}
                {displayedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedItems.map((place) => {
                      const driveInfo = drivingMap[place.id];
                      let distanceBadge = '';
                      if (selectedPlace?.id === place.id) {
                        distanceBadge = 'Điểm mốc';
                      } else if (driveInfo) {
                        const dur = formatDurationMin(driveInfo.durationMin);
                        distanceBadge = {
                          text: dur ? `${driveInfo.distanceKm} km · ${dur}` : `${driveInfo.distanceKm} km`,
                          isDriving: true,
                        };
                      } else if (relativeDistances.has(place.id)) {
                        distanceBadge = `Cách ${relativeDistances.get(place.id)} km`;
                      }

                      return (
                        <PlaceCard
                          key={place.id}
                          place={place}
                          isSelected={selectedPlace?.id === place.id}
                          distanceBadge={distanceBadge}
                          onSelect={(p) => setSelectedPlace(p)}
                          onOpenDetails={onOpenDetails}
                          onRemove={(p) => onRemoveItem(activeMap.id, p.id)}
                          onUpdateNote={
                            onUpdateItemMeta
                              ? (p, note) => onUpdateItemMeta(activeMap.id, p.id, { note })
                              : undefined
                          }
                          onToggleVisited={
                            onUpdateItemMeta
                              ? (p) =>
                                  onUpdateItemMeta(activeMap.id, p.id, {
                                    visited: !p.visited,
                                  })
                              : undefined
                          }
                          onToggleAlwaysShow={
                            onUpdateItemMeta
                              ? (p) =>
                                  onUpdateItemMeta(activeMap.id, p.id, {
                                    alwaysShow: !p.alwaysShow,
                                  })
                              : undefined
                          }
                          routeStopNumber={routeStopNumbers.get(place.id) ?? null}
                          onToggleRouteStop={handleToggleRouteStop}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                    {items.length === 0
                      ? 'Map này chưa có địa điểm nào.'
                      : 'Không có địa điểm nào khớp bộ lọc hiện tại.'}
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      )}
    </>
  );
}
