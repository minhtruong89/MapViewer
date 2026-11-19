import { useState } from 'react';
import {
  Star,
  MapPin,
  ExternalLink,
  Image as ImageIcon,
  BedDouble,
  Utensils,
  MessageSquareText,
  Bookmark,
  Trash2,
  Phone,
  Crosshair,
  Car,
  StickyNote,
  CheckCircle2,
  Route,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import { formatDurationMin } from '../utils/geo';

export default function PlaceCard({
  place,
  isSelected,
  isSaved = false,
  distanceBadge,
  onSelect,
  onOpenDetails,
  onSave,
  onRemove,
  onSetCenter,
  onUpdateNote,
  onToggleVisited,
  routeStopNumber = null,
  onToggleRouteStop,
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const isLodging = place.type === 'lodging';

  let badgeText = null;
  let badgeIsDriving = false;

  if (distanceBadge !== undefined) {
    if (distanceBadge && typeof distanceBadge === 'object') {
      badgeText = distanceBadge.text || null;
      badgeIsDriving = Boolean(distanceBadge.isDriving);
    } else {
      badgeText = distanceBadge || null;
    }
  } else if (place.drivingDistanceKm != null) {
    const dur = place.drivingDurationMin
      ? ` · ${formatDurationMin(place.drivingDurationMin)}`
      : '';
    badgeText = `${place.drivingDistanceKm} km${dur}`;
    badgeIsDriving = true;
  } else if (place.distanceKm != null) {
    badgeText = `${place.distanceKm} km`;
  }

  function startEditingNote(e) {
    e.stopPropagation();
    setNoteDraft(place.note || '');
    setEditingNote(true);
  }

  function saveNote(e) {
    e?.stopPropagation();
    onUpdateNote?.(place, noteDraft.trim());
    setEditingNote(false);
  }

  return (
    <div
      onClick={() => onSelect(place)}
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {place.imageUrl ? (
          <img
            src={place.imageUrl}
            alt={place.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <ImageIcon className="w-8 h-8 opacity-50" />
            <span className="text-xs">Chưa có ảnh đại diện</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm ${
              isLodging
                ? 'bg-indigo-600/90 text-white'
                : 'bg-amber-600/90 text-white'
            }`}
          >
            {isLodging ? (
              <BedDouble className="w-3.5 h-3.5" />
            ) : (
              <Utensils className="w-3.5 h-3.5" />
            )}
            {isLodging ? 'Nơi ở' : 'Ăn uống'}
          </span>

          {place.visited && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm bg-emerald-600/90 text-white">
              <CheckCircle2 className="w-3 h-3" />
              Đã đi
            </span>
          )}
        </div>

        {badgeText && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-slate-900/75 text-white backdrop-blur-sm">
            {badgeIsDriving && <Car className="w-3 h-3 shrink-0" />}
            {badgeText}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
            {place.name}
          </h3>
        </div>

        {/* Rating & Total Reviews */}
        <div className="flex items-center gap-3 mb-2.5">
          <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span className="font-bold text-sm text-slate-900">
              {place.rating ? place.rating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
            <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
            <span>{(place.reviewCount ?? 0).toLocaleString('vi-VN')} đánh giá</span>
          </div>
          {place.priceLevel && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ml-auto">
              {place.priceLevel}
            </span>
          )}
        </div>

        {/* Category & Address */}
        <p className="text-xs font-medium text-slate-500 mb-1 truncate">
          {place.categoryLabel}
        </p>
        {place.address && (
          <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-2 mb-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{place.address}</span>
          </p>
        )}
        {place.phone && (
          <p className="text-xs text-slate-600 flex items-center gap-1 mb-2.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <a
              href={`tel:${place.phone.replace(/\s+/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-blue-600 hover:underline font-medium"
            >
              {place.phone}
            </a>
          </p>
        )}

        {/* Personal Note & Visited Controls (Saved Maps only) */}
        {(onUpdateNote || onToggleVisited) && (
          <div className="mb-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
            {editingNote ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  maxLength={300}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveNote();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setEditingNote(false);
                    }
                  }}
                  placeholder="Ghi chú cá nhân (giá phòng, giờ đi...)"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-amber-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
                <button
                  type="button"
                  onClick={saveNote}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                  title="Lưu ghi chú"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNote(false)}
                  className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer shrink-0"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              place.note && (
                <div className="bg-amber-50 border border-amber-200/80 text-amber-900 rounded-xl px-2.5 py-2 text-xs flex items-start gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="flex-1 break-words leading-relaxed">{place.note}</span>
                  {onUpdateNote && (
                    <button
                      type="button"
                      onClick={startEditingNote}
                      className="p-1 rounded hover:bg-amber-200/60 text-amber-700 cursor-pointer shrink-0"
                      title="Sửa ghi chú"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {onUpdateNote && !place.note && !editingNote && (
                <button
                  type="button"
                  onClick={startEditingNote}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <StickyNote className="w-3 h-3" />
                  Thêm ghi chú
                </button>
              )}

              {onToggleVisited && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisited(place);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    place.visited
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {place.visited ? 'Đã đi' : 'Đánh dấu đã đi'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(place);
            }}
            className="flex-1 min-w-[76px] inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 shrink-0" />
            Chi tiết
          </button>

          {onSetCenter && place.lat != null && place.lng != null && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetCenter(place);
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Đặt địa điểm này làm tâm tìm kiếm"
            >
              <Crosshair className="w-3.5 h-3.5 shrink-0" />
              Đặt tâm
            </button>
          )}

          {onToggleRouteStop && place.lat != null && place.lng != null && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRouteStop(place);
              }}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                routeStopNumber != null
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
              }`}
              title={
                routeStopNumber != null
                  ? 'Bỏ khỏi lộ trình chỉ đường'
                  : 'Thêm vào lộ trình nhiều điểm'
              }
            >
              <Route className="w-3.5 h-3.5 shrink-0" />
              {routeStopNumber != null ? `Chặng #${routeStopNumber}` : '+ Lộ trình'}
            </button>
          )}

          {onSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSave(place);
              }}
              className={`inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
              title="Lưu vào Map"
            >
              <Bookmark
                className={`w-3.5 h-3.5 shrink-0 ${isSaved ? 'fill-emerald-600' : ''}`}
              />
              {isSaved ? 'Đã lưu' : 'Lưu'}
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(place);
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
              title="Xóa khỏi map"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            title="Mở trên Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Maps
          </a>
        </div>
      </div>
    </div>
  );
}
