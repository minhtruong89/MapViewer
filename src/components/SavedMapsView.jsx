import { useEffect, useState } from 'react';
import { Map as MapIcon, Trash2, MapPin, BedDouble, Utensils, Bookmark } from 'lucide-react';
import InteractiveMap from './InteractiveMap';
import PlaceCard from './PlaceCard';

export default function SavedMapsView({
  savedMaps,
  onDeleteMap,
  onRemoveItem,
  onOpenDetails,
  onSwitchToSearch,
}) {
  const [activeMapId, setActiveMapId] = useState(savedMaps[0]?.id || null);
  const [selectedPlace, setSelectedPlace] = useState(null);

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
  const firstWithCoords = items.find((it) => it.lat != null && it.lng != null);
  const fallbackCenter = firstWithCoords
    ? { lat: firstWithCoords.lat, lng: firstWithCoords.lng, name: activeMap?.name || '' }
    : { lat: 11.940419, lng: 108.442254, name: 'Đà Lạt' };

  if (savedMaps.length === 0) {
    return (
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Chưa có map nào được lưu</h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-md">
            Hãy chuyển sang tab <strong>Tìm kiếm</strong>, quét khu vực bạn muốn và bấm nút{' '}
            <strong>Lưu</strong> trên các địa điểm yêu thích để tạo map riêng.
          </p>
          <button
            type="button"
            onClick={onSwitchToSearch}
            className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            Đi tới Tìm kiếm
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Sidebar: Saved Maps List */}
      <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Danh sách Map đã lưu ({savedMaps.length})
          </h2>

          <div className="space-y-2">
            {savedMaps.map((m) => {
              const isActive = m.id === activeMapId;
              const lodgingCount = m.items.filter((i) => i.type === 'lodging').length;
              const restaurantCount = m.items.filter((i) => i.type === 'restaurant').length;

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setActiveMapId(m.id);
                    setSelectedPlace(null);
                  }}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
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

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMap(m.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa map này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{m.items.length} điểm</span>
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
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  {activeMap.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hiển thị tương quan vị trí của {items.length} địa điểm đã lưu trên bản đồ
                </p>
              </div>
            </div>

            {/* Interactive Relative Positions Map */}
            <div className="h-[440px]">
              <InteractiveMap
                center={fallbackCenter}
                radiusKm={5}
                places={items}
                selectedPlace={selectedPlace}
                onSelectPlace={(p) => setSelectedPlace(p)}
                showSearchCenter={false}
              />
            </div>

            {/* Saved Items Grid */}
            {items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    isSelected={selectedPlace?.id === place.id}
                    onSelect={(p) => setSelectedPlace(p)}
                    onOpenDetails={onOpenDetails}
                    onRemove={(p) => onRemoveItem(activeMap.id, p.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                Map này chưa có địa điểm nào.
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
