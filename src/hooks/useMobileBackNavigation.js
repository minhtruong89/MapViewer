import { useCallback, useEffect, useRef, useState } from 'react';

const NAV_SESSION_TOKEN = `map_nav_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const NOOP_TRANSITION = {
  closePlaceModal: false,
  closeSaveModal: false,
  nextView: null,
  nextExitConfirm: null,
  stepBackStaleForward: false,
  rearmLayers: [],
};

export function isOurHistoryState(state, token = NAV_SESSION_TOKEN) {
  return Boolean(state && state.__appNavToken === token);
}

/**
 * Pure transition resolver for popstate events across popup, saved map, home, and exit layers.
 */
export function resolveBackTransition({ targetState, currentUi, sessionToken = NAV_SESSION_TOKEN }) {
  if (currentUi?.isExiting) {
    return { ...NOOP_TRANSITION };
  }

  const ours = isOurHistoryState(targetState, sessionToken);
  const layer = ours ? targetState.layer : null;

  if (layer === 'modal') {
    if (!currentUi.hasPlaceModal && !currentUi.hasSaveModal) {
      return { ...NOOP_TRANSITION, stepBackStaleForward: true };
    }
    return { ...NOOP_TRANSITION };
  }

  if (layer === 'saved') {
    return {
      ...NOOP_TRANSITION,
      closePlaceModal: Boolean(currentUi.hasPlaceModal),
      closeSaveModal: Boolean(currentUi.hasSaveModal),
      nextExitConfirm: currentUi.showExitConfirm ? false : null,
      nextView: currentUi.activeView !== 'saved' ? 'saved' : null,
    };
  }

  if (layer === 'home') {
    return {
      ...NOOP_TRANSITION,
      closePlaceModal: Boolean(currentUi.hasPlaceModal),
      closeSaveModal: Boolean(currentUi.hasSaveModal),
      nextExitConfirm: currentUi.showExitConfirm ? false : null,
      nextView: currentUi.activeView !== 'search' ? 'search' : null,
    };
  }

  // Reached 'exit-trap' or left our session history stack
  if (!ours && currentUi.showExitConfirm) {
    return { ...NOOP_TRANSITION };
  }

  const rearmForSaved = currentUi.activeView === 'saved' ? ['home', 'saved'] : ['home'];

  if (currentUi.hasPlaceModal) {
    return {
      ...NOOP_TRANSITION,
      closePlaceModal: true,
      rearmLayers: rearmForSaved,
    };
  }

  if (currentUi.hasSaveModal) {
    return {
      ...NOOP_TRANSITION,
      closeSaveModal: true,
      rearmLayers: rearmForSaved,
    };
  }

  if (currentUi.activeView === 'saved') {
    return {
      ...NOOP_TRANSITION,
      nextView: 'search',
      rearmLayers: ['home'],
    };
  }

  return {
    ...NOOP_TRANSITION,
    nextExitConfirm: true,
  };
}

/**
 * Syncs browser history entries with modal popups, view tabs, and an exit-confirmation guard
 * so mobile hardware/gesture Back navigates step-by-step instead of immediately closing the app.
 */
export function useMobileBackNavigation({
  activeView,
  setActiveView,
  modalPlace,
  setModalPlace,
  saveTargetPlace,
  setSaveTargetPlace,
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitFallbackHint, setExitFallbackHint] = useState(false);

  const uiStateRef = useRef({
    activeView,
    hasPlaceModal: Boolean(modalPlace),
    hasSaveModal: Boolean(saveTargetPlace),
    showExitConfirm,
  });
  uiStateRef.current = {
    activeView,
    hasPlaceModal: Boolean(modalPlace),
    hasSaveModal: Boolean(saveTargetPlace),
    showExitConfirm,
  };

  const exitingRef = useRef(false);
  const pendingProgrammaticBackRef = useRef(0);
  const pendingPushAfterBackRef = useRef(null);
  const backSafetyTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const exitFallbackTimerRef = useRef(null);

  const pushHistoryLayer = useCallback((layer, extra = {}) => {
    window.history.pushState(
      { __appNavToken: NAV_SESSION_TOKEN, layer, ...extra },
      ''
    );
  }, []);

  const ensureLayersUpTo = useCallback(
    (targetBaseLayer) => {
      const cur = window.history.state;
      if (!isOurHistoryState(cur)) {
        const preserved = cur && typeof cur === 'object' ? cur : {};
        window.history.replaceState(
          { ...preserved, __appNavToken: NAV_SESSION_TOKEN, layer: 'exit-trap' },
          ''
        );
        pushHistoryLayer('home');
        if (targetBaseLayer === 'saved') {
          pushHistoryLayer('saved');
        }
        return;
      }

      if (cur.layer === 'exit-trap') {
        pushHistoryLayer('home');
        if (targetBaseLayer === 'saved') {
          pushHistoryLayer('saved');
        }
        return;
      }

      if (cur.layer === 'home' && targetBaseLayer === 'saved') {
        pushHistoryLayer('saved');
      }
    },
    [pushHistoryLayer]
  );

  const flushPendingPush = useCallback(() => {
    const pending = pendingPushAfterBackRef.current;
    if (!pending) return;
    pendingPushAfterBackRef.current = null;

    const targetBase = pending.base || 'home';
    if (pending.layer === 'saved') {
      ensureLayersUpTo('home');
      pushHistoryLayer('saved', pending.extra);
    } else {
      ensureLayersUpTo(targetBase);
      pushHistoryLayer(pending.layer, pending.extra);
    }
  }, [ensureLayersUpTo, pushHistoryLayer]);

  const triggerProgrammaticBack = useCallback(() => {
    pendingProgrammaticBackRef.current += 1;
    clearTimeout(backSafetyTimerRef.current);
    backSafetyTimerRef.current = setTimeout(() => {
      pendingProgrammaticBackRef.current = 0;
      flushPendingPush();
    }, 350);
    window.history.back();
  }, [flushPendingPush]);

  useEffect(() => {
    if (!isOurHistoryState(window.history.state)) {
      const existing =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.replaceState(
        { ...existing, __appNavToken: NAV_SESSION_TOKEN, layer: 'exit-trap' },
        ''
      );
    }

    // Wait for real user activation before pushing 'home' so Chromium does not flag 'exit-trap' skippable.
    function handleUserGesture() {
      if (
        uiStateRef.current.showExitConfirm ||
        exitingRef.current ||
        pendingProgrammaticBackRef.current > 0
      ) {
        return;
      }
      const cur = window.history.state;
      if (!isOurHistoryState(cur) || cur.layer !== 'exit-trap') {
        return;
      }
      if (
        typeof navigator !== 'undefined' &&
        navigator.userActivation &&
        !navigator.userActivation.hasBeenActive
      ) {
        return;
      }
      pushHistoryLayer('home');
    }

    function handlePopState(event) {
      if (pendingProgrammaticBackRef.current > 0) {
        pendingProgrammaticBackRef.current -= 1;
        if (pendingProgrammaticBackRef.current === 0) {
          clearTimeout(backSafetyTimerRef.current);
          flushPendingPush();
        }
        return;
      }

      const action = resolveBackTransition({
        targetState: event.state,
        currentUi: {
          ...uiStateRef.current,
          isExiting: exitingRef.current,
        },
        sessionToken: NAV_SESSION_TOKEN,
      });

      if (action.stepBackStaleForward) {
        triggerProgrammaticBack();
        return;
      }
      if (action.closePlaceModal) {
        setModalPlace(null);
      }
      if (action.closeSaveModal) {
        setSaveTargetPlace(null);
      }
      if (action.nextView) {
        setActiveView(action.nextView);
      }
      if (action.nextExitConfirm !== null) {
        setShowExitConfirm(action.nextExitConfirm);
        if (action.nextExitConfirm === false) {
          setExitFallbackHint(false);
        }
      }
      if (action.rearmLayers.length > 0) {
        action.rearmLayers.forEach((layer) => pushHistoryLayer(layer));
      }
    }

    window.addEventListener('pointerup', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pointerup', handleUserGesture, { capture: true });
      window.removeEventListener('click', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      clearTimeout(backSafetyTimerRef.current);
      clearTimeout(exitTimerRef.current);
      clearTimeout(exitFallbackTimerRef.current);
    };
  }, [
    flushPendingPush,
    pushHistoryLayer,
    setActiveView,
    setModalPlace,
    setSaveTargetPlace,
    triggerProgrammaticBack,
  ]);

  const navigateToView = useCallback(
    (nextView) => {
      if (nextView === uiStateRef.current.activeView) return;
      setShowExitConfirm(false);
      setExitFallbackHint(false);
      setActiveView(nextView);

      if (nextView === 'saved') {
        if (pendingProgrammaticBackRef.current > 0) {
          pendingPushAfterBackRef.current = { base: 'home', layer: 'saved' };
        } else {
          ensureLayersUpTo('home');
          pushHistoryLayer('saved');
        }
      } else {
        pendingPushAfterBackRef.current = null;
        if (isOurHistoryState(window.history.state) && window.history.state.layer === 'saved') {
          triggerProgrammaticBack();
        }
      }
    },
    [ensureLayersUpTo, pushHistoryLayer, setActiveView, triggerProgrammaticBack]
  );

  const openModalLayer = useCallback(
    (setter, modalType, place) => {
      if (!place) return;
      setShowExitConfirm(false);
      setExitFallbackHint(false);
      setter(place);

      const base = uiStateRef.current.activeView === 'saved' ? 'saved' : 'home';
      const extra = { modal: modalType };

      if (pendingProgrammaticBackRef.current > 0) {
        pendingPushAfterBackRef.current = { base, layer: 'modal', extra };
      } else if (
        isOurHistoryState(window.history.state) &&
        window.history.state.layer === 'modal'
      ) {
        window.history.replaceState(
          { __appNavToken: NAV_SESSION_TOKEN, layer: 'modal', ...extra },
          ''
        );
      } else {
        ensureLayersUpTo(base);
        pushHistoryLayer('modal', extra);
      }
    },
    [ensureLayersUpTo, pushHistoryLayer]
  );

  const closeModalLayer = useCallback(
    (setter) => {
      setter(null);
      if (isOurHistoryState(window.history.state) && window.history.state.layer === 'modal') {
        triggerProgrammaticBack();
      }
    },
    [triggerProgrammaticBack]
  );

  const openPlaceModal = useCallback(
    (place) => openModalLayer(setModalPlace, 'place', place),
    [openModalLayer, setModalPlace]
  );

  const closePlaceModal = useCallback(
    () => closeModalLayer(setModalPlace),
    [closeModalLayer, setModalPlace]
  );

  const openSaveModal = useCallback(
    (place) => openModalLayer(setSaveTargetPlace, 'save', place),
    [openModalLayer, setSaveTargetPlace]
  );

  const closeSaveModal = useCallback(
    () => closeModalLayer(setSaveTargetPlace),
    [closeModalLayer, setSaveTargetPlace]
  );

  const handleCancelExit = useCallback(() => {
    clearTimeout(exitTimerRef.current);
    clearTimeout(exitFallbackTimerRef.current);
    exitingRef.current = false;
    setExitFallbackHint(false);
    setShowExitConfirm(false);

    if (
      isOurHistoryState(window.history.state) &&
      window.history.state.layer === 'exit-trap'
    ) {
      pushHistoryLayer('home');
    }
  }, [pushHistoryLayer]);

  const handleConfirmExit = useCallback(() => {
    clearTimeout(exitTimerRef.current);
    clearTimeout(exitFallbackTimerRef.current);
    exitingRef.current = true;
    window.history.back();

    exitTimerRef.current = setTimeout(() => {
      try {
        window.close();
      } catch {
        // Ignore window.close restriction errors
      }
    }, 120);

    exitFallbackTimerRef.current = setTimeout(() => {
      exitingRef.current = false;
      setExitFallbackHint(true);
    }, 350);
  }, []);

  return {
    navigateToView,
    openPlaceModal,
    closePlaceModal,
    openSaveModal,
    closeSaveModal,
    showExitConfirm,
    exitFallbackHint,
    handleCancelExit,
    handleConfirmExit,
  };
}
