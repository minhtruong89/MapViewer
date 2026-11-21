import {
  IceCreamCone,
  Croissant,
  Coffee,
  CupSoda,
  Wine,
  Flame,
  Fish,
  Soup,
  Pizza,
  Salad,
  Sandwich,
  UtensilsCrossed,
  ChefHat,
  Flower2,
  Trees,
  Tent,
  Castle,
  Home,
  Hotel,
  Camera,
  ShoppingBag,
  Store,
  BedDouble,
  Tag,
} from 'lucide-react';

const CATEGORY_RULES = [
  {
    key: 'bakery',
    legendLabel: 'Tiệm bánh',
    pattern: /(bánh kem|tiệm bánh|bánh ngọt|bánh mì|bakery|pastry|donut|waffle|crepe|(?<!\p{L})bánh(?!\p{L}))/iu,
    Icon: Croissant,
    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-300/80',
    iconClass: 'text-yellow-600',
    pinColor: '#ca8a04',
  },
  {
    key: 'ice_cream',
    legendLabel: 'Kem & Chè',
    pattern: /(cửa hàng kem|quán kem|tiệm kem|(?<!\p{L})kem(?!\p{L})|gelato|ice\s*cream|sữa chua|yogurt|(?<!\p{L})chè(?!\p{L})|tráng miệng|dessert)/iu,
    Icon: IceCreamCone,
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200/80',
    iconClass: 'text-pink-500',
    pinColor: '#db2777',
  },
  {
    key: 'coffee',
    legendLabel: 'Cà phê',
    pattern: /(cà phê|cafe|coffee|espresso|roastery)/iu,
    Icon: Coffee,
    badgeClass: 'bg-amber-100/70 text-amber-900 border-amber-300/80',
    iconClass: 'text-amber-700',
    pinColor: '#92400e',
  },
  {
    key: 'beverage',
    legendLabel: 'Đồ uống',
    pattern: /(trà sữa|quán trà|tiệm trà|trà đạo|sinh tố|nước ép|giải khát|đồ uống|bubble tea|(?<!\p{L})trà(?!\p{L})|tea|juice|smoothie)/iu,
    Icon: CupSoda,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80',
    iconClass: 'text-teal-500',
    pinColor: '#0d9488',
  },
  {
    key: 'bar',
    legendLabel: 'Bar / Pub',
    pattern: /(?<!\p{L})(bar|pub|bia|beer|rượu|wine|cocktail|lounge|club|nhậu)(?!\p{L})/iu,
    Icon: Wine,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
    iconClass: 'text-purple-500',
    pinColor: '#7e22ce',
  },
  {
    key: 'hotpot_bbq',
    legendLabel: 'Lẩu & Nướng',
    pattern: /(lẩu|nướng|bbq|grill|hot\s*pot|buffet)/iu,
    Icon: Flame,
    badgeClass: 'bg-red-50 text-red-700 border-red-200/80',
    iconClass: 'text-red-500',
    pinColor: '#dc2626',
  },
  {
    key: 'seafood',
    legendLabel: 'Hải sản',
    pattern: /(hải sản|seafood|(?<!\p{L})(cá|ốc)(?!\p{L})|sushi|sashimi|nhật bản|japanese)/iu,
    Icon: Fish,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
    iconClass: 'text-blue-500',
    pinColor: '#2563eb',
  },
  {
    key: 'noodle_soup',
    legendLabel: 'Phở / Bún / Mì',
    pattern: /(phở|bún|(?<!\p{L})(mì|mỳ)(?!\p{L})|hủ tiếu|bánh canh|cháo|miến|ramen|noodle|soup|súp)/iu,
    Icon: Soup,
    badgeClass: 'bg-orange-100/60 text-orange-900 border-orange-300/80',
    iconClass: 'text-orange-600',
    pinColor: '#c2410c',
  },
  {
    key: 'pizza',
    legendLabel: 'Pizza',
    pattern: /(pizza|pizzeria|pasta|italian|nhà hàng ý)/iu,
    Icon: Pizza,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    iconClass: 'text-rose-500',
    pinColor: '#e11d48',
  },
  {
    key: 'healthy_veg',
    legendLabel: 'Đồ chay',
    pattern: /(chay|vegetarian|vegan|salad|healthy|thực dưỡng)/iu,
    Icon: Salad,
    badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80',
    iconClass: 'text-lime-600',
    pinColor: '#65a30d',
  },
  {
    key: 'fast_food',
    legendLabel: 'Ăn nhanh',
    pattern: /(ăn nhanh|fast\s*food|burger|gà rán|sandwich|ăn vặt|snack|xôi|cơm tấm|cơm bình dân)/iu,
    Icon: Sandwich,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconClass: 'text-amber-500',
    pinColor: '#d97706',
  },
  {
    key: 'eatery',
    legendLabel: 'Quán ăn',
    pattern: /(quán ăn nhỏ|quán ăn|tiệm ăn|tiệm gà|ăn uống|món ăn|bistro|eatery|diner|canteen|căn tin|quán cơm)/iu,
    Icon: UtensilsCrossed,
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
    iconClass: 'text-orange-500',
    pinColor: '#ea580c',
  },
  {
    key: 'restaurant',
    legendLabel: 'Nhà hàng',
    pattern: /(nhà hàng|restaurant|ẩm thực|steak|bít tết)/iu,
    Icon: ChefHat,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80',
    iconClass: 'text-rose-600',
    pinColor: '#be123c',
  },
  {
    key: 'camping',
    legendLabel: 'Cắm trại',
    pattern: /(cắm trại|camp|glamping|lều)/iu,
    Icon: Tent,
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80',
    iconClass: 'text-teal-600',
    pinColor: '#0f766e',
  },
  {
    key: 'resort',
    legendLabel: 'Resort / Villa',
    pattern: /(resort|nghỉ dưỡng|villa|biệt thự|bungalow)/iu,
    Icon: Castle,
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
    iconClass: 'text-purple-600',
    pinColor: '#6b21a8',
  },
  {
    key: 'homestay',
    legendLabel: 'Homestay',
    pattern: /(homestay|home\s*stay|nhà nghỉ|hostel|nhà khách|guest\s*house|motel|nhà trọ|lưu trú)/iu,
    Icon: Home,
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80',
    iconClass: 'text-violet-600',
    pinColor: '#7c3aed',
  },
  {
    key: 'hotel',
    legendLabel: 'Khách sạn',
    pattern: /(khách sạn|hotel|căn hộ|apartment|condotel)/iu,
    Icon: Hotel,
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    iconClass: 'text-indigo-600',
    pinColor: '#4338ca',
  },
  {
    key: 'garden',
    legendLabel: 'Vườn / Farm',
    pattern: /(vườn dâu|vườn hồng|atiso|vườn|garden|nông trại|trang trại|farm|(?<!\p{L})hoa(?!\p{L})|flower|dâu tây|botanical)/iu,
    Icon: Flower2,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconClass: 'text-emerald-600',
    pinColor: '#059669',
  },
  {
    key: 'nature_park',
    legendLabel: 'Thiên nhiên',
    pattern: /(công viên|park|rừng|đồi|núi|thác|(?<!\p{L})hồ(?!\p{L})|suối|thung lũng|sinh thái|nature)/iu,
    Icon: Trees,
    badgeClass: 'bg-green-50 text-green-800 border-green-200/80',
    iconClass: 'text-green-600',
    pinColor: '#15803d',
  },
  {
    key: 'attraction',
    legendLabel: 'Tham quan',
    pattern: /(điểm thu hút|quảng trường|khu du lịch|danh lam|tham quan|du lịch|check[\s-]?in|bảo tàng|museum|di tích|chùa|nhà thờ|landmark|attraction|đài quan sát)/iu,
    Icon: Camera,
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80',
    iconClass: 'text-fuchsia-500',
    pinColor: '#c026d3',
  },
  {
    key: 'market_shop',
    legendLabel: 'Chợ / Đặc sản',
    pattern: /(chợ|market|siêu thị|supermarket|trung tâm thương mại|mall|đặc sản|lưu niệm|souvenir)/iu,
    Icon: ShoppingBag,
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
    iconClass: 'text-sky-600',
    pinColor: '#0284c7',
  },
  {
    key: 'store',
    legendLabel: 'Cửa hàng',
    pattern: /(cửa hàng|cửa tiệm|(?<!\p{L})tiệm(?!\p{L})|shop|store|boutique|tạp hóa)/iu,
    Icon: Store,
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    iconClass: 'text-cyan-600',
    pinColor: '#0891b2',
  },
];

