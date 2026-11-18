import { useState } from 'react';
import { X, Bookmark, Plus, Check, Map as MapIcon } from 'lucide-react';

export default function SaveToMapModal({
  place,
  savedMaps,
  onToggleMap,
  onCreateAndSave,
  onClose,
}) {
  const [newMapName, setNewMapName] = useState('');

  if (!place) return null;

  function handleCreate(e) {
    e.preventDefault();
    const trimmed = newMapName.trim();
    if (!trimmed) return;
    onCreateAndSave(trimmed, place);
    setNewMapName('');
  }

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Lưu vào Map</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Place Summary */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-sm font-bold text-slate-900 line-clamp-1">{place.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {place.categoryLabel} · {place.rating ? `${place.rating.toFixed(1)} ★` : 'N/A'}
            </p>
          </div>

          {/* Existing Maps (Tick / Untick) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Chọn map (bấm lại để bỏ lưu)
            </label>
            {savedMaps.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Chưa có map nào được lưu. Hãy tạo map mới bên dưới.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {savedMaps.map((m) => {
                  const alreadyIn = m.items.some((it) => it.id === place.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onToggleMap(m.id, place)}
                      className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        alreadyIn
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70'
                          : 'bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            alreadyIn
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {alreadyIn && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <MapIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-sm font-semibold truncate">{m.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">
                        {alreadyIn ? 'Đã lưu' : `${m.items.length} điểm`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Map */}
          <form onSubmit={handleCreate} className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Hoặc tạo map mới
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="vd: Đà Lạt ăn ngon, Quán quanh nhà..."
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!newMapName.trim()}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                Tạo & Lưu
              </button>
            </div>
          </form>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
