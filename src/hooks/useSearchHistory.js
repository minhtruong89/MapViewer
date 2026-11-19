import { useCallback, useState } from 'react';

const SEARCH_HISTORY_STORAGE_KEY = 'analyzed_map_history_v1';
const MAX_HISTORY_ITEMS = 8;

function persistHistory(list) {
  let candidate = Array.isArray(list) ? list.slice(0, MAX_HISTORY_ITEMS) : [];
  while (candidate.length >= 0) {
    try {
      localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(candidate));
      return;
    } catch {
      if (candidate.length === 0) return;
      candidate = candidate.slice(0, candidate.length - 1);
    }
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (h) =>
          h &&
          typeof h === 'object' &&
          typeof h.id === 'string' &&
          typeof h.center?.lat === 'number' &&
          typeof h.center?.lng === 'number' &&
          Array.isArray(h.places)
      )
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

/**
 * Manages the most recent Google Maps search snapshots in localStorage.
 */
export function useSearchHistory() {
  const [history, setHistory] = useState(loadHistory);

  const saveSearchSnapshot = useCallback(
    ({ center, radiusKm, category, customQuery, maxResults, places }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const normalizedQuery = (customQuery || '').trim();
      const entry = {
        id,
        timestamp: new Date().toISOString(),
        center,
        radiusKm,
        category,
        customQuery: normalizedQuery,
        maxResults,
        places: Array.isArray(places) ? places : [],
      };

      setHistory((prev) => {
        const filtered = prev.filter(
          (h) =>
            !(
              Math.abs(h.center.lat - center.lat) < 0.0005 &&
              Math.abs(h.center.lng - center.lng) < 0.0005 &&
              h.radiusKm === radiusKm &&
              h.category === category &&
              (h.customQuery || '').trim().toLowerCase() === normalizedQuery.toLowerCase()
            )
        );
        const next = [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
        persistHistory(next);
        return next;
      });

      return id;
    },
    []
  );

  const updateSnapshotPlaces = useCallback((entryId, updaterFn) => {
    if (!entryId) return;
    setHistory((prev) => {
      let changed = false;
      const next = prev.map((h) => {
        if (h.id !== entryId) return h;
        const nextPlaces =
          typeof updaterFn === 'function' ? updaterFn(h.places) : updaterFn;
        if (nextPlaces === h.places) return h;
        changed = true;
        return { ...h, places: nextPlaces };
      });
      if (changed) {
        persistHistory(next);
        return next;
      }
      return prev;
    });
  }, []);

  const removeHistoryEntry = useCallback((entryId) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== entryId);
      persistHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    persistHistory([]);
  }, []);

  return {
    history,
    saveSearchSnapshot,
    updateSnapshotPlaces,
    removeHistoryEntry,
    clearHistory,
  };
}
