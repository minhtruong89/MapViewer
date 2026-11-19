import { useCallback, useEffect, useMemo, useState } from 'react';

const SAVED_MAPS_STORAGE_KEY = 'analyzed_map_saved_v1';

function sanitizePlaceItem(item) {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id || '').trim();
  const name = String(item.name || '').trim();
  if (!id || !name) return null;

  return {
    id,
    type: item.type === 'lodging' ? 'lodging' : 'restaurant',
    name,
    rating: Number(item.rating) || 0,
    reviewCount: Number(item.reviewCount) || 0,
    distanceKm:
      typeof item.distanceKm === 'number' && Number.isFinite(item.distanceKm)
        ? item.distanceKm
        : null,
    categoryLabel: String(item.categoryLabel || ''),
    address: String(item.address || ''),
    phone: String(item.phone || ''),
    priceLevel: String(item.priceLevel || ''),
    imageUrl: typeof item.imageUrl === 'string' && item.imageUrl ? item.imageUrl : null,
    lat: typeof item.lat === 'number' && Number.isFinite(item.lat) ? item.lat : null,
    lng: typeof item.lng === 'number' && Number.isFinite(item.lng) ? item.lng : null,
    mapsUrl: String(item.mapsUrl || ''),
    note: String(item.note || '').slice(0, 300),
    visited: Boolean(item.visited),
  };
}

function sanitizeSavedMap(entry, fallbackIdx = 0) {
  if (!entry || typeof entry !== 'object') return null;
  const name = String(entry.name || '').trim();
  if (!name || !Array.isArray(entry.items)) return null;

  const rawId = String(entry.id || '').trim();
  const id = rawId || `${Date.now()}-${fallbackIdx}-${Math.random().toString(36).slice(2, 7)}`;

  const seenItemIds = new Set();
  const items = [];
  for (const rawItem of entry.items) {
    const clean = sanitizePlaceItem(rawItem);
    if (clean && !seenItemIds.has(clean.id)) {
      seenItemIds.add(clean.id);
      items.push(clean);
    }
  }

  return {
    id,
    name,
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
    items,
  };
}

/**
 * Manages saved maps in localStorage with CRUD, place metadata sync, and JSON export/import.
 */
