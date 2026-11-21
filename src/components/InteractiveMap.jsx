import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getCategoryStyle, lucideIconToSvg } from '../utils/categoryStyle';
import { formatCompactReviews } from '../utils/geo';

// Fix default Leaflet marker icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBottomPillHtml(
  pinColor,
  ratingLabel,
  { iconSvg = '', reviewShort = '', isSelected = false, absoluteCenter = true } = {}
) {
  const shadow = isSelected
    ? '0 0 0 3px rgba(37,99,235,0.4), 0 2px 8px rgba(0,0,0,0.32)'
    : '0 2px 8px rgba(0,0,0,0.28)';
  const centerStyle = absoluteCenter
    ? 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);'
    : '';

  if (!iconSvg && !reviewShort) {
    return `<div style="
      ${centerStyle}
      background:${pinColor};
      color:#ffffff;
      width:28px;
      height:28px;
      border-radius:9999px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:700;
      border:2px solid #ffffff;
      box-shadow:${shadow};
    ">${ratingLabel}</div>`;
  }

  const reviewBadgeHtml = reviewShort
    ? `<span style="background:#ffffff;color:${pinColor};font-size:10px;font-weight:800;padding:1px 5px;border-radius:9999px;line-height:1.2;">${escapeHtml(reviewShort)}</span>`
    : '';

  return `<div style="
    ${centerStyle}
    background:${pinColor};
    color:#ffffff;
    height:26px;
    padding:${reviewShort ? '0 4px 0 7px' : '0 7px'};
    border-radius:9999px;
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:4px;
    font-size:11px;
    font-weight:700;
    border:2px solid #ffffff;
    box-shadow:${shadow};
    white-space:nowrap;
  ">${iconSvg}<span>${ratingLabel}</span>${reviewBadgeHtml}</div>`;
}

function createCompactPin(pinColor, iconSvg, ratingLabel, isSelected = false) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position:relative;width:28px;height:26px;">
      ${buildBottomPillHtml(pinColor, ratingLabel, { iconSvg, isSelected })}
    </div>`,
    iconSize: [28, 26],
    iconAnchor: [14, 13],
    popupAnchor: [0, -14],
  });
}

function createSearchExpandedPin(
  pinColor,
  iconSvg,
  ratingLabel,
  reviewShort,
  isSelected = false
) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position:relative;width:28px;height:26px;">
      ${buildBottomPillHtml(pinColor, ratingLabel, {
        iconSvg,
        reviewShort,
        isSelected,
      })}
    </div>`,
    iconSize: [28, 26],
    iconAnchor: [14, 13],
    popupAnchor: [0, -14],
  });
}

