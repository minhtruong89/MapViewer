import {
  MapPin,
  Search,
  Layers,
  BedDouble,
  Utensils,
  Loader2,
  X,
  LocateFixed,
  History,
  Trash2,
} from 'lucide-react';
import InteractiveMap from './InteractiveMap';

const CATEGORY_LABELS = {
  all: 'Tất cả',
  lodging: 'Nơi ở',
  restaurant: 'Ăn uống',
};

function formatHistoryTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} ${dd}/${mo}`;
  } catch {
    return '';
  }
}

export default function SearchSidebar({
  center,
  presetCenters,
  onSelectCenter,
  onRemovePresetCenter,
  onMapCenterChange,
  gpsLoading = false,
  gpsError = '',
  onLocateMe,
  radiusKm,
  onRadiusChange,
  category,
  onCategoryChange,
  customQuery,
  onCustomQueryChange,
  maxResults,
  onMaxResultsChange,
  loading,
  onSearch,
  places,
  selectedPlace,
  onSelectPlace,
  searchHistory = [],
  activeHistoryId = null,
  onRestoreHistory,
  onRemoveHistory,
  onClearHistory,
}) {
  return (
    <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
        {/* Selected Center */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Điểm trung tâm
            </label>
            {onLocateMe && (
              <button
                type="button"
                onClick={onLocateMe}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                title="Dùng GPS thiết bị đặt vị trí hiện tại làm tâm"
              >
                {gpsLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LocateFixed className="w-3 h-3" />
                )}
                Vị trí của tôi
              </button>
            )}
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/70">
            <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{center.name}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {center.lat.toFixed(5)}, {center.lng.toFixed(5)} · Nhấp bản đồ để đổi
            </div>
          </div>

          {gpsError && (
            <p className="text-[11px] text-rose-600 mt-1.5 leading-snug">{gpsError}</p>
          )}

          {/* Quick Presets (with remove button) */}
          {presetCenters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {presetCenters.map((preset) => {
                const isActive = center.name === preset.name;
                return (
                  <div
                    key={preset.name}
                    className={`inline-flex items-center rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectCenter(preset)}
                      className="pl-2.5 pr-1.5 py-1 cursor-pointer truncate max-w-[170px]"
                      title={preset.name}
                    >
                      {preset.name.split(',')[0]}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePresetCenter(preset.name);
                      }}
                      className={`pr-1.5 pl-0.5 py-1 rounded-r-lg transition-colors cursor-pointer ${
                        isActive
                          ? 'text-slate-300 hover:text-white'
                          : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title="Xóa điểm trung tâm này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Radius */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Bán kính tỏa ra
            </label>
            <span className="text-sm font-extrabold text-blue-600">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="30"
            step="0.5"
            value={radiusKm}
            onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between gap-1 mt-2">
            {[1, 3, 5, 10, 20, 30].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRadiusChange(r)}
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
                  onClick={() => onCategoryChange(item.id)}
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
              onChange={(e) => onCustomQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                  onSearch();
                }
              }}
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
              onChange={(e) => onMaxResultsChange(Number(e.target.value))}
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
          onClick={onSearch}
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

      {/* Recent Search History */}
      {searchHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Lịch sử gần đây ({searchHistory.length})
            </h3>
            {onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
                title="Xóa toàn bộ lịch sử quét"
              >
                <Trash2 className="w-3 h-3" />
                Xóa hết
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
            {searchHistory.map((entry) => {
              const isActive = entry.id === activeHistoryId;
              const catLabel = CATEGORY_LABELS[entry.category] || 'Tất cả';
              return (
                <div
                  key={entry.id}
                  onClick={() => onRestoreHistory?.(entry)}
                  className={`group flex items-start justify-between gap-2 p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border-blue-400'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {entry.center.name}
                      </span>
                      {entry.customQuery && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold truncate max-w-[90px]">
                          {entry.customQuery}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {entry.radiusKm}km · {catLabel} · {entry.places.length} điểm ·{' '}
                      {formatHistoryTime(entry.timestamp)}
                    </p>
                  </div>
                  {onRemoveHistory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveHistory(entry.id);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                      title="Xóa mục này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Map on Sidebar (or Mobile) */}
      <div className="h-[340px] lg:h-[380px]">
        <InteractiveMap
          center={center}
          radiusKm={radiusKm}
          places={places}
          selectedPlace={selectedPlace}
          onCenterChange={onMapCenterChange}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </aside>
  );
}
