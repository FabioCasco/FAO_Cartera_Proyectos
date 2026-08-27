"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  CircleDot,
  Layers3,
  Map as MapIcon,
  MapPinned,
  RefreshCw,
  Search,
  Shapes,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  getGeoportalSnapshot,
  loadHondurasBoundaries,
} from "@/lib/geoportal-data";
import { money, percent, statusLabel } from "@/lib/format";

const LEAFLET_JS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";
const HONDURAS_BOUNDS = [
  [12.85, -89.4],
  [16.65, -82.95],
];

const DEPARTMENT_ALIASES = {
  bayislands: "islasdelabahia",
  islasdelabahia: "islasdelabahia",
};

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

function geoKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function departmentKey(value) {
  const normalized = geoKey(value);
  return DEPARTMENT_ALIASES[normalized] || normalized;
}

function municipalityJoinKey(department, municipality) {
  return `${departmentKey(department)}|${geoKey(municipality)}`;
}

function markerTone(projectCount) {
  if (projectCount >= 3) return "three";
  if (projectCount === 2) return "two";
  return "one";
}

function coverageColor(projectCount) {
  if (projectCount >= 4) return "#e77c7c";
  if (projectCount === 3) return "#ba8cf0";
  if (projectCount === 2) return "#e5b86b";
  if (projectCount === 1) return "#69cfd8";
  return "#15232d";
}

function projectFromPresence(row) {
  return {
    id: row.project_id,
    code: row.project_code,
    acronym: row.project_acronym || row.project_code,
    title: row.project_title,
    summary: row.project_summary,
    status: row.project_status,
    donor: row.donor,
    coordinator: row.coordinator,
    start_date: row.start_date,
    end_date: row.end_date,
    currency: row.currency,
    budget_total: Number(row.budget_total || 0),
    spent: Number(row.spent || 0),
    commitments: Number(row.commitments || 0),
    execution_pct: Number(row.execution_pct || 0),
    utilization_pct: Number(row.utilization_pct || 0),
    physical_progress_pct: Number(row.physical_progress_pct || 0),
    area_id: row.area_id,
    area_slug: row.area_slug,
    area_name: row.area_name,
    area_short_name: row.area_short_name,
    area_accent: row.area_accent || "#69cfd8",
  };
}

function addProject(target, project) {
  if (!target.projects.has(project.id)) {
    target.projects.set(project.id, project);
  }
}

function finalizeGroup(group) {
  const projects = [...group.projects.values()].sort((first, second) =>
    (first.acronym || first.title).localeCompare(second.acronym || second.title),
  );
  const projectCount = projects.length;
  const latitude = group.pointCount ? group.latitudeSum / group.pointCount : null;
  const longitude = group.pointCount ? group.longitudeSum / group.pointCount : null;
  return {
    ...group,
    projects,
    project_count: projectCount,
    area_count: new Set(projects.map((item) => item.area_slug).filter(Boolean)).size,
    latitude,
    longitude,
    interventions: [...group.interventions].filter(Boolean),
  };
}