const FALLBACK_PALETTES = [
  {
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80',
    iconClass: 'text-sky-600',
    pinColor: '#0284c7',
  },
  {
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200/80',
    iconClass: 'text-violet-600',
    pinColor: '#7c3aed',
  },
  {
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    iconClass: 'text-emerald-600',
    pinColor: '#059669',
  },
  {
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    iconClass: 'text-rose-600',
    pinColor: '#e11d48',
  },
  {
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    iconClass: 'text-cyan-600',
    pinColor: '#0891b2',
  },
  {
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80',
    iconClass: 'text-fuchsia-600',
    pinColor: '#c026d3',
  },
  {
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    iconClass: 'text-amber-600',
    pinColor: '#d97706',
  },
  {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
    iconClass: 'text-slate-600',
    pinColor: '#475569',
  },
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function matchCategoryRule(text) {
  if (!text) return null;
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) {
      return rule;
    }
  }
  return null;
}

const LODGING_KEYS = new Set([
  'hotel',
  'homestay',
  'resort',
  'camping',
  'fallback_lodging',
]);

const STATUS_EXTRACT_RE =
  /(Đang mở cửa|Đã đóng cửa|Tạm thời đóng cửa|Đóng cửa vĩnh viễn|Sắp đóng cửa|Sắp mở cửa|Mở cửa cả ngày|Mở cửa 24 giờ|Open 24 hours|Open now|Temporarily closed|Permanently closed|Closes soon|Opens soon|Closed)/i;
