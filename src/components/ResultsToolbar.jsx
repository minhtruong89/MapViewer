import { Star, SlidersHorizontal, ArrowUpDown, Loader2 } from 'lucide-react';

export default function ResultsToolbar({
  stats,
  radiusKm,
  centerName,
  filterType,
  onFilterTypeChange,
  minRating,
  onMinRatingChange,
  minReviews,
  onMinReviewsChange,
  keywordFilter,
  onKeywordFilterChange,
  sortBy,
  onSortByChange,
  bgProgress,
}) {
  return (
    <>
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
          <p className="text-sm font-bold text-slate-900 mt-1.5 truncate">{centerName}</p>
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
          onChange={(e) => onFilterTypeChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none"
        >
          <option value="all">Tất cả loại</option>
          <option value="lodging">Chỉ Nơi ở</option>
          <option value="restaurant">Chỉ Ăn uống</option>
        </select>

        {/* Min rating */}
        <select
          value={minRating}
          onChange={(e) => onMinRatingChange(Number(e.target.value))}
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
          onChange={(e) => onMinReviewsChange(Number(e.target.value))}
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
          onChange={(e) => onKeywordFilterChange(e.target.value)}
          placeholder="Lọc tên / đường..."
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none flex-1 min-w-[140px]"
        />

        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
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

      {bgProgress && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-200/70 text-xs text-blue-800">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
          <span>
            Đang tải ngầm ảnh đại diện cho các thẻ còn thiếu:{' '}
            <strong>
              {bgProgress.done}/{bgProgress.total}
            </strong>
          </span>
        </div>
      )}
    </>
  );
}
