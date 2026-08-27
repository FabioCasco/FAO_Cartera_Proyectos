"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export function LocationPicker({ value, onChange }) {
  const node = useRef(null); const mapRef = useRef(null); const markerRef = useRef(null);
  useEffect(() => { if (!node.current || mapRef.current) return; const map = new maplibregl.Map({ container: node.current, style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", center: value?.longitude && value?.latitude ? [value.longitude, value.latitude] : [-86.6, 14.65], zoom: value?.longitude ? 9 : 6.1 }); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right"); map.on("click", (e) => onChange({ latitude: Number(e.lngLat.lat.toFixed(6)), longitude: Number(e.lngLat.lng.toFixed(6)) })); mapRef.current = map; return () => map.remove(); }, [onChange, value?.latitude, value?.longitude]);
  useEffect(() => { if (!mapRef.current || !value?.longitude || !value?.latitude) return; markerRef.current?.remove(); markerRef.current = new maplibregl.Marker({ color: "#69CFD8" }).setLngLat([value.longitude, value.latitude]).addTo(mapRef.current); }, [value]);
  return <div className="location-picker" ref={node}/>;
}
