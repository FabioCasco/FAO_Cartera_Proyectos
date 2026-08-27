"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, RefreshCw, TriangleAlert } from "lucide-react";

const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";

function loadLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("El selector requiere un navegador."));
  }
  if (window.L?.map) return Promise.resolve(window.L);
  if (window.__faoLeafletLoader) return window.__faoLeafletLoader;

  window.__faoLeafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = LEAFLET_CSS;
      stylesheet.crossOrigin = "anonymous";
      document.head.appendChild(stylesheet);
    }

    const finish = () => {
      if (window.L?.map) resolve(window.L);
      else reject(new Error("Leaflet no quedó disponible."));
    };

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No fue posible cargar el selector cartográfico.")),
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
      () => reject(new Error("No fue posible cargar el selector cartográfico.")),
      { once: true },
    );
    document.head.appendChild(script);
  }).catch((error) => {
    window.__faoLeafletLoader = null;
    throw error;
  });

  return window.__faoLeafletLoader;
}

export function LocationPicker({ value, onChange }) {
  const node = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Inicializando selector…");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let active = true;
    let map = null;

    loadLeaflet()
      .then((L) => {
        if (!active || !node.current) return;

        const latitude = Number(value?.latitude);
        const longitude = Number(value?.longitude);
        const hasPosition =
          Number.isFinite(latitude) && Number.isFinite(longitude);

        map = L.map(node.current, {
          attributionControl: true,
          zoomControl: true,
          preferCanvas: true,
        });
        mapRef.current = map;
        map.setView(
          hasPosition ? [latitude, longitude] : [14.65, -86.6],
          hasPosition ? 10 : 6.4,
        );

        const topographic = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles © Esri",
            maxZoom: 18,
          },
        );
        const streets = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
            subdomains: "abc",
          },
        );

        topographic.addTo(map);
        topographic.on("tileerror", () => {
          if (!active || !mapRef.current || mapRef.current.hasLayer(streets)) return;
          mapRef.current.removeLayer(topographic);
          streets.addTo(mapRef.current);
          setMessage("Se activó OpenStreetMap como respaldo.");
        });

        L.control.layers(
          {
            "Topográfico · Esri": topographic,
            "Calles · OpenStreetMap": streets,
          },
          {},
          { collapsed: true, position: "topright" },
        ).addTo(map);

        map.on("click", (event) => {
          onChangeRef.current?.({
            latitude: Number(event.latlng.lat.toFixed(6)),
            longitude: Number(event.latlng.lng.toFixed(6)),
          });
        });

        setStatus("ready");
        setMessage("Haga clic en el mapa para ubicar el punto.");
        window.setTimeout(() => map?.invalidateSize(), 0);
      })
      .catch((error) => {
        if (!active) return;
        setStatus("error");
        setMessage(error.message || "No fue posible abrir el selector.");
      });

    return () => {
      active = false;
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
      return;
    }

    markerRef.current?.remove();
    markerRef.current = L.marker([latitude, longitude], {
      title: "Ubicación de la intervención",
    }).addTo(map);
    map.panTo([latitude, longitude], { animate: true, duration: 0.35 });
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
