"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { ArrowUpRight, Layers3, LocateFixed, MapPinned, Search } from "lucide-react";
import { getAreas, getLocations, getProjects } from "@/lib/data";

const boundaryUrl = process.env.NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL || "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson";

export function GeoportalMap() {
  const node = useRef(null); const mapRef = useRef(null); const [locations, setLocations] = useState([]); const [projects, setProjects] = useState([]); const [areas, setAreas] = useState([]); const [area, setArea] = useState("all"); const [project, setProject] = useState("all"); const [selected, setSelected] = useState(null); const [query, setQuery] = useState("");
  useEffect(() => { Promise.all([getLocations(), getProjects(), getAreas()]).then(([l, p, a]) => { setLocations(l); setProjects(p); setAreas(a); }); }, []);
  const filtered = useMemo(() => locations.filter((l) => (area === "all" || l.area_slug === area) && (project === "all" || l.project_id === project) && (!query || `${l.municipality} ${l.department} ${l.project_acronym}`.toLowerCase().includes(query.toLowerCase()))), [locations, area, project, query]);
  const municipalities = useMemo(() => { const map = new Map(); filtered.forEach((l) => { const key = `${l.department}|${l.municipality}`; if (!map.has(key)) map.set(key, { municipality: l.municipality, department: l.department, longitude: Number(l.longitude), latitude: Number(l.latitude), projects: new Map(), interventions: [] }); const row = map.get(key); row.projects.set(l.project_id, { id: l.project_id, acronym: l.project_acronym }); row.interventions.push(l.intervention_type); }); return [...map.values()].map((row) => ({ ...row, projects: [...row.projects.values()], project_count: row.projects.size })).sort((a, b) => b.project_count - a.project_count); }, [filtered]);
  useEffect(() => {
    if (!node.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: node.current, style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", center: [-86.6, 14.65], zoom: 6.1, minZoom: 5.4 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("municipios", { type: "geojson", data: boundaryUrl });
      map.addLayer({ id: "municipios-fill", type: "fill", source: "municipios", paint: { "fill-color": "#11202B", "fill-opacity": 0.18 } });
      map.addLayer({ id: "municipios-line", type: "line", source: "municipios", paint: { "line-color": "rgba(158,185,202,.38)", "line-width": 0.55 } });
      map.addSource("intervenciones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "intervenciones-halo", type: "circle", source: "intervenciones", paint: { "circle-radius": ["+", ["*", ["get", "project_count"], 7], 12], "circle-color": "rgba(105,207,216,.13)", "circle-stroke-color": "rgba(105,207,216,.4)", "circle-stroke-width": 1 } });
      map.addLayer({ id: "intervenciones", type: "circle", source: "intervenciones", paint: { "circle-radius": ["+", ["*", ["get", "project_count"], 2.5], 5], "circle-color": ["step", ["get", "project_count"], "#72D6C9", 2, "#E5B86B", 3, "#E77C7C"], "circle-stroke-color": "#EAF3F7", "circle-stroke-width": 1.2 } });
      map.addLayer({ id: "intervenciones-label", type: "symbol", source: "intervenciones", layout: { "text-field": ["to-string", ["get", "project_count"]], "text-size": 11 }, paint: { "text-color": "#071018" } });
      map.on("click", "intervenciones", (e) => setSelected(e.features?.[0]?.properties || null));
      map.on("mouseenter", "intervenciones", () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", "intervenciones", () => { map.getCanvas().style.cursor = ""; });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => { const source = mapRef.current?.getSource("intervenciones"); if (!source) return; source.setData({ type: "FeatureCollection", features: municipalities.map((m) => ({ type: "Feature", geometry: { type: "Point", coordinates: [m.longitude, m.latitude] }, properties: { municipality: m.municipality, department: m.department, project_count: m.project_count, projects: m.projects.map((p) => p.acronym).join(", ") } })) }); }, [municipalities]);
  return <div className="page-stack geo-page"><section className="page-heading"><div><span className="eyebrow">TERRITORIAL INTELLIGENCE</span><h1>Geoportal de intervenciones</h1><p>Visualice presencia, convergencias y cobertura programática en Honduras.</p></div><div className="geo-count"><MapPinned size={18}/><strong>{municipalities.length}</strong><span>municipios visibles</span></div></section>
    <section className="geo-layout"><aside className="geo-sidebar"><div className="geo-filter-title"><Layers3 size={17}/><strong>Capas y filtros</strong></div><label className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Municipio o proyecto"/></label><label className="field"><span>Área programática</span><select value={area} onChange={(e) => setArea(e.target.value)}><option value="all">Todas</option>{areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}</select></label><label className="field"><span>Proyecto</span><select value={project} onChange={(e) => setProject(e.target.value)}><option value="all">Todos</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.acronym}</option>)}</select></label><div className="legend"><strong>Convergencia</strong><span><i className="dot dot--one"/> 1 proyecto</span><span><i className="dot dot--two"/> 2 proyectos</span><span><i className="dot dot--three"/> 3 o más</span></div><div className="convergence-list"><div className="geo-filter-title"><LocateFixed size={16}/><strong>Mayor convergencia</strong></div>{municipalities.slice(0, 7).map((m) => <button key={`${m.department}-${m.municipality}`} onClick={() => { setSelected({ municipality: m.municipality, department: m.department, project_count: m.project_count, projects: m.projects.map((p) => p.acronym).join(", ") }); mapRef.current?.flyTo({ center: [m.longitude, m.latitude], zoom: 8.7 }); }}><span>{m.municipality}<small>{m.department}</small></span><strong>{m.project_count}</strong></button>)}</div></aside><div className="map-stage"><div ref={node} className="map-canvas"/><div className="map-note">Los círculos representan proyectos distintos. La cifra presupuestaria del proyecto no se interpreta como inversión municipal.</div>{selected && <div className="map-detail"><button onClick={() => setSelected(null)}>×</button><span className="eyebrow">MUNICIPIO</span><h3>{selected.municipality}</h3><p>{selected.department}</p><div><strong>{selected.project_count}</strong><span>proyectos coincidentes</span></div><p>{selected.projects}</p>{selected.project_count === 1 && <Link href={`/project?id=${municipalities.find((m) => m.municipality === selected.municipality)?.projects[0]?.id || ""}`}>Abrir proyecto <ArrowUpRight size={15}/></Link>}</div>}</div></section>
  </div>;
}
