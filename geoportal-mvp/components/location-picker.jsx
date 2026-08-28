"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, RefreshCw, TriangleAlert } from "lucide-react";

const LEAFLET_JS =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";

function loadLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("El selector requiere un navegador."));
  }
  if (window.L?.map) return Promise.resolve(window.L);
  if (window.__faoGeoHubLeafletPromise) {
    return window.__faoGeoHubLeafletPromise;
  }

  window.__faoGeoHubLeafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = LEAFLET_CSS;
      stylesheet.crossOrigin = "anonymous";
      document.head.appendChild(stylesheet);
    }

    function finish() {
      if (window.L?.map) resolve(window.L);
      else reject(new Error("Leaflet no quedó disponible."));
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No fue posible cargar Leaflet.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("No fue posible cargar Leaflet.")),
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error) => {
    window.__faoGeoHubLeafletPromise = null;
    throw error;
  });

  return window.__faoGeoHubLeafletPromise;
}

export function LocationPicker({ value, onChange }) {
  const node = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Preparando mapa ligero…");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    let active = true;
    let map = null;

    loadLeaflet()
      .then((L) => {
        if (!active || !node.current || mapRef.current) return;

        const latitude = Number(valueRef.current?.latitude);
        const longitude = Number(valueRef.current?.longitude);
        const hasPosition =
          Number.isFinite(latitude) && Number.isFinite(longitude);

        map = L.map(node.current, {
          attributionControl: true,
          zoomControl: true,
          preferCanvas: true,
          zoomSnap: 0.25,
        });
        mapRef.current = map;
        map.setView(
          hasPosition ? [latitude, longitude] : [14.65, -86.6],
          hasPosition ? 11 : 6.4,
        );

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
          subdomains: "abc",
          updateWhenIdle: true,
        }).addTo(map);

        map.on("click", (event) => {
          onChangeRef.current?.({
            latitude: Number(event.latlng.lat.toFixed(6)),
            longitude: Number(event.latlng.lng.toFixed(6)),
          });
        });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserverRef.current = new ResizeObserver(() => {
            window.requestAnimationFrame(() =>
              mapRef.current?.invalidateSize({ pan: false }),
            );
          });
          resizeObserverRef.current.observe(node.current);
        }

        setStatus("ready");
        setMessage("Haga clic para fijar o cambiar la coordenada.");
        window.setTimeout(() => map.invalidateSize({ pan: false }), 0);
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(error.message || "No fue posible abrir el selector.");
      });

    return () => {
      active = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    const latitude = Number(value?.latitude);
    const longitude = Number(value?.longitude);

    if (!L || !map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.circleMarker([latitude, longitude], {
        radius: 8,
        color: "#edf7f8",
        fillColor: "#69cfd8",
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
    }
    map.panTo([latitude, longitude], { animate: true, duration: 0.3 });
  }, [value?.latitude, value?.longitude]);

  return (
    <div className="location-picker-shell location-picker-shell--compact">
      <div className="location-picker location-picker--compact" ref={node} />
      <div className={`location-picker-status location-picker-status--${status}`}>
        {status === "loading" && <RefreshCw className="spin" size={13} />}
        {status === "error" && <TriangleAlert size={13} />}
        {status === "ready" && <MapPin size={13} />}
        <span>{message}</span>
      </div>
    </div>
  );
}