function createLabeledPin(
  pinColor,
  iconSvg,
  name,
  rating,
  reviewShort,
  stopNumber = null,
  isSelected = false
) {
  const baseName = name.length > 26 ? name.slice(0, 25) + '…' : name;
  const labelText = stopNumber != null ? `#${stopNumber} · ${baseName}` : baseName;
  const shortName = escapeHtml(labelText);
  const ratingLabel = rating ? rating.toFixed(1) : '?';
  const labelShadow = isSelected
    ? '0 0 0 2px rgba(37,99,235,0.35), 0 2px 8px rgba(0,0,0,0.3)'
    : '0 2px 8px rgba(0,0,0,0.28)';

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="
        position:absolute;
        bottom:32px;
        left:50%;
        transform:translateX(-50%);
        background:${pinColor};
        color:#ffffff;
        padding:3px 9px;
        border-radius:9999px;
        font-size:11px;
        font-weight:700;
        white-space:nowrap;
        border:2px solid #ffffff;
        box-shadow:${labelShadow};
        pointer-events:none;
        display:inline-flex;
        align-items:center;
        gap:4px;
      ">${iconSvg}<span>${shortName}</span></div>
      ${buildBottomPillHtml(pinColor, ratingLabel, { reviewShort, isSelected })}
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function buildMarkerVisual({
  place,
  iconSvg,
  mapPinColor,
  showSearchCenter,
  stopNumber,
  isSelected,
  showReviews,
}) {
  const isHighlighted = isSelected || stopNumber != null;
  const shouldShowReviews = showReviews || isHighlighted;
  const ratingLabel = place.rating ? place.rating.toFixed(1) : '?';
  const effectiveReviewShort = shouldShowReviews
    ? formatCompactReviews(place.reviewCount)
    : '';

  let icon;
  if (showSearchCenter) {
    icon = effectiveReviewShort
      ? createSearchExpandedPin(
          mapPinColor,
          iconSvg,
          ratingLabel,
          effectiveReviewShort,
          isSelected
        )
      : createCompactPin(mapPinColor, iconSvg, ratingLabel, isSelected);
  } else {
    icon = createLabeledPin(
      mapPinColor,
      iconSvg,
      place.name,
      place.rating,
      effectiveReviewShort,
      stopNumber,
      isSelected
    );
  }

  const key = `${shouldShowReviews ? 1 : 0}|${stopNumber ?? ''}|${isSelected ? 1 : 0}`;
  const zIndexOffset = isSelected ? 700 : stopNumber != null ? 500 : 0;

  return { icon, key, zIndexOffset };
}

const CENTER_ICON = L.divIcon({
  className: 'custom-pin',
  html: `<div style="
    background:#e11d48;
    width:18px;
    height:18px;
    border-radius:9999px;
    border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(225,29,72,0.25), 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const MAP_STATUS_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'visited', label: 'Đã đi' },
  { id: 'unvisited', label: 'Chưa đi' },
];

export default function InteractiveMap({
  center,
  radiusKm,
  places,
  selectedPlace,
  onCenterChange,
  onSelectPlace,
  showSearchCenter = true,
  routeLine = null,
  routeStopNumbers = null,
  mapStatusFilter = null,
  onMapStatusFilterChange = null,
  fitKey = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const circleRef = useRef(null);
  const placesLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const onCenterChangeRef = useRef(onCenterChange);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const lastFittedCoordsKeyRef = useRef('');
  const markersByIdRef = useRef(new Map());

  const [zoomLevel, setZoomLevel] = useState(14);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = center ? [center.lat, center.lng] : [11.940419, 108.442254];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    placesLayerRef.current = L.layerGroup().addTo(map);

    setZoomLevel(map.getZoom());
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    map.on('click', (e) => {
      if (onCenterChangeRef.current) {
        onCenterChangeRef.current({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
          name: `Tọa độ (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      centerMarkerRef.current = null;
      circleRef.current = null;
      placesLayerRef.current = null;
      routeLayerRef.current = null;
      lastFittedCoordsKeyRef.current = '';
      markersByIdRef.current.clear();
    };
  }, []);

  // Update center marker and radius circle (Search mode)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!showSearchCenter || !center) {
      if (centerMarkerRef.current) {
        centerMarkerRef.current.remove();
        centerMarkerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
      return;
    }

    const safeCenterName = escapeHtml(center.name);

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng([center.lat, center.lng]);
    } else {
      centerMarkerRef.current = L.marker([center.lat, center.lng], {
        icon: CENTER_ICON,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(`<b>Tâm tìm kiếm</b><br/>${safeCenterName}`);
    }

    centerMarkerRef.current.setPopupContent(
      `<div class="text-xs"><strong>Tâm tìm kiếm</strong><br/>${safeCenterName}<br/>Bán kính: ${radiusKm} km</div>`
    );

    if (circleRef.current) {
      circleRef.current.setLatLng([center.lat, center.lng]);
      circleRef.current.setRadius(radiusKm * 1000);
    } else {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radiusKm * 1000,
        color: '#2563eb',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
      }).addTo(map);
    }

    map.fitBounds(circleRef.current.getBounds(), { padding: [28, 28], maxZoom: 15 });
  }, [showSearchCenter, center?.lat, center?.lng, center?.name, radiusKm]);

  // Effect 1: Create Leaflet markers when places list or view mode changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = placesLayerRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    markersByIdRef.current.clear();
    const coords = [];

    const showReviews = zoomLevel >= 14;

    places.forEach((place, idx) => {
      if (place.lat == null || place.lng == null) return;
      coords.push([place.lat, place.lng]);

      const catStyle = getCategoryStyle(place.categoryLabel, place.type, place.name);
      const iconSvg = lucideIconToSvg(catStyle.Icon, 12);
      const mapPinColor = catStyle.isLodgingGroup
        ? '#4338ca'
        : showSearchCenter
          ? '#d97706'
          : '#e11d48';
      const safePlaceName = escapeHtml(place.name);
      const reviewLabel = (place.reviewCount ?? 0).toLocaleString('vi-VN');
      const stopNumber = routeStopNumbers?.get?.(place.id) ?? null;
      const isSelected = selectedPlace?.id === place.id;

      const visual = buildMarkerVisual({
        place,
        iconSvg,
        mapPinColor,
        showSearchCenter,
        stopNumber,
        isSelected,
        showReviews,
      });

      const marker = L.marker([place.lat, place.lng], {
        icon: visual.icon,
        zIndexOffset: visual.zIndexOffset,
      });

      const popupHtml = `
        <div style="min-width:190px;font-family:inherit;">
          <div style="display:inline-flex;align-items:center;gap:4px;background:${mapPinColor}18;color:${mapPinColor};padding:2px 7px;border-radius:9999px;font-size:11px;font-weight:700;margin-bottom:5px;">
            ${iconSvg}<span>${escapeHtml(catStyle.label)}</span>
          </div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${safePlaceName}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:4px;">
            ⭐ <b>${place.rating || 'N/A'}</b> (${reviewLabel} đánh giá)
          </div>
          ${
            place.distanceKm !== null && showSearchCenter
              ? `<div style="font-size:11px;color:#64748b;">Cách tâm ${place.distanceKm} km</div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        onSelectPlaceRef.current?.(place);
      });
      marker.addTo(layer);

      markersByIdRef.current.set(place.id || idx, {
        marker,
        place,
        catStyle,
        iconSvg,
        mapPinColor,
        renderedKey: visual.key,
      });
    });

    if (!showSearchCenter) {
      if (coords.length > 0) {
        const targetFitKey =
          fitKey != null
            ? String(fitKey)
            : coords.map(([la, ln]) => `${la},${ln}`).join('|');
        if (targetFitKey !== lastFittedCoordsKeyRef.current) {
          lastFittedCoordsKeyRef.current = targetFitKey;
          map.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 15 });
        }
      }
    } else {
      lastFittedCoordsKeyRef.current = '';
    }
  }, [places, showSearchCenter, fitKey]);

  // Effect 2: Sync marker icons in-place on zoom, route, or selection change
  useEffect(() => {
    const showReviews = zoomLevel >= 14;

    for (const entry of markersByIdRef.current.values()) {
      const { marker, place, iconSvg, mapPinColor, renderedKey } = entry;
      const stopNumber = routeStopNumbers?.get?.(place.id) ?? null;
      const isSelected = selectedPlace?.id === place.id;

      const visual = buildMarkerVisual({
        place,
        iconSvg,
        mapPinColor,
        showSearchCenter,
        stopNumber,
        isSelected,
        showReviews,
      });

      if (renderedKey !== visual.key) {
        marker.setIcon(visual.icon);
        marker.setZIndexOffset(visual.zIndexOffset);
        entry.renderedKey = visual.key;
      }
    }
  }, [places, showSearchCenter, routeStopNumbers, zoomLevel, selectedPlace?.id]);

  // Render driving route polyline (Saved maps multi-stop planner)
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (Array.isArray(routeLine) && routeLine.length >= 2) {
      L.polyline(routeLine, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(layer);
    }
  }, [routeLine]);

  // Pan to selected place
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlace || selectedPlace.lat == null || selectedPlace.lng == null) return;
    map.panTo([selectedPlace.lat, selectedPlace.lng], { animate: true });
  }, [selectedPlace]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {onMapStatusFilterChange && (
        <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur p-0.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-0.5 text-[11px] font-semibold">
          {MAP_STATUS_FILTERS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onMapStatusFilterChange(opt.id)}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                mapStatusFilter === opt.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-600 flex items-center gap-3 pointer-events-none">
        {showSearchCenter && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Tâm
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: '#4338ca' }}
          />{' '}
          Nơi ở
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: showSearchCenter ? '#d97706' : '#e11d48' }}
          />{' '}
          Ăn uống
        </span>
      </div>
    </div>
  );
}
