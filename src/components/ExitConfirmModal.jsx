import { useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';

/**
 * Confirmation dialog shown when pressing Back on the home screen to prevent accidental exits.
 */
export default function ExitConfirmModal({
  isOpen,
  showFallbackHint = false,
  onStay,
  onConfirmExit,
}) {
  const onStayRef = useRef(onStay);

  useEffect(() => {
    onStayRef.current = onStay;
  }, [onStay]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onStayRef.current?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onStay}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <LogOut className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h2 id="exit-confirm-title" className="text-lg font-extrabold text-slate-900">
            Thoát khỏi ứng dụng?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Bạn đang ở trang chủ. Bạn có muốn thoát MapAnalyzer và rời khỏi trang này không?
          </p>
          <p className="text-xs text-slate-400">
            Bấm nút Quay lại (Back) thêm 1 lần nữa để thoát ngay.
          </p>
        </div>

        {showFallbackHint && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-left leading-relaxed">
            Trình duyệt không cho phép tự đóng tab gốc. Hãy bấm nút Quay lại (Back) trên điện
            thoại thêm 1 lần nữa hoặc đóng tab để thoát.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onStay}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Ở lại
          </button>
          <button
            type="button"
            onClick={onConfirmExit}
            className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
          >
            Thoát
          </button>
        </div>
      </div>
    </div>
  );
}
