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
  const layerControlRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Inicializando selector…");

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
          hasPosition ? 9.5 : 6.25,
        );

        const topographic = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Tiles © Esri", maxZoom: 18 },
        );
        const streets = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
            subdomains: "abc",
          },
        );
        const imagery = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Imagery © Esri", maxZoom: 18 },
        );
        const dark = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Tiles © Esri", maxZoom: 16 },
        );

        topographic.addTo(map);
        layerControlRef.current = L.control.layers(
          {
            "Topográfico · predeterminado": topographic,
            "Calles · OpenStreetMap": streets,
            "Satélite · Esri": imagery,
            "Oscuro · Esri": dark,
          },
          null,
          { collapsed: true, position: "topright" },
        );
        layerControlRef.current.addTo(map);

        topographic.on("tileerror", () => {
          if (!active || !mapRef.current || mapRef.current.hasLayer(streets)) {
            return;
          }
          mapRef.current.removeLayer(topographic);
          streets.addTo(mapRef.current);
          setMessage("Se activó OpenStreetMap como respaldo.");
        });

        map.on("click", (event) => {
          onChangeRef.current?.({
            latitude: Number(event.latlng.lat.toFixed(6)),
            longitude: Number(event.latlng.lng.toFixed(6)),
          });
        });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserverRef.current = new ResizeObserver(() => {
            mapRef.current?.invalidateSize({ pan: false });
          });
          resizeObserverRef.current.observe(node.current);
        }

        setStatus("ready");
        setMessage("Haga clic en el mapa para ubicar el punto.");
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
      layerControlRef.current?.remove();
      layerControlRef.current = null;
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
      markerRef.current = L.marker([latitude, longitude], {
        title: "Ubicación de la intervención",
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
    }
  }, [value?.latitude, value?.longitude]);

  return (
    <div className="location-picker-shell">
      <div className="location-picker" ref={node} />
      <div className={`location-picker-status location-picker-status--${status}`}>
        {status === "loading" && <RefreshCw className="spin" size={13} />}
        {status === "error" && <TriangleAlert size={13} />}
        {status === "ready" && <MapPin size={13} />}
        <span>{message}</span>
      </div>
    </div>
  );
}
