import { useEffect, useRef, useState } from 'react';
import {
  X,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  ExternalLink,
  Loader2,
  ImageOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function PlaceModal({ place, onClose, onEnriched }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  const onCloseRef = useRef(onClose);
  const onEnrichedRef = useRef(onEnriched);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onEnrichedRef.current = onEnriched;
  }, [onEnriched]);

  const photos =
    details?.photos && details.photos.length > 0
      ? details.photos
      : place?.imageUrl
        ? [place.imageUrl]
        : [];

  useEffect(() => {
    if (!place?.mapsUrl) {
      setLoading(false);
      return;
    }
    setDetails(null);
    setError('');
    setActiveIdx(0);
    setLoading(true);

    const controller = new AbortController();
    fetch(`/api/place-details?url=${encodeURIComponent(place.mapsUrl)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Không thể tải chi tiết.');
        return data;
      })
      .then((data) => {
        setDetails(data);
        onEnrichedRef.current?.(place.id, data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [place?.id, place?.mapsUrl]);

  useEffect(() => {
    if (!place) return;
    const photoCount = photos.length;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
      } else if (e.key === 'ArrowLeft' && photoCount > 1) {
        setActiveIdx((i) => (i - 1 + photoCount) % photoCount);
      } else if (e.key === 'ArrowRight' && photoCount > 1) {
        setActiveIdx((i) => (i + 1) % photoCount);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [place, photos.length]);

  if (!place) return null;

  const currentPhoto = photos[activeIdx] || null;
  const displayPhone = details?.phone || place.phone;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  place.type === 'lodging'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {place.type === 'lodging' ? 'Nơi ở' : 'Ăn uống'}
              </span>
              {place.distanceKm !== null && (
                <span className="text-xs text-slate-500 font-medium">
                  Cách tâm {place.distanceKm} km
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{place.name}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* Gallery */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-100 aspect-[16/9]">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={place.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageOff className="w-10 h-10 opacity-50" />
                <span className="text-sm">Không có hình ảnh</span>
              </div>
            )}

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIdx((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIdx((i) => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                  {activeIdx + 1} / {photos.length}
                </div>
              </>
            )}

            {loading && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-slate-700 text-xs font-medium shadow">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Đang tải thêm ảnh từ Google Maps...
              </div>
            )}
          </div>

          {/* Thumbnails Strip */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, idx) => (
                <button
                  key={src + idx}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === activeIdx
                      ? 'border-blue-600 scale-105'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Rating Summary */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
              <span className="text-2xl font-extrabold text-slate-900">
                {place.rating ? place.rating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-sm text-slate-500">/ 5.0 sao</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-sm text-slate-700">
              Tổng cộng{' '}
              <strong className="text-slate-900">
                {place.reviewCount.toLocaleString('vi-VN')}
              </strong>{' '}
              lượt đánh giá
            </div>
            {place.priceLevel && (
              <>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-sm font-semibold text-emerald-700">{place.priceLevel}</div>
              </>
            )}
          </div>

          {/* Extra Metadata */}
          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-2.5 text-sm text-slate-700">
            {(details?.address || place.address) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{details?.address || place.address}</span>
              </div>
            )}
            {details?.hours && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{details.hours}</span>
              </div>
            )}
            {displayPhone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={`tel:${displayPhone.replace(/\s+/g, '')}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {displayPhone}
                </a>
              </div>
            )}
            {details?.website && (
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate"
                >
                  {details.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Mở trên Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