const STATUS_REMOVE_RE =
  /(Đang mở cửa|Đã đóng cửa|Tạm thời đóng cửa|Đóng cửa vĩnh viễn|Sắp đóng cửa|Sắp mở cửa|Mở cửa cả ngày|Mở cửa 24 giờ|Open 24 hours|Open now|Temporarily closed|Permanently closed|Closes soon|Opens soon|Closed)/gi;
const HOURS_TAIL_REMOVE_RE =
  /(?:\s*[·•⋅\-|]\s*)?(?:Đóng cửa lúc|Mở cửa lúc|Closes|Opens)\s+[^·•⋅|]+/gi;

/**
 * Separates open/closed status text and trailing hour phrases from arbitrary text
 * such as a category label or street address.
 */
export function splitTextAndStatus(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return { text: '', status: '' };
  const match = raw.match(STATUS_EXTRACT_RE);
  const status = match ? match[1] : '';
  const text = raw
    .replace(STATUS_REMOVE_RE, ' · ')
    .replace(HOURS_TAIL_REMOVE_RE, '')
    .replace(/(?:\s*[·•⋅|]\s*)+/g, ' · ')
    .replace(/^(?:\s*[·•⋅\-|]+\s*)+|(?:\s*[·•⋅|]+\s*|\s+-\s*)+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { text, status };
}

/**
 * Separates glued Google Maps open/closed status text from a category label.
 */
export function splitCategoryAndStatus(rawLabel) {
  const { text, status } = splitTextAndStatus(rawLabel);
  return { category: text, status };
}

/**
 * Resolves badge colors for an open/closed place status string.
 */
export function getOpenStatusStyle(status) {
  const label = String(status || '').trim();
  if (!label) return null;
  const lower = label.toLowerCase();

  if (/(sắp đóng|sắp mở|closes soon|opens soon)/i.test(lower)) {
    return {
      label,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dotClass: 'bg-amber-500',
    };
  }
  if (/(đã đóng|tạm thời đóng|vĩnh viễn|closed)/i.test(lower)) {
    return {
      label,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dotClass: 'bg-rose-500',
    };
  }
  return {
    label,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dotClass: 'bg-emerald-500',
  };
}

/**
 * Resolves a distinct icon, badge palette, and map pin group/color for a place's category.
 */
export function getCategoryStyle(categoryLabel, type = 'restaurant', placeName = '') {
  const { category: cleanLabel, status: extractedStatus } = splitCategoryAndStatus(categoryLabel);
  const rawLabel = cleanLabel;
  const normalized = rawLabel.toLowerCase();
  const isGenericLabel = !rawLabel || normalized === 'nơi ở' || normalized === 'ăn uống';
  const displayLabel = rawLabel || (type === 'lodging' ? 'Nơi ở' : 'Ăn uống');

  let matchedRule = !isGenericLabel ? matchCategoryRule(rawLabel) : null;
  if (!matchedRule && placeName) {
    matchedRule = matchCategoryRule(String(placeName).trim());
  }

  if (matchedRule) {
    return {
      label: displayLabel,
      legendLabel: matchedRule.legendLabel,
      openStatus: extractedStatus,
      Icon: matchedRule.Icon,
      badgeClass: matchedRule.badgeClass,
      iconClass: matchedRule.iconClass,
      pinColor: matchedRule.pinColor,
      key: matchedRule.key,
      isLodgingGroup: type === 'lodging' || LODGING_KEYS.has(matchedRule.key),
    };
  }

  if (isGenericLabel) {
    const isLodging = normalized === 'nơi ở' || (!rawLabel && type === 'lodging');
    if (isLodging) {
      return {
        label: displayLabel,
        legendLabel: 'Nơi ở',
        openStatus: extractedStatus,
        Icon: BedDouble,
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        iconClass: 'text-indigo-500',
        pinColor: '#4338ca',
        key: 'fallback_lodging',
        isLodgingGroup: true,
      };
    }
    return {
      label: displayLabel,
      legendLabel: 'Quán ăn',
      openStatus: extractedStatus,
      Icon: UtensilsCrossed,
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/80',
      iconClass: 'text-orange-500',
      pinColor: '#ea580c',
      key: 'eatery',
      isLodgingGroup: false,
    };
  }

  const palette = FALLBACK_PALETTES[hashString(normalized) % FALLBACK_PALETTES.length];
  return {
    label: displayLabel,
    legendLabel: rawLabel,
    openStatus: extractedStatus,
    Icon: Tag,
    badgeClass: palette.badgeClass,
    iconClass: palette.iconClass,
    pinColor: palette.pinColor,
    key: 'fallback_hash',
    isLodgingGroup: type === 'lodging',
  };
}

const ALLOWED_SVG_TAGS = new Set([
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
]);
const ICON_BODY_CACHE = new WeakMap();

function escapeAttr(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Serializes a Lucide icon component into an inline SVG markup string for Leaflet divIcons.
 */
export function lucideIconToSvg(Icon, size = 12) {
  if (!Icon) return '';
  let body = ICON_BODY_CACHE.get(Icon);

  if (body === undefined) {
    body = '';
    try {
      const rendered =
        typeof Icon.render === 'function'
          ? Icon.render({}, null)
          : typeof Icon === 'function'
            ? Icon({})
            : null;
      const iconNode = rendered?.props?.iconNode;
      if (Array.isArray(iconNode)) {
        body = iconNode
          .filter(([tag]) => ALLOWED_SVG_TAGS.has(tag))
          .map(([tag, attrs = {}]) => {
            const attrStr = Object.entries(attrs)
              .filter(([k]) => k !== 'key' && /^[a-zA-Z][\w:-]*$/.test(k))
              .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
              .join(' ');
            return `<${tag}${attrStr ? ` ${attrStr}` : ''}/>`;
          })
          .join('');
      }
    } catch {
      body = '';
    }
    ICON_BODY_CACHE.set(Icon, body);
  }

  if (!body) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;display:block;">${body}</svg>`;
}
