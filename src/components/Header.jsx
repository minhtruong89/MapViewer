import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Search,
  Map as MapIcon,
  MapPin,
  Loader2,
  UserCheck,
} from 'lucide-react';

export default function Header({
  activeView,
  onChangeView,
  savedMapsCount,
  onSelectCenter,
  onError,
  supportsGuiLogin,
  hasProfile,
  loginLoading,
  onOpenLogin,
  loginNotice,
  onDismissLoginNotice,
}) {
  const [locationInput, setLocationInput] = useState('');
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoEmpty, setGeoEmpty] = useState(false);
  const geoBoxRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (geoBoxRef.current && !geoBoxRef.current.contains(e.target)) {
        setGeoSuggestions([]);
        setGeoEmpty(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setGeoSuggestions([]);
        setGeoEmpty(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleGeocode(e) {
    e.preventDefault();
    const q = locationInput.trim();
    if (!q) return;

    setGeoLoading(true);
    setGeoSuggestions([]);
    setGeoEmpty(false);
    if (onError) onError('');

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tìm thấy địa điểm.');

      const list = data.suggestions || [];
      if (list.length === 0) {
        setGeoEmpty(true);
      } else if (list.length === 1) {
        const first = list[0];
        onSelectCenter({ name: first.shortName, lat: first.lat, lng: first.lng });
        setLocationInput(first.shortName);
      } else {
        setGeoSuggestions(list);
      }
    } catch (err) {
      if (onError) onError(err.message);
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <header className="sm:sticky sm:top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
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
            onClick={() => onChangeView('search')}
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
            onClick={() => onChangeView('saved')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'saved'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Xem map
            {savedMapsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                {savedMapsCount}
              </span>
            )}
          </button>
        </div>

        {/* Area Geocode Search (Search mode only) */}
        {activeView === 'search' && (
          <div
            ref={geoBoxRef}
            className="relative w-full md:w-auto md:flex-1 md:max-w-md order-3 md:order-none"
          >
            <form onSubmit={handleGeocode} className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    if (geoEmpty) setGeoEmpty(false);
                  }}
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
                      onSelectCenter({
                        name: item.shortName,
                        lat: item.lat,
                        lng: item.lng,
                      });
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

            {geoEmpty && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 px-4 py-3 text-xs text-slate-500 z-50">
                Không tìm thấy địa điểm nào khớp với từ khóa.
              </div>
            )}
          </div>
        )}

        {supportsGuiLogin && (
          <button
            type="button"
            onClick={onOpenLogin}
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
        )}
      </div>

      {loginNotice && (
        <div className="bg-emerald-50 border-t border-emerald-200 px-4 sm:px-6 py-2 text-xs text-emerald-800 flex items-center justify-between gap-3">
          <span>{loginNotice}</span>
          <button
            type="button"
            onClick={onDismissLoginNotice}
            className="font-bold hover:underline cursor-pointer shrink-0"
          >
            Đã hiểu
          </button>
        </div>
      )}
    </header>
  );
}