function aggregatePresence(rows, boundaryLookup) {
  const areas = new Map();
  const departments = new Map();
  const municipalities = new Map();

  for (const row of rows) {
    const project = projectFromPresence(row);
    const deptKey = departmentKey(row.department);
    const munKey = municipalityJoinKey(row.department, row.municipality);
    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);

    const areaKey = row.area_slug || "sin-area";
    if (!areas.has(areaKey)) {
      areas.set(areaKey, {
        key: areaKey,
        name: row.area_name || "Sin área",
        short_name: row.area_short_name || "Sin área",
        accent: row.area_accent || "#7d8d99",
        projects: new Map(),
        departments: new Set(),
        municipalities: new Set(),
      });
    }
    const areaGroup = areas.get(areaKey);
    addProject(areaGroup, project);
    if (deptKey) areaGroup.departments.add(deptKey);
    if (row.municipality) areaGroup.municipalities.add(munKey);

    if (deptKey) {
      if (!departments.has(deptKey)) {
        const feature = boundaryLookup.departments.get(deptKey) || null;
        departments.set(deptKey, {
          key: deptKey,
          entity_type: "department",
          name: row.department || feature?.properties?.department || "Departamento",
          department: row.department || feature?.properties?.department || "",
          feature,
          projects: new Map(),
          municipalities: new Set(),
          interventions: new Set(),
          latitudeSum: 0,
          longitudeSum: 0,
          pointCount: 0,
        });
      }
      const department = departments.get(deptKey);
      addProject(department, project);
      if (row.municipality) department.municipalities.add(munKey);
      if (row.intervention_type) department.interventions.add(row.intervention_type);
      if (hasPoint) {
        department.latitudeSum += latitude;
        department.longitudeSum += longitude;
        department.pointCount += 1;
      }
    }

    if (row.municipality) {
      if (!municipalities.has(munKey)) {
        const feature = boundaryLookup.municipalities.get(munKey) || null;
        municipalities.set(munKey, {
          key: munKey,
          entity_type: "municipality",
          name: row.municipality || feature?.properties?.municipality || "Municipio",
          department: row.department || feature?.properties?.department || "",
          feature,
          projects: new Map(),
          interventions: new Set(),
          latitudeSum: 0,
          longitudeSum: 0,
          pointCount: 0,
        });
      }
      const municipality = municipalities.get(munKey);
      addProject(municipality, project);
      if (row.intervention_type) municipality.interventions.add(row.intervention_type);
      if (hasPoint) {
        municipality.latitudeSum += latitude;
        municipality.longitudeSum += longitude;
        municipality.pointCount += 1;
      }
    }
  }

  const areaRows = [...areas.values()]
    .map((item) => ({
      ...item,
      projects: [...item.projects.values()],
      project_count: item.projects.size,
      department_count: item.departments.size,
      municipality_count: item.municipalities.size,
    }))
    .sort((first, second) => second.project_count - first.project_count);

  const departmentRows = [...departments.values()]
    .map((item) => ({
      ...finalizeGroup(item),
      municipality_count: item.municipalities.size,
    }))
    .sort((first, second) =>
      second.project_count === first.project_count
        ? first.name.localeCompare(second.name)
        : second.project_count - first.project_count,
    );

  const municipalityRows = [...municipalities.values()]
    .map(finalizeGroup)
    .sort((first, second) =>
      second.project_count === first.project_count
        ? first.name.localeCompare(second.name)
        : second.project_count - first.project_count,
    );

  return { areas: areaRows, departments: departmentRows, municipalities: municipalityRows };
}

function createTooltipNode(entity) {
  const root = document.createElement("div");
  root.className = "geo-tooltip-card";

  const eyebrow = document.createElement("span");
  eyebrow.textContent = entity.entity_type === "department" ? "DEPARTAMENTO" : "MUNICIPIO";
  root.appendChild(eyebrow);

  const title = document.createElement("strong");
  title.textContent = entity.name;
  root.appendChild(title);

  if (entity.entity_type === "municipality" && entity.department) {
    const subtitle = document.createElement("small");
    subtitle.textContent = entity.department;
    root.appendChild(subtitle);
  }

  const count = document.createElement("b");
  count.textContent = `${entity.project_count} proyecto${entity.project_count === 1 ? "" : "s"}`;
  root.appendChild(count);

  const names = document.createElement("p");
  names.textContent = entity.projects
    .slice(0, 4)
    .map((projectItem) => projectItem.acronym || projectItem.title)
    .join(" · ");
  root.appendChild(names);

  return root;
}

