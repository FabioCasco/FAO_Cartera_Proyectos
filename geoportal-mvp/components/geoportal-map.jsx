"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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

const LEAFLET_JS =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS =
  "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const HONDURAS_BOUNDS = [
  [12.85, -89.4],
  [16.65, -82.95],
];
const MUNICIPAL_METADATA_URL =
  "https://www.geoboundaries.org/api/current/gbOpen/HND/ADM2/";

let leafletLoader = null;

function loadLeaflet() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("El mapa requiere un navegador."));
  }
  if (window.L?.map) return Promise.resolve(window.L);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = LEAFLET_CSS;
      stylesheet.crossOrigin = "anonymous";
      document.head.appendChild(stylesheet);
    }

    const finish = () => {
      if (window.L?.map) {
        resolve(window.L);
      } else {
        leafletLoader = null;
        reject(new Error("Leaflet no quedó disponible después de cargar."));
      }
    };

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => {
          leafletLoader = null;
          reject(new Error("No fue posible cargar el motor cartográfico."));
        },
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
      () => {
        leafletLoader = null;
        reject(new Error("No fue posible cargar el motor cartográfico."));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return leafletLoader;
}

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
    <div
      aria-label="Vista territorial de respaldo"
      className="fallback-map"
      role="img"
    >
      <svg preserveAspectRatio="none" viewBox="0 0 1000 600">
        <defs>
          <radialGradient id="fallbackGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#153240" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#071016" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect fill="#081017" height="600" width="1000" />
        <rect fill="url(#fallbackGlow)" height="600" width="1000" />
        <path
          d="M118 332 L168 244 L276 192 L391 170 L472 130 L594 159 L676 211 L792 184 L895 247 L867 326 L779 356 L718 432 L596 411 L493 459 L379 426 L275 474 L181 418 Z"
          fill="#10212B"
          opacity="0.9"
          stroke="#426274"
          strokeWidth="2"
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
              <text textAnchor="middle" x={x} y={y + 4}>
                {municipality.project_count}
              </text>
              <title>
                {municipality.municipality}: {municipality.project_count}{" "}
                proyecto(s)
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
  const leafletRef = useRef(null);
  const markerLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [areas, setAreas] = useState([]);
  const [area, setArea] = useState("all");
  const [project, setProject] = useState("all");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapMessage, setMapMessage] = useState("Inicializando mapa seguro…");
  const [retryToken, setRetryToken] = useState(0);

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
    let active = true;
    let map = null;

    loadLeaflet()
      .then((L) => {
        if (!active || !node.current) return;

        leafletRef.current = L;
        map = L.map(node.current, {
          attributionControl: true,
          preferCanvas: false,
          zoomControl: true,
          zoomSnap: 0.25,
        });
        mapRef.current = map;
        map.fitBounds(HONDURAS_BOUNDS, { padding: [22, 22] });

        const tiles = L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "© OpenStreetMap contributors · © CARTO",
            maxZoom: 19,
            subdomains: "abcd",
          },
        );
        tiles.addTo(map);
        tiles.on("tileerror", () => {
          if (active) {
            setMapMessage(
              "Los puntos están disponibles; algunas teselas del mapa base no respondieron.",
            );
          }
        });

        markerLayerRef.current = L.layerGroup().addTo(map);
        setMapStatus("ready");
        setMapMessage("Mapa interactivo disponible");
        window.setTimeout(() => map?.invalidateSize(), 0);

        fetch(MUNICIPAL_METADATA_URL)
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
            if (!active || !mapRef.current) return;
            boundaryLayerRef.current?.remove();
            boundaryLayerRef.current = L.geoJSON(geojson, {
              interactive: false,
              style: {
                color: "rgba(178,211,226,.46)",
                fillColor: "#14303E",
                fillOpacity: 0.1,
                weight: 0.65,
              },
            }).addTo(mapRef.current);
            boundaryLayerRef.current.bringToBack();
          })
          .catch(() => {
            if (active) {
              setMapMessage(
                "Mapa y puntos disponibles; la capa municipal externa no respondió.",
              );
            }
          });
      })
      .catch((error) => {
        if (!active) return;
        setMapStatus("fallback");
        setMapMessage(
          `${error.message || "No fue posible cargar el mapa"} Se muestra la vista territorial de respaldo.`,
        );
      });

    return () => {
      active = false;
      boundaryLayerRef.current?.remove();
      boundaryLayerRef.current = null;
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [retryToken]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!L || !layer || !mapRef.current || mapStatus !== "ready") return;

    layer.clearLayers();
    municipalities.forEach((municipality) => {
      const tone = markerTone(municipality.project_count);
      const size = 28 + Math.min(3, municipality.project_count) * 4;
      const marker = L.marker(
        [municipality.latitude, municipality.longitude],
        {
          icon: L.divIcon({
            className: "leaflet-marker-shell",
            html: `<span class="leaflet-project-marker leaflet-project-marker--${tone}">${municipality.project_count}</span>`,
            iconAnchor: [size / 2, size / 2],
            iconSize: [size, size],
          }),
          keyboard: true,
          title: `${municipality.municipality}: ${municipality.project_count} proyecto(s)`,
        },
      );
      marker.on("click", () => setSelected(municipality));
      marker.bindTooltip(
        `<strong>${municipality.municipality}</strong><br>${municipality.project_count} proyecto(s)`,
        { direction: "top", offset: [0, -14] },
      );
      marker.addTo(layer);
    });
  }, [mapStatus, municipalities]);

  function focusMunicipality(municipality) {
    setSelected(municipality);
    if (mapRef.current && mapStatus === "ready") {
      mapRef.current.flyTo(
        [municipality.latitude, municipality.longitude],
        9,
        { duration: 0.8 },
      );
    }
  }

  function retryMap() {
    boundaryLayerRef.current?.remove();
    boundaryLayerRef.current = null;
    markerLayerRef.current?.clearLayers();
    markerLayerRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;
    leafletRef.current = null;
    setMapStatus("loading");
    setMapMessage("Reiniciando mapa seguro…");
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Municipio o proyecto"
              value={query}
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
              onChange={(event) => setProject(event.target.value)}
              value={project}
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
          {mapStatus !== "fallback" && (
            <div className="map-canvas leaflet-map-canvas" ref={node} />
          )}
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
