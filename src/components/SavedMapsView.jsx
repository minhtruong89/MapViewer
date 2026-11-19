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
} from 'lucide-react';
import InteractiveMap from './InteractiveMap';
import PlaceCard from './PlaceCard';
import { calculateDistanceKm } from '../utils/geo';

export default function SavedMapsView({
  savedMaps,
  onDeleteMap,
  onRenameMap,
  onRemoveItem,
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
  const [importNotice, setImportNotice] = useState(null);
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
    if (selectedPlace && !items.some((it) => it.id === selectedPlace.id)) {
      setSelectedPlace(null);
    }
  }, [items, selectedPlace]);

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
            a.id === selectedPlace.id ? -1 : (relativeDistances.get(a.id) ?? 9999);
          const db =
            b.id === selectedPlace.id ? -1 : (relativeDistances.get(b.id) ?? 9999);
          return da - db;
        }
        default:
          return 0;
      }
    });
  }, [items, filterType, sortBy, selectedPlace, relativeDistances]);

  const firstWithCoords = displayedItems.find((it) => it.lat != null && it.lng != null);
  const fallbackCenter = firstWithCoords
    ? { lat: firstWithCoords.lat, lng: firstWithCoords.lng, name: activeMap?.name || '' }
    : { lat: 11.940419, lng: 108.442254, name: 'Đà Lạt' };

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
                        Hiển thị {displayedItems.length}/{items.length} điểm · Nhấp 1 địa điểm để xem khoảng cách tương đối
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
                        <option value="rating_desc">Sao cao nhất</option>
                        <option value="reviews_desc">Nhiều review nhất</option>
                        <option value="distance_selected">Gần điểm đang chọn</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Interactive Relative Positions Map */}
                <div className="h-[440px]">
                  <InteractiveMap
                    center={fallbackCenter}
                    radiusKm={5}
                    places={displayedItems}
                    selectedPlace={selectedPlace}
                    onSelectPlace={(p) => setSelectedPlace(p)}
                    showSearchCenter={false}
                  />
                </div>

                {/* Saved Items Grid */}
                {displayedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayedItems.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={place}
                        isSelected={selectedPlace?.id === place.id}
                        distanceBadge={
                          selectedPlace?.id === place.id
                            ? 'Điểm mốc'
                            : relativeDistances.has(place.id)
                              ? `Cách ${relativeDistances.get(place.id)} km`
                              : ''
                        }
                        onSelect={(p) => setSelectedPlace(p)}
                        onOpenDetails={onOpenDetails}
                        onRemove={(p) => onRemoveItem(activeMap.id, p.id)}
                      />
                    ))}
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