function entityPosition(entity) {
  const properties = entity.feature?.properties || {};
  const latitude = Number(properties.centroid_lat ?? entity.latitude);
  const longitude = Number(properties.centroid_lon ?? entity.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
}

function TerritorialFallback({ municipalities, onSelect }) {
  const minLon = -89.4;
  const maxLon = -82.95;
  const minLat = 12.85;
  const maxLat = 16.65;

  return (
    <div aria-label="Vista territorial de respaldo" className="fallback-map" role="img">
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
          const position = entityPosition(municipality);
          if (!position) return null;
          const [latitude, longitude] = position;
          const x = ((longitude - minLon) / (maxLon - minLon)) * 760 + 120;
          const y = ((maxLat - latitude) / (maxLat - minLat)) * 390 + 105;
          const tone = markerTone(municipality.project_count);
          return (
            <g
              className={`fallback-marker fallback-marker--${tone}`}
              key={municipality.key}
              onClick={() => onSelect(municipality)}
              role="button"
              tabIndex="0"
            >
              <circle cx={x} cy={y} r={18 + municipality.project_count * 3} />
              <text textAnchor="middle" x={x} y={y + 4}>
                {municipality.project_count}
              </text>
              <title>
                {municipality.name}: {municipality.project_count} proyecto(s)
              </title>
            </g>
          );
        })}
      </svg>
      <div className="fallback-map-label">
        Vista territorial de respaldo · la información de cartera continúa disponible
      </div>
    </div>
  );
}

