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
} from 'lucide-react';

export default function PlaceCard({
  place,
  isSelected,
  isSaved = false,
  onSelect,
  onOpenDetails,
  onSave,
  onRemove,
}) {
  const isLodging = place.type === 'lodging';

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
            {isLodging ? <BedDouble className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
            {isLodging ? 'Nơi ở' : 'Ăn uống'}
          </span>
        </div>

        {place.distanceKm !== null && (
          <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-xs font-semibold bg-slate-900/75 text-white backdrop-blur-sm">
            {place.distanceKm} km
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
            <span>{place.reviewCount.toLocaleString('vi-VN')} đánh giá</span>
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
          <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-2 mb-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>{place.address}</span>
          </p>
        )}

        {/* Actions */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(place);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Chi tiết
          </button>

          {onSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSave(place);
              }}
              className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isSaved
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
              title="Lưu vào Map"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-emerald-600' : ''}`} />
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
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            title="Mở trên Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Maps
          </a>
        </div>
      </div>
    </div>
  );
}
