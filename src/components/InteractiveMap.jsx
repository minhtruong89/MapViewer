import { useEffect, useRef } from 'react';
import L from 'leaflet';

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

function createColoredPin(color, label) {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background:${color};
      color:#fff;
      width:28px;
      height:28px;
      border-radius:9999px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:700;
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.28);
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createLabeledPin(isLodging, name, rating, stopNumber = null) {
  const bg = isLodging ? '#4338ca' : '#e11d48';
  const baseName = name.length > 26 ? name.slice(0, 25) + '…' : name;
  const labelText = stopNumber != null ? `#${stopNumber} · ${baseName}` : baseName;
  const shortName = escapeHtml(labelText);
  const ratingLabel = rating ? rating.toFixed(1) : '?';

  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="position:relative;width:28px;height:28px;">
      <div style="
        position:absolute;
        bottom:33px;
        left:50%;
        transform:translateX(-50%);
        background:${bg};
        color:#ffffff;
        padding:3px 9px;
        border-radius:9999px;
        font-size:11px;
        font-weight:700;
        white-space:nowrap;
        border:2px solid #ffffff;
        box-shadow:0 2px 8px rgba(0,0,0,0.28);
        pointer-events:none;
      ">${shortName}</div>
      <div style="
        background:${bg};
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
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ">${ratingLabel}</div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
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

  // Render place markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = placesLayerRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    const coords = [];

    places.forEach((place) => {
      if (place.lat == null || place.lng == null) return;
      coords.push([place.lat, place.lng]);

      const isLodging = place.type === 'lodging';
      const color = isLodging ? '#4f46e5' : '#d97706';
      const ratingLabel = place.rating ? place.rating.toFixed(1) : '?';
      const safePlaceName = escapeHtml(place.name);
      const reviewLabel = (place.reviewCount ?? 0).toLocaleString('vi-VN');

      const stopNumber = routeStopNumbers?.get?.(place.id) ?? null;
      const marker = L.marker([place.lat, place.lng], {
        icon: showSearchCenter
          ? createColoredPin(color, ratingLabel)
          : createLabeledPin(isLodging, place.name, place.rating, stopNumber),
      });

      const popupHtml = `
        <div style="min-width:190px;font-family:inherit;">
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
    });

    if (!showSearchCenter && coords.length > 0) {
      const coordsKey = coords.map(([la, ln]) => `${la},${ln}`).join('|');
      if (coordsKey !== lastFittedCoordsKeyRef.current) {
        lastFittedCoordsKeyRef.current = coordsKey;
        map.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 15 });
      }
    } else {
      lastFittedCoordsKeyRef.current = '';
    }
  }, [places, showSearchCenter, routeStopNumbers]);

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
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-600 flex items-center gap-3 pointer-events-none">
        {showSearchCenter && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Tâm
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" /> Nơi ở
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full inline-block ${
              showSearchCenter ? 'bg-amber-600' : 'bg-rose-600'
            }`}
          />{' '}
          Ăn uống
        </span>
      </div>
    </div>
  );
}