function EntityInspector({ entity, onClose }) {
  if (!entity) return null;

  return (
    <aside className="geo-inspector">
      <button aria-label="Cerrar detalle" className="geo-inspector-close" onClick={onClose} type="button">
        <X size={17} />
      </button>
      <span className="eyebrow">
        {entity.entity_type === "department" ? "DEPARTAMENTO" : "MUNICIPIO"}
      </span>
      <h2>{entity.name}</h2>
      {entity.entity_type === "municipality" && <p>{entity.department}</p>}

      <div className="geo-inspector-metrics">
        <div>
          <strong>{entity.project_count}</strong>
          <span>proyectos</span>
        </div>
        <div>
          <strong>{entity.area_count}</strong>
          <span>áreas</span>
        </div>
        {entity.entity_type === "department" && (
          <div>
            <strong>{entity.municipality_count || 0}</strong>
            <span>municipios</span>
          </div>
        )}
      </div>

      {entity.interventions?.length > 0 && (
        <div className="geo-inspector-interventions">
          <span>Intervenciones registradas</span>
          <p>{entity.interventions.join(" · ")}</p>
        </div>
      )}

      <div className="geo-inspector-projects">
        {entity.projects.map((projectItem) => (
          <article key={projectItem.id} style={{ "--project-accent": projectItem.area_accent }}>
            <div className="geo-inspector-project-head">
              <div>
                <span>{projectItem.area_short_name || projectItem.area_name}</span>
                <h3>{projectItem.acronym || projectItem.title}</h3>
              </div>
              <span className={`status status--${projectItem.status}`}>
                {statusLabel[projectItem.status] || projectItem.status}
              </span>
            </div>
            <p>{projectItem.title}</p>
            <dl>
              <div>
                <dt>Presupuesto</dt>
                <dd>{money(projectItem.budget_total)}</dd>
              </div>
              <div>
                <dt>Ejecución</dt>
                <dd>{percent(projectItem.execution_pct)}</dd>
              </div>
              <div>
                <dt>Avance</dt>
                <dd>{percent(projectItem.physical_progress_pct)}</dd>
              </div>
            </dl>
            {projectItem.donor && <small>Donante: {projectItem.donor}</small>}
            <Link href={`/project?id=${projectItem.id}`}>
              Abrir ficha 360° <ArrowUpRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </aside>
  );
}

export function GeoportalMap() {
  const node = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const baseLayersRef = useRef(null);
  const overlayLayersRef = useRef({});
  const layerControlRef = useRef(null);

  const [snapshot, setSnapshot] = useState({
    presence: [],
    areas: [],
    departments: [],
    municipalities: [],
  });
  const [boundaries, setBoundaries] = useState(null);
  const [area, setArea] = useState("all");
  const [project, setProject] = useState("all");
  const [query, setQuery] = useState("");
  const [analysisMode, setAnalysisMode] = useState("municipalities");
  const [summaryTab, setSummaryTab] = useState("areas");
  const [selected, setSelected] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");
  const [boundaryError, setBoundaryError] = useState("");
  const [mapStatus, setMapStatus] = useState("loading");
  const [mapMessage, setMapMessage] = useState("Inicializando geoportal…");
  const [mapReady, setMapReady] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getGeoportalSnapshot(), loadHondurasBoundaries()]).then(
      ([snapshotResult, boundaryResult]) => {
        if (!active) return;

        if (snapshotResult.status === "fulfilled") {
          setSnapshot(snapshotResult.value);
        } else {
          setDataError(
            snapshotResult.reason?.message ||
              "No fue posible cargar la información territorial de Supabase.",
          );
        }

        if (boundaryResult.status === "fulfilled") {
          setBoundaries(boundaryResult.value);
        } else {
          setBoundaryError(
            boundaryResult.reason?.message ||
              "No fue posible cargar los límites administrativos locales.",
          );
        }

        setLoadingData(false);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const boundaryLookup = useMemo(() => {
    const departments = new Map();
    const municipalities = new Map();

    for (const feature of boundaries?.departments?.features || []) {
      const key = departmentKey(feature.properties?.department);
      departments.set(key, feature);
    }

    for (const feature of boundaries?.municipalities?.features || []) {
      const key = municipalityJoinKey(
        feature.properties?.department,
        feature.properties?.municipality,
      );
      municipalities.set(key, feature);
    }

    return { departments, municipalities };
  }, [boundaries]);

  const projectOptions = useMemo(() => {
    const projects = new Map();
    for (const row of snapshot.presence) {
      projects.set(row.project_id, projectFromPresence(row));
    }
    return [...projects.values()].sort((first, second) =>
      (first.acronym || first.title).localeCompare(second.acronym || second.title),
    );
  }, [snapshot.presence]);

  const filteredPresence = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.presence.filter((row) => {
      const matchesArea = area === "all" || row.area_slug === area;
      const matchesProject = project === "all" || row.project_id === project;
      const haystack = [
        row.project_code,
        row.project_acronym,
        row.project_title,
        row.area_name,
        row.department,
        row.municipality,
        row.intervention_type,
      ]
        .join(" ")
        .toLowerCase();
      return matchesArea && matchesProject && (!needle || haystack.includes(needle));
    });
  }, [snapshot.presence, area, project, query]);

  const aggregates = useMemo(
    () => aggregatePresence(filteredPresence, boundaryLookup),
    [filteredPresence, boundaryLookup],
  );

  const visibleProjectCount = useMemo(
    () => new Set(filteredPresence.map((row) => row.project_id)).size,
    [filteredPresence],
  );

  useEffect(() => {
    let active = true;
    let map = null;

    loadLeaflet()
      .then((L) => {
        if (!active || !node.current) return;

        leafletRef.current = L;
        map = L.map(node.current, {
          attributionControl: true,
          preferCanvas: true,
          zoomControl: true,
          zoomSnap: 0.25,
        });
        mapRef.current = map;
        map.fitBounds(HONDURAS_BOUNDS, { padding: [22, 22] });

        const darkTiles = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles © Esri",
            maxZoom: 16,
          },
        );
        const darkLabels = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Labels © Esri",
            maxZoom: 16,
          },
        );
        const dark = L.layerGroup([darkTiles, darkLabels]);

        const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
          subdomains: "abc",
        });

        const topographic = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Tiles © Esri",
            maxZoom: 18,
          },
        );

        const imagery = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Imagery © Esri and contributors",
            maxZoom: 18,
          },
        );
        const imageryLabels = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "Reference © Esri",
            maxZoom: 18,
          },
        );
        const satellite = L.layerGroup([imagery, imageryLabels]);

        baseLayersRef.current = {
          "Oscuro · Esri": dark,
          "Calles · OpenStreetMap": streets,
          "Topográfico · Esri": topographic,
          "Satélite · Esri": satellite,
        };

        let fallbackActivated = false;
        darkTiles.on("tileerror", () => {
          if (fallbackActivated || !mapRef.current) return;
          fallbackActivated = true;
          mapRef.current.removeLayer(dark);
          streets.addTo(mapRef.current);
          setMapMessage(
            "El mapa oscuro no respondió; se activó OpenStreetMap. Los límites y análisis continúan disponibles.",
          );
        });

        dark.addTo(map);
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
        setMapStatus("ready");
        setMapReady(true);
        setMapMessage("Mapas base sin clave y cartografía administrativa local disponibles");
        window.setTimeout(() => map?.invalidateSize(), 0);
      })
      .catch((error) => {
        if (!active) return;
        setMapStatus("fallback");
        setMapReady(false);
        setMapMessage(
          `${error.message || "No fue posible cargar el mapa"} Se muestra la vista territorial de respaldo.`,
        );
      });

    return () => {
      active = false;
      layerControlRef.current?.remove();
      layerControlRef.current = null;
      for (const layer of Object.values(overlayLayersRef.current)) {
        layer?.remove?.();
      }
      overlayLayersRef.current = {};
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
      baseLayersRef.current = null;
    };
  }, [retryToken]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !mapReady || !baseLayersRef.current) return undefined;

    layerControlRef.current?.remove();
    layerControlRef.current = null;
    for (const layer of Object.values(overlayLayersRef.current)) {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }

    const departmentMap = new Map(
      aggregates.departments.map((item) => [item.key, item]),
    );
    const municipalityMap = new Map(
      aggregates.municipalities.map((item) => [item.key, item]),
    );

    const departmentBorders = L.geoJSON(boundaries?.departments || null, {
      interactive: false,
      style: {
        color: "rgba(220,235,241,.72)",
        fillOpacity: 0,
        weight: 1.35,
      },
    });

    const municipalityBorders = L.geoJSON(boundaries?.municipalities || null, {
      interactive: false,
      style: {
        color: "rgba(165,190,203,.35)",
        fillOpacity: 0,
        weight: 0.55,
      },
    });

    const departmentCoverage = L.geoJSON(boundaries?.departments || null, {
      style: (feature) => {
        const key = departmentKey(feature?.properties?.department);
        const count = departmentMap.get(key)?.project_count || 0;
        return {
          color: count ? "rgba(226,239,244,.84)" : "rgba(130,151,164,.28)",
          fillColor: coverageColor(count),
          fillOpacity: count ? 0.52 : 0.025,
          weight: count ? 1.25 : 0.45,
        };
      },
      onEachFeature: (feature, layer) => {
        const key = departmentKey(feature?.properties?.department);
        const entity = departmentMap.get(key);
        if (!entity) return;
        layer.bindTooltip(createTooltipNode(entity), {
          direction: "top",
          sticky: true,
          className: "geo-leaflet-tooltip",
        });
        layer.on({
          click: () => setSelected(entity),
          mouseover: () => layer.setStyle({ weight: 2.2, fillOpacity: 0.7 }),
          mouseout: () => departmentCoverage.resetStyle(layer),
        });
      },
    });

    const municipalityCoverage = L.geoJSON(boundaries?.municipalities || null, {
      style: (feature) => {
        const key = municipalityJoinKey(
          feature?.properties?.department,
          feature?.properties?.municipality,
        );
        const count = municipalityMap.get(key)?.project_count || 0;
        return {
          color: count ? "rgba(229,241,245,.76)" : "rgba(123,145,158,.18)",
          fillColor: coverageColor(count),
          fillOpacity: count ? 0.58 : 0.015,
          weight: count ? 0.9 : 0.35,
        };
      },
      onEachFeature: (feature, layer) => {
        const key = municipalityJoinKey(
          feature?.properties?.department,
          feature?.properties?.municipality,
        );
        const entity = municipalityMap.get(key);
        if (!entity) return;
        layer.bindTooltip(createTooltipNode(entity), {
          direction: "top",
          sticky: true,
          className: "geo-leaflet-tooltip",
        });
        layer.on({
          click: () => setSelected(entity),
          mouseover: () => layer.setStyle({ weight: 1.8, fillOpacity: 0.78 }),
          mouseout: () => municipalityCoverage.resetStyle(layer),
        });
      },
    });

    const points = L.layerGroup();
    for (const entity of aggregates.municipalities) {
      const position = entityPosition(entity);
      if (!position) continue;
      const tone = markerTone(entity.project_count);
      const size = 28 + Math.min(4, entity.project_count) * 4;
      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "leaflet-marker-shell",
          html: `<span class="leaflet-project-marker leaflet-project-marker--${tone}">${entity.project_count}</span>`,
          iconAnchor: [size / 2, size / 2],
          iconSize: [size, size],
        }),
        keyboard: true,
        title: `${entity.name}: ${entity.project_count} proyecto(s)`,
      });
      marker.bindTooltip(createTooltipNode(entity), {
        direction: "top",
        offset: [0, -14],
        className: "geo-leaflet-tooltip",
      });
      marker.on("click", () => setSelected(entity));
      marker.addTo(points);
    }

    const overlays = {
      "Proyectos · puntos": points,
      "Cobertura municipal": municipalityCoverage,
      "Cobertura departamental": departmentCoverage,
      "Límites municipales": municipalityBorders,
      "Límites departamentales": departmentBorders,
    };

    departmentBorders.addTo(map);
    if (analysisMode === "points") {
      municipalityBorders.addTo(map);
      points.addTo(map);
    } else if (analysisMode === "departments") {
      departmentCoverage.addTo(map);
    } else {
      municipalityCoverage.addTo(map);
    }

    const control = L.control.layers(baseLayersRef.current, overlays, {
      collapsed: true,
      position: "topright",
      sortLayers: false,
    });
    control.addTo(map);
    const controlNode = control.getContainer();
    controlNode.title = "Cambiar mapa base y capas";
    controlNode.setAttribute("aria-label", "Cambiar mapa base y capas");

    overlayLayersRef.current = overlays;
    layerControlRef.current = control;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      control.remove();
      for (const layer of Object.values(overlays)) {
        if (map.hasLayer(layer)) map.removeLayer(layer);
      }
    };
  }, [aggregates, analysisMode, boundaries, mapReady]);

  function focusEntity(entity) {
    setSelected(entity);
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || mapStatus !== "ready") return;

    if (entity.feature) {
      const bounds = L.geoJSON(entity.feature).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 10 });
        return;
      }
    }

    const position = entityPosition(entity);
    if (position) map.flyTo(position, entity.entity_type === "department" ? 7.6 : 9.4);
  }

  function retryMap() {
    layerControlRef.current?.remove();
    layerControlRef.current = null;
    mapRef.current?.remove();
    mapRef.current = null;
    leafletRef.current = null;
    baseLayersRef.current = null;
    overlayLayersRef.current = {};
    setMapReady(false);
    setMapStatus("loading");
    setMapMessage("Reiniciando geoportal…");
    setRetryToken((value) => value + 1);
  }

  const topMetrics = [
    { label: "Proyectos", value: visibleProjectCount, icon: BriefcaseBusiness },
    { label: "Áreas", value: aggregates.areas.length, icon: BarChart3 },
    { label: "Departamentos", value: aggregates.departments.length, icon: Building2 },
    { label: "Municipios", value: aggregates.municipalities.length, icon: MapPinned },
  ];

  const summaryRows =
    summaryTab === "departments"
      ? aggregates.departments
      : summaryTab === "municipalities"
        ? aggregates.municipalities
        : aggregates.areas;

  return (
    <div className="page-stack geo-page geo-page-v2">
      <section className="page-heading geo-heading-v2">
        <div>
          <span className="eyebrow">TERRITORIAL INTELLIGENCE</span>
          <h1>Geoportal de intervenciones</h1>
          <p>
            Explore proyectos, áreas programáticas, convergencias y cobertura por
            departamento o municipio.
          </p>
        </div>
        <div className="geo-top-metrics">
          {topMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label}>
                <Icon size={15} />
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {dataError && <div className="form-error operational-error">{dataError}</div>}
      {boundaryError && (
        <div className="form-error operational-error">{boundaryError}</div>
      )}

      <section className="geo-layout geo-layout-v2">
        <aside className="geo-sidebar geo-sidebar-v2">
          <div className="geo-filter-title">
            <Layers3 size={17} />
            <strong>Capas y análisis</strong>
          </div>

          <div className="geo-sidebar-kpis">
            {topMetrics.map((metric) => (
              <div key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>

          <label className="search-box geo-search-box">
            <Search size={16} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Proyecto, área o territorio"
              value={query}
            />
          </label>

          <div className="geo-filter-grid">
            <label className="field">
              <span>Área programática</span>
              <select value={area} onChange={(event) => setArea(event.target.value)}>
                <option value="all">Todas las áreas</option>
                {snapshot.areas.map((item) => (
                  <option key={item.area_id} value={item.area_slug}>
                    {item.area_name}
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
                <option value="all">Todos los proyectos</option>
                {projectOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.acronym || item.code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="geo-analysis-mode">
            <span>Representación espacial</span>
            <div>
              <button
                className={analysisMode === "points" ? "active" : ""}
                onClick={() => setAnalysisMode("points")}
                type="button"
              >
                <CircleDot size={14} /> Puntos
              </button>
              <button
                className={analysisMode === "municipalities" ? "active" : ""}
                onClick={() => setAnalysisMode("municipalities")}
                type="button"
              >
                <Shapes size={14} /> Municipios
              </button>
              <button
                className={analysisMode === "departments" ? "active" : ""}
                onClick={() => setAnalysisMode("departments")}
                type="button"
              >
                <MapIcon size={14} /> Departamentos
              </button>
            </div>
          </div>

          <div className="legend geo-legend-v2">
            <strong>Proyectos coincidentes</strong>
            <span><i className="dot dot--one" /> 1 proyecto</span>
            <span><i className="dot dot--two" /> 2 proyectos</span>
            <span><i className="dot dot--three" /> 3 o más</span>
            <small>
              El sombreado representa presencia institucional, no asignación
              presupuestaria municipal o departamental.
            </small>
          </div>

          <div className="geo-summary-tabs">
            <button
              className={summaryTab === "areas" ? "active" : ""}
              onClick={() => setSummaryTab("areas")}
              type="button"
            >
              Áreas
            </button>
            <button
              className={summaryTab === "departments" ? "active" : ""}
              onClick={() => setSummaryTab("departments")}
              type="button"
            >
              Departamentos
            </button>
            <button
              className={summaryTab === "municipalities" ? "active" : ""}
              onClick={() => setSummaryTab("municipalities")}
              type="button"
            >
              Municipios
            </button>
          </div>

          <div className="geo-summary-list">
            {summaryRows.map((item) => {
              const isArea = summaryTab === "areas";
              const count = item.project_count;
              const maxCount = Math.max(
                1,
                ...summaryRows.map((row) => row.project_count || 0),
              );
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    if (isArea) {
                      setArea(item.key);
                    } else {
                      focusEntity(item);
                    }
                  }}
                  type="button"
                >
                  <span className="geo-summary-main">
                    {isArea && (
                      <i style={{ background: item.accent }} />
                    )}
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {isArea
                          ? `${item.department_count} dep. · ${item.municipality_count} mun.`
                          : summaryTab === "departments"
                            ? `${item.municipality_count} municipios`
                            : item.department}
                      </small>
                    </span>
                  </span>
                  <span className="geo-summary-count">{count}</span>
                  <span className="geo-summary-bar">
                    <i
                      style={{
                        width: `${Math.max(8, (count / maxCount) * 100)}%`,
                        background: isArea ? item.accent : coverageColor(count),
                      }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="map-stage map-stage-v2">
          {mapStatus !== "fallback" && <div className="leaflet-map-canvas" ref={node} />}
          {mapStatus === "fallback" && (
            <TerritorialFallback
              municipalities={aggregates.municipalities}
              onSelect={focusEntity}
            />
          )}

          <div className={`map-health map-health--${mapStatus}`}>
            {mapStatus === "loading" && <RefreshCw className="spin" size={14} />}
            {mapStatus === "fallback" && <TriangleAlert size={14} />}
            {mapStatus === "ready" && <span className="status-dot" />}
            <span>{loadingData ? "Cargando datos territoriales…" : mapMessage}</span>
            {mapStatus === "fallback" && (
              <button onClick={retryMap} type="button">Reintentar mapa</button>
            )}
          </div>

          <div className="map-layer-hint">
            <Layers3 size={14} />
            <span>Use el control de capas para cambiar mapa base y superposiciones.</span>
            <ChevronDown size={13} />
          </div>

          <div className="map-note">
            Límites administrativos: geoBoundaries. Los montos mostrados en las
            fichas pertenecen al proyecto completo.
          </div>

          <EntityInspector entity={selected} onClose={() => setSelected(null)} />
        </div>
      </section>
    </div>
  );
}