export function useSavedMaps() {
  const [savedMaps, setSavedMaps] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_MAPS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((m, idx) => sanitizeSavedMap(m, idx)).filter(Boolean);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_MAPS_STORAGE_KEY, JSON.stringify(savedMaps));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedMaps]);

  const savedPlaceIds = useMemo(() => {
    const ids = new Set();
    savedMaps.forEach((m) => m.items.forEach((it) => ids.add(it.id)));
    return ids;
  }, [savedMaps]);

  const toggleMap = useCallback((mapId, place) => {
    setSavedMaps((prev) =>
      prev.map((m) => {
        if (m.id !== mapId) return m;
        const exists = m.items.some((it) => it.id === place.id);
        return {
          ...m,
          items: exists
            ? m.items.filter((it) => it.id !== place.id)
            : [...m.items, place],
        };
      })
    );
  }, []);

  const createAndSave = useCallback((mapName, place) => {
    const trimmed = String(mapName || '').trim();
    if (!trimmed) return;
    const newMap = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      items: [place],
    };
    setSavedMaps((prev) => [newMap, ...prev]);
  }, []);

  const renameMap = useCallback((mapId, newName) => {
    const trimmed = String(newName || '').trim();
    if (!trimmed) return;
    setSavedMaps((prev) =>
      prev.map((m) => (m.id === mapId ? { ...m, name: trimmed } : m))
    );
  }, []);

  const removeItem = useCallback((mapId, placeId) => {
    setSavedMaps((prev) =>
      prev.map((m) =>
        m.id === mapId ? { ...m, items: m.items.filter((it) => it.id !== placeId) } : m
      )
    );
  }, []);

  const deleteMap = useCallback((mapId) => {
    setSavedMaps((prev) => prev.filter((m) => m.id !== mapId));
  }, []);

  const updateItemMeta = useCallback((mapId, placeId, patch) => {
    if (!patch || typeof patch !== 'object') return;
    setSavedMaps((prev) =>
      prev.map((m) => {
        if (m.id !== mapId) return m;
        return {
          ...m,
          items: m.items.map((it) => {
            if (it.id !== placeId) return it;
            return {
              ...it,
              ...('note' in patch ? { note: String(patch.note || '').slice(0, 300) } : {}),
              ...('visited' in patch ? { visited: Boolean(patch.visited) } : {}),
            };
          }),
        };
      })
    );
  }, []);

  const updatePlaceInSavedMaps = useCallback((placeId, details) => {
    const firstPhoto = details?.photos?.[0] || null;
    const nextAddr = details?.address || '';
    const nextTel = details?.phone || '';
    if (!firstPhoto && !nextAddr && !nextTel) return;

    setSavedMaps((prev) => {
      let anyChanged = false;
      const updated = prev.map((m) => {
        let mapChanged = false;
        const nextItems = m.items.map((it) => {
          if (it.id !== placeId) return it;
          const resolvedImage = it.imageUrl || firstPhoto;
          const resolvedAddr = nextAddr || it.address;
          const resolvedPhone = it.phone || nextTel || '';
          if (
            resolvedImage === it.imageUrl &&
            resolvedAddr === it.address &&
            resolvedPhone === it.phone
          ) {
            return it;
          }
          mapChanged = true;
          anyChanged = true;
          return {
            ...it,
            imageUrl: resolvedImage,
            address: resolvedAddr,
            phone: resolvedPhone,
          };
        });
        return mapChanged ? { ...m, items: nextItems } : m;
      });
      return anyChanged ? updated : prev;
    });
  }, []);

  const exportMapsJson = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      savedMaps,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `map-analyzer-saved-maps-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [savedMaps]);

  const importMapsJson = useCallback(
    (rawText) => {
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new Error('File không đúng định dạng JSON.');
      }

      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.savedMaps)
          ? parsed.savedMaps
          : null;

      if (!rawList) {
        throw new Error('File JSON không đúng cấu trúc MapAnalyzer.');
      }

      const validMaps = rawList
        .map((m, idx) => sanitizeSavedMap(m, idx))
        .filter(Boolean);

      if (validMaps.length === 0) {
        throw new Error('File JSON không chứa map nào hợp lệ.');
      }

      const nextMaps = savedMaps.map((m) => ({ ...m, items: [...m.items] }));
      const byId = new Map(nextMaps.map((m) => [m.id, m]));
      const usedIds = new Set(byId.keys());

      let importedMapsCount = 0;
      let importedItemsCount = 0;

      for (const incoming of validMaps) {
        const existing = byId.get(incoming.id);
        if (existing) {
          const existingItemIds = new Set(existing.items.map((it) => it.id));
          let addedHere = 0;
          for (const item of incoming.items) {
            if (!existingItemIds.has(item.id)) {
              existing.items.push(item);
              existingItemIds.add(item.id);
              addedHere++;
            }
          }
          importedItemsCount += addedHere;
          if (addedHere > 0) importedMapsCount++;
        } else {
          let uniqueId = incoming.id;
          while (usedIds.has(uniqueId)) {
            uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          }
          usedIds.add(uniqueId);
          const created = { ...incoming, id: uniqueId };
          nextMaps.push(created);
          byId.set(uniqueId, created);
          importedMapsCount++;
          importedItemsCount += created.items.length;
        }
      }

      setSavedMaps(nextMaps);
      return { importedMapsCount, importedItemsCount };
    },
    [savedMaps]
  );

  return {
    savedMaps,
    savedPlaceIds,
    toggleMap,
    createAndSave,
    renameMap,
    removeItem,
    deleteMap,
    updateItemMeta,
    updatePlaceInSavedMaps,
    exportMapsJson,
    importMapsJson,
  };
}
