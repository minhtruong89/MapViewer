import { getCategoryStyle, getOpenStatusStyle } from '../utils/categoryStyle';

export default function CategoryBadge({
  label,
  type = 'restaurant',
  placeName = '',
  openStatus = '',
  className = '',
}) {
  const style = getCategoryStyle(label, type, placeName);
  const { label: resolvedLabel, Icon, badgeClass, iconClass } = style;
  const statusStyle = getOpenStatusStyle(openStatus || style.openStatus);

  return (
    <>
      <span
        title={resolvedLabel}
        className={`inline-flex items-center gap-1.5 max-w-full px-2.5 py-0.5 rounded-lg border text-xs font-semibold ${badgeClass} ${className}`}
      >
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClass}`} />
        <span className="truncate">{resolvedLabel}</span>
      </span>

      {statusStyle && (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${statusStyle.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dotClass}`} />
          {statusStyle.label}
        </span>
      )}
    </>
  );
}
