"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

const valueCache = new Map();
const listenersByKey = new Map();

function getListeners(key) {
  if (!listenersByKey.has(key)) listenersByKey.set(key, new Set());
  return listenersByKey.get(key);
}

function notify(key) {
  for (const listener of getListeners(key)) listener();
}

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(key);
  const cached = valueCache.get(key);
  if (cached && cached.raw === raw) return cached.value;

  if (raw === null) {
    valueCache.set(key, { raw: null, value: fallback });
    return fallback;
  }

  try {
    const value = JSON.parse(raw);
    valueCache.set(key, { raw, value });
    return value;
  } catch {
    valueCache.set(key, { raw: null, value: fallback });
    return fallback;
  }
}

function writeStoredValue(key, value) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(value);
  window.localStorage.setItem(key, raw);
  valueCache.set(key, { raw, value });
  notify(key);
}

function clearStoredValue(key) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
  valueCache.delete(key);
  notify(key);
}

/**
 * Persistent state that survives route changes, tab visibility changes and
 * browser reloads. The server snapshot remains deterministic, avoiding a
 * hydration mismatch in the statically exported Next.js application.
 */
export function usePersistentState(key, initialValue) {
  const [initial] = useState(() =>
    typeof initialValue === "function" ? initialValue() : initialValue,
  );

  const subscribe = useCallback(
    (listener) => {
      const listeners = getListeners(key);
      listeners.add(listener);

      function handleStorage(event) {
        if (event.key !== key) return;
        valueCache.delete(key);
        listener();
      }

      window.addEventListener("storage", handleStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", handleStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(
    () => readStoredValue(key, initial),
    [initial, key],
  );
  const getServerSnapshot = useCallback(() => initial, [initial]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (nextValue) => {
      const current = readStoredValue(key, initial);
      const resolved =
        typeof nextValue === "function" ? nextValue(current) : nextValue;
      writeStoredValue(key, resolved);
    },
    [initial, key],
  );

  const clearValue = useCallback(() => clearStoredValue(key), [key]);

  return [value, setValue, clearValue];
}

/**
 * Restores the vertical position for each application route. It complements
 * the persistent filters and drafts without storing project data in the URL.
 */
export function useRouteScrollRestoration(routeKey) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const storageKey = `fao-hn-geohub:scroll:${routeKey || "home"}`;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const raw = window.sessionStorage.getItem(storageKey);
    const savedPosition = Number(raw || 0);
    let scrollFrame = null;

    const restoreFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (Number.isFinite(savedPosition)) {
          window.scrollTo({ top: savedPosition, left: 0, behavior: "auto" });
        }
      });
    });

    function savePosition() {
      window.sessionStorage.setItem(storageKey, String(window.scrollY || 0));
    }

    function handleScroll() {
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      scrollFrame = window.requestAnimationFrame(savePosition);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", savePosition);

    return () => {
      savePosition();
      window.cancelAnimationFrame(restoreFrame);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", savePosition);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [routeKey]);
}
