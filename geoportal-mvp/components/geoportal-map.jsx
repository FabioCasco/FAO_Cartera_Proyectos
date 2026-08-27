"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  ArrowUpRight,
  Layers3,
  LocateFixed,
  MapPinned,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { getAreas, getLocations, getProjects } from "@/lib/data";

const HONDURAS_BOUNDS = [
  [-89.4, 12.85],
  [-82.95, 16.65],
];

const rasterStyle = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors · © CARTO · límites geoBoundaries CC BY 4.0",
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

function markerTone(projectCount) {
  if (projectCount >= 3) return "three";
  if (projectCount === 2) return "two";
  return "one";
}

function TerritorialFallback({ municipalities, onSelect }) {
  const minLon = -89.4;
  const maxLon = -82.95;
  const minLat = 12.85;
  const maxLat = 16.65;

  return (
    <div className="fallback-map" role="img" aria-label="Vista territorial de respaldo">
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none">
        <defs>
          <radialGradient id="fallbackGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#153240" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#071016" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="600" fill="#081017" />
        <rect width="1000" height="600" fill="url(#fallbackGlow)" />
        <path
          d="M118 332 L168 244 L276 192 L391 170 L472 130 L594 159 L676 211 L792 184 L895 247 L867 326 L779 356 L718 432 L596 411 L493 459 L379 426 L275 474 L181 418 Z"
          fill="#10212B"
          stroke="#426274"
          strokeWidth="2"
          opacity="0.9"
        />
        {municipalities.map((municipality) => {
          const x =
            ((municipality.longitude - minLon) / (maxLon - minLon)) * 760 +
            120;
          const y =
            ((maxLat - municipality.latitude) / (maxLat - minLat)) * 390 +
            105;
          const tone = markerTone(municipality.project_count);
          return (
            <g
              className={`fallback-marker fallback-marker--${tone}`}
              key={`${municipality.department}-${municipality.municipality}`}
              onClick={() => onSelect(municipality)}
              role="button"
              tabIndex="0"
            >
              <circle cx={x} cy={y} r={18 + municipality.project_count * 3} />
              <text x={x} y={y + 4} textAnchor="middle">
                {municipality.project_count}
              </text>
              <title>
                {municipality.municipality}: {municipality.project_count} proyecto(s)
              </title>
            </g>
          );
        })}
      </svg>
      <div className="fallback-map-label">
        Vista territorial de respaldo · las coordenadas continúan operativas
      </div>
    </div>
  );
}

export function GeoportalMap() {
  const node = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const resizeObserverRef = useRef(null);
  const mapLoadedRef = useRef(false);

  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState("all");
  const [project, setProject] = useState("all");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapMessage, setMapMessage] = useState("Inicializando mapa…");

  useEffect(() => {
    let active = true;
    Promise.all([getLocations(), getProjects(), getAreas()])
      .then(([locationRows, projectRows, areaRows]) => {
        if (!active) return;
        setLocations(locationRows);
        setProjects(projectRows);
        setAreas(areaRows);
      })
      .catch((error) => {
        if (active) {
          setDataError(
            error.message || "No fue posible cargar los datos territoriales.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      locations.filter(
        (location) =>
          (area === "all" || location.area_slug === area) &&
          (project === "all" || location.project_id === project) &&
          (!query ||
            `${location.municipality} ${location.department} ${location.project_acronym}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [locations, area, project, query],
  );

  const municipalities = useMemo(() => {
    const grouped = new Map();

    filtered.forEach((location) => {
      const longitude = Number(location.longitude);
      const latitude = Number(location.latitude);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;

      const key = `${location.department}|${location.municipality}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          municipality: location.municipality || location.location_name,
          department: location.department,
          longitude,
          latitude,
          projects: new Map(),
          interventions: [],
        });
      }

      const row = grouped.get(key);
      row.projects.set(location.project_id, {
        id: location.project_id,
        acronym: location.project_acronym,
      });
      if (location.intervention_type) {
        row.interventions.push(location.intervention_type);
      }
    });

    return [...grouped.values()]
      .map((row) => ({
        ...row,
        projects: [...row.projects.values()],
        project_count: row.projects.size,
      }))
      .sort((first, second) => second.project_count - first.project_count);
  }, [filtered]);

  useEffect(() => {
    if (!node.current || mapRef.current) return;

    if (!maplibregl.supported()) {
      const fallbackTimer = window.setTimeout(() => {
        setMapStatus("fallback");
        setMapMessage(
          "El navegador no habilitó WebGL. Se muestra una vista territorial de respaldo.",
        );
      }, 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    let map;
    let timeout;

    try {
      map = new maplibregl.Map({
        container: node.current,
        style: rasterStyle,
        center: [-86.6, 14.65],
        zoom: 6.15,
        minZoom: 5.3,
        maxZoom: 15,
        attributionControl: true,
      });

      mapRef.current = map;
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      timeout = window.setTimeout(() => {
        if (!mapLoadedRef.current) {
          map.remove();
          mapRef.current = null;
          setMapReady(false);
          setMapStatus("fallback");
          setMapMessage(
            "El mapa interactivo tardó demasiado en responder. Se activó la vista de respaldo.",
          );
        }
      }, 12000);

      map.on("load", () => {
        mapLoadedRef.current = true;
        window.clearTimeout(timeout);
        setMapReady(true);
        setMapStatus("ready");
        setMapMessage("Mapa interactivo disponible");
        map.fitBounds(HONDURAS_BOUNDS, { padding: 34, duration: 0 });
        window.setTimeout(() => map.resize(), 0);

        fetch("https://www.geoboundaries.org/api/current/gbOpen/HND/ADM2/")
          .then((response) => {
            if (!response.ok) throw new Error("Metadata municipal no disponible");
            return response.json();
          })
          .then((metadata) => fetch(metadata.simplifiedGeometryGeoJSON))
          .then((response) => {
            if (!response.ok) throw new Error("Límites municipales no disponibles");
            return response.json();
          })
          .then((geojson) => {
            if (!mapRef.current || mapRef.current.getSource("municipios")) return;
            mapRef.current.addSource("municipios", {
              type: "geojson",
              data: geojson,
            });
            mapRef.current.addLayer({
              id: "municipios-fill",
              type: "fill",
              source: "municipios",
              paint: {
                "fill-color": "#14303E",
                "fill-opacity": 0.12,
              },
            });
            mapRef.current.addLayer({
              id: "municipios-line",
              type: "line",
              source: "municipios",
              paint: {
                "line-color": "rgba(178,211,226,.46)",
                "line-width": 0.7,
              },
            });
          })
          .catch(() => {
            setMapMessage(
              "Mapa y puntos disponibles; la capa municipal externa no respondió.",
            );
          });
      });

      map.on("error", (event) => {
        const message = event?.error?.message || "Error cartográfico no especificado";
        if (!mapLoadedRef.current) {
          setMapMessage(`Cargando mapa: ${message}`);
        }
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserverRef.current = new ResizeObserver(() => {
          mapRef.current?.resize();
        });
        resizeObserverRef.current.observe(node.current);
      }
    } catch (error) {
      const startupError =
        error instanceof Error ? error.message : String(error);
      window.setTimeout(() => {
        setMapStatus("fallback");
        setMapMessage(
          `No fue posible iniciar MapLibre: ${startupError}. Se muestra la vista de respaldo.`,
        );
      }, 0);
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
      resizeObserverRef.current?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
      }
      mapLoadedRef.current = false;
    };
  }, [retryToken]);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!mapReady || !mapRef.current) return;

    municipalities.forEach((municipality) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = `geo-dom-marker geo-dom-marker--${markerTone(
        municipality.project_count,
      )}`;
      element.textContent = String(municipality.project_count);
      element.title = `${municipality.municipality}: ${municipality.project_count} proyecto(s)`;
      element.setAttribute(
        "aria-label",
        `${municipality.municipality}, ${municipality.project_count} proyecto(s)`,
      );
      element.addEventListener("click", () => setSelected(municipality));

      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([municipality.longitude, municipality.latitude])
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [mapReady, municipalities]);

  function focusMunicipality(municipality) {
    setSelected(municipality);
    if (mapRef.current && mapReady) {
      mapRef.current.flyTo({
        center: [municipality.longitude, municipality.latitude],
        zoom: 8.7,
        essential: true,
      });
    }
  }

  function retryMap() {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    resizeObserverRef.current?.disconnect();
    mapRef.current?.remove();
    mapRef.current = null;
    mapLoadedRef.current = false;
    setMapReady(false);
    setMapStatus("loading");
    setMapMessage("Reiniciando mapa…");
    setRetryToken((value) => value + 1);
  }

  return (
    <div className="page-stack geo-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">TERRITORIAL INTELLIGENCE</span>
          <h1>Geoportal de intervenciones</h1>
          <p>
            Visualice presencia, convergencias y cobertura programática en
            Honduras.
          </p>
        </div>
        <div className="geo-count">
          <MapPinned size={18} />
          <strong>{municipalities.length}</strong>
          <span>municipios visibles</span>
        </div>
      </section>

      {dataError && <div className="form-error operational-error">{dataError}</div>}

      <section className="geo-layout">
        <aside className="geo-sidebar">
          <div className="geo-filter-title">
            <Layers3 size={17} />
            <strong>Capas y filtros</strong>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Municipio o proyecto"
            />
          </label>
          <label className="field">
            <span>Área programática</span>
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option value="all">Todas</option>
              {areas.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Proyecto</span>
            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="all">Todos</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.acronym || item.code}
                </option>
              ))}
            </select>
          </label>

          <div className="legend">
            <strong>Convergencia</strong>
            <span>
              <i className="dot dot--one" /> 1 proyecto
            </span>
            <span>
              <i className="dot dot--two" /> 2 proyectos
            </span>
            <span>
              <i className="dot dot--three" /> 3 o más
            </span>
          </div>

          <div className="convergence-list">
            <div className="geo-filter-title">
              <LocateFixed size={16} />
              <strong>Mayor convergencia</strong>
            </div>
            {municipalities.slice(0, 9).map((municipality) => (
              <button
                key={`${municipality.department}-${municipality.municipality}`}
                onClick={() => focusMunicipality(municipality)}
                type="button"
              >
                <span>
                  {municipality.municipality}
                  <small>{municipality.department}</small>
                </span>
                <strong>{municipality.project_count}</strong>
              </button>
            ))}
          </div>
        </aside>

        <div className="map-stage">
          {mapStatus !== "fallback" && <div ref={node} className="map-canvas" />}
          {mapStatus === "fallback" && (
            <TerritorialFallback
              municipalities={municipalities}
              onSelect={focusMunicipality}
            />
          )}

          <div className={`map-health map-health--${mapStatus}`}>
            {mapStatus === "loading" && <RefreshCw className="spin" size={14} />}
            {mapStatus === "fallback" && <TriangleAlert size={14} />}
            {mapStatus === "ready" && <span className="status-dot" />}
            <span>{loadingData ? "Cargando datos territoriales…" : mapMessage}</span>
            {mapStatus === "fallback" && (
              <button onClick={retryMap} type="button">
                Reintentar mapa
              </button>
            )}
          </div>

          <div className="map-note">
            Los círculos representan proyectos distintos. La cifra
            presupuestaria del proyecto no se interpreta como inversión
            municipal.
          </div>

          {selected && (
            <div className="map-detail">
              <button onClick={() => setSelected(null)} type="button">
                ×
              </button>
              <span className="eyebrow">MUNICIPIO</span>
              <h3>{selected.municipality}</h3>
              <p>{selected.department}</p>
              <div>
                <strong>{selected.project_count}</strong>
                <span>proyectos coincidentes</span>
              </div>
              <p>
                {selected.projects.map((item) => item.acronym).join(", ")}
              </p>
              {selected.interventions?.length > 0 && (
                <small>{[...new Set(selected.interventions)].join(" · ")}</small>
              )}
              {selected.project_count === 1 && (
                <Link href={`/project?id=${selected.projects[0]?.id || ""}`}>
                  Abrir proyecto <ArrowUpRight size={15} />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
