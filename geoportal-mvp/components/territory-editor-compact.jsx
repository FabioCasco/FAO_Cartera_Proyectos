"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  CircleDot,
  Info,
  MapPin,
  MapPinned,
  Plus,
  Shapes,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { loadHondurasAdminIndex } from "@/lib/geoportal-data";
import { LocationPicker } from "./location-picker";

const DEPARTMENT_DISPLAY_ALIASES = {
  "Bay Islands": "Islas de la Bahía",
};

const INTERVENTION_TYPES = [
  "Asistencia técnica y extensión",
  "Fortalecimiento institucional y gobernanza",
  "Producción sostenible y cadenas de valor",
  "Seguridad alimentaria y nutrición",
  "Gestión de riesgos y respuesta a emergencias",
  "Adaptación y resiliencia climática",
  "Restauración y gestión de recursos naturales",
  "Infraestructura, equipamiento e insumos",
  "Información, monitoreo y sistemas digitales",
  "Inclusión rural, género y protección social",
  "Investigación, innovación y desarrollo de capacidades",
];

function departmentDisplay(value) {
  return DEPARTMENT_DISPLAY_ALIASES[value] || value || "";
}

function interventionSelection(location) {
  if (location.intervention_option) return location.intervention_option;
  if (INTERVENTION_TYPES.includes(location.intervention_type)) {
    return location.intervention_type;
  }
  return location.intervention_type ? "__other__" : "";
}

export function createEmptyLocation() {
  return {
    geometry_type: "municipality",
    department_code: "",
    department: "",
    municipality_code: "",
    municipality: "",
    location_name: "",
    latitude: null,
    longitude: null,
    intervention_option: "",
    intervention_type: "",
    notes: "",
  };
}

function scopeMeta(scope) {
  if (scope === "department") {
    return {
      icon: Building2,
      label: "Departamento",
      title: "Cobertura departamental",
      description: "Representa presencia verificable en todo el departamento.",
    };
  }
  if (scope === "point") {
    return {
      icon: CircleDot,
      label: "Punto",
      title: "Sitio específico",
      description: "Comunidad, oficina, infraestructura, parcela o sitio concreto.",
    };
  }
  return {
    icon: Shapes,
    label: "Municipio",
    title: "Cobertura municipal",
    description: "El Geoportal utilizará el polígono completo del municipio.",
  };
}

function coordinateLabel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "Sin definir";
}

export function TerritoryEditor({ locations, setLocations }) {
  const [catalogue, setCatalogue] = useState({
    departments: [],
    municipalities: [],
  });
  const [catalogueError, setCatalogueError] = useState("");
  const [openMapIndex, setOpenMapIndex] = useState(null);

  useEffect(() => {
    let active = true;
    loadHondurasAdminIndex()
      .then((index) => {
        if (!active) return;
        setCatalogue({
          departments: index.departments || [],
          municipalities: index.municipalities || [],
        });
      })
      .catch((error) => {
        if (!active) return;
        setCatalogueError(
          error.message || "No fue posible cargar el catálogo territorial.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const municipalityByDepartment = useMemo(() => {
    const grouped = new Map();
    for (const municipality of catalogue.municipalities) {
      const key = municipality.department_code || municipality.department_key;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(municipality);
    }
    return grouped;
  }, [catalogue.municipalities]);

  function updateLocation(index, patch) {
    setLocations((current) =>
      current.map((location, rowIndex) =>
        rowIndex === index ? { ...location, ...patch } : location,
      ),
    );
  }

  function changeScope(index, scope) {
    const location = locations[index];
    const department = catalogue.departments.find(
      (item) => item.department_code === location.department_code,
    );
    const municipality = catalogue.municipalities.find(
      (item) => item.municipality_code === location.municipality_code,
    );

    setOpenMapIndex(null);
    updateLocation(index, {
      geometry_type: scope,
      municipality_code:
        scope === "department" ? "" : location.municipality_code,
      municipality: scope === "department" ? "" : location.municipality,
      location_name:
        scope === "department"
          ? location.department
          : scope === "municipality"
            ? location.municipality
            : location.location_name,
      latitude:
        scope === "department"
          ? department?.centroid_lat ?? null
          : scope === "municipality"
            ? municipality?.centroid_lat ?? location.latitude
            : location.latitude,
      longitude:
        scope === "department"
          ? department?.centroid_lon ?? null
          : scope === "municipality"
            ? municipality?.centroid_lon ?? location.longitude
            : location.longitude,
    });
  }

  function changeDepartment(index, departmentCode) {
    const department = catalogue.departments.find(
      (item) => item.department_code === departmentCode,
    );
    const location = locations[index];
    const displayName = departmentDisplay(department?.department);

    updateLocation(index, {
      department_code: department?.department_code || "",
      department: displayName,
      municipality_code: "",
      municipality: "",
      location_name:
        location.geometry_type === "department" ? displayName : "",
      latitude: department?.centroid_lat ?? null,
      longitude: department?.centroid_lon ?? null,
    });
  }

  function changeMunicipality(index, municipalityCode) {
    const municipality = catalogue.municipalities.find(
      (item) => item.municipality_code === municipalityCode,
    );
    const location = locations[index];

    updateLocation(index, {
      municipality_code: municipality?.municipality_code || "",
      municipality: municipality?.municipality || "",
      location_name:
        location.geometry_type === "municipality"
          ? municipality?.municipality || ""
          : location.location_name,
      latitude: municipality?.centroid_lat ?? location.latitude,
      longitude: municipality?.centroid_lon ?? location.longitude,
    });
  }

  function changeIntervention(index, selection) {
    if (selection === "__other__") {
      updateLocation(index, {
        intervention_option: "__other__",
        intervention_type: INTERVENTION_TYPES.includes(
          locations[index].intervention_type,
        )
          ? ""
          : locations[index].intervention_type,
      });
      return;
    }

    updateLocation(index, {
      intervention_option: selection,
      intervention_type: selection,
    });
  }

  function removeLocation(index) {
    setOpenMapIndex(null);
    setLocations((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [createEmptyLocation()];
    });
  }

  return (
    <div className="territory-compact-editor">
      {catalogueError && (
        <div className="form-error territory-catalogue-error">
          <TriangleAlert size={15} /> {catalogueError}
        </div>
      )}

      <section className="territory-compact-intro">
        <MapPinned size={19} />
        <div>
          <strong>Defina dónde opera el proyecto</strong>
          <p>
            Seleccione coberturas normalizadas. Puede combinar departamentos,
            municipios y puntos sin duplicar el proyecto en los análisis.
          </p>
        </div>
      </section>

      <div className="territory-compact-list">
        {locations.map((location, index) => {
          const meta = scopeMeta(location.geometry_type);
          const ScopeIcon = meta.icon;
          const departmentMunicipalities =
            municipalityByDepartment.get(location.department_code) || [];
          const interventionValue = interventionSelection(location);
          const mapIsOpen = openMapIndex === index;

          return (
            <article className="territory-compact-card" key={index}>
              <header className="territory-compact-card__header">
                <div className="territory-compact-card__identity">
                  <span className="territory-compact-card__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="territory-compact-card__icon">
                    <ScopeIcon size={17} />
                  </span>
                  <div>
                    <strong>{meta.title}</strong>
                    <small>{meta.description}</small>
                  </div>
                </div>
                <button
                  aria-label={`Eliminar cobertura ${index + 1}`}
                  className="territory-compact-card__delete"
                  onClick={() => removeLocation(index)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </header>

              <div className="territory-compact-scope" role="group" aria-label="Tipo de cobertura">
                {["municipality", "department", "point"].map((scope) => {
                  const option = scopeMeta(scope);
                  const Icon = option.icon;
                  return (
                    <button
                      className={location.geometry_type === scope ? "active" : ""}
                      key={scope}
                      onClick={() => changeScope(index, scope)}
                      type="button"
                    >
                      <Icon size={14} /> {option.label}
                    </button>
                  );
                })}
              </div>

              <div className="territory-compact-fields">
                <label className="field">
                  <span>Departamento *</span>
                  <select
                    onChange={(event) =>
                      changeDepartment(index, event.target.value)
                    }
                    value={location.department_code}
                  >
                    <option value="">Seleccione un departamento</option>
                    {catalogue.departments.map((department) => (
                      <option
                        key={department.department_code}
                        value={department.department_code}
                      >
                        {departmentDisplay(department.department)}
                      </option>
                    ))}
                  </select>
                </label>

                {location.geometry_type !== "department" && (
                  <label className="field">
                    <span>
                      Municipio
                      {location.geometry_type === "municipality" ? " *" : ""}
                    </span>
                    <select
                      disabled={!location.department_code}
                      onChange={(event) =>
                        changeMunicipality(index, event.target.value)
                      }
                      value={location.municipality_code}
                    >
                      <option value="">Seleccione un municipio</option>
                      {departmentMunicipalities.map((municipality) => (
                        <option
                          key={municipality.municipality_code}
                          value={municipality.municipality_code}
                        >
                          {municipality.municipality}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="field territory-compact-intervention">
                  <span>Intervención principal</span>
                  <select
                    onChange={(event) =>
                      changeIntervention(index, event.target.value)
                    }
                    value={interventionValue}
                  >
                    <option value="">Seleccione una categoría</option>
                    {INTERVENTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    <option value="__other__">Otra intervención</option>
                  </select>
                </label>
              </div>

              {interventionValue === "__other__" && (
                <label className="field territory-compact-other">
                  <span>Especifique la intervención</span>
                  <input
                    onChange={(event) =>
                      updateLocation(index, {
                        intervention_option: "__other__",
                        intervention_type: event.target.value,
                      })
                    }
                    placeholder="Categoría breve y consistente"
                    value={location.intervention_type}
                  />
                </label>
              )}

              {location.geometry_type === "point" ? (
                <section className="territory-point-compact">
                  <div className="territory-point-compact__summary">
                    <div>
                      <MapPin size={17} />
                      <span>
                        <strong>Coordenada del sitio</strong>
                        <small>
                          {coordinateLabel(location.latitude)}, {coordinateLabel(location.longitude)}
                        </small>
                      </span>
                    </div>
                    <button
                      onClick={() => setOpenMapIndex(mapIsOpen ? null : index)}
                      type="button"
                    >
                      {mapIsOpen ? "Ocultar mapa" : "Seleccionar en mapa"}
                    </button>
                  </div>

                  <div className="territory-point-compact__fields">
                    <label className="field territory-point-name">
                      <span>Nombre del sitio *</span>
                      <input
                        onChange={(event) =>
                          updateLocation(index, {
                            location_name: event.target.value,
                          })
                        }
                        placeholder="Comunidad, oficina, parcela o infraestructura"
                        value={location.location_name}
                      />
                    </label>
                    <label className="field">
                      <span>Latitud</span>
                      <input
                        onChange={(event) =>
                          updateLocation(index, {
                            latitude: event.target.value,
                          })
                        }
                        step="any"
                        type="number"
                        value={location.latitude ?? ""}
                      />
                    </label>
                    <label className="field">
                      <span>Longitud</span>
                      <input
                        onChange={(event) =>
                          updateLocation(index, {
                            longitude: event.target.value,
                          })
                        }
                        step="any"
                        type="number"
                        value={location.longitude ?? ""}
                      />
                    </label>
                  </div>

                  {mapIsOpen && (
                    <div className="territory-point-compact__map">
                      <LocationPicker
                        onChange={(coordinates) =>
                          updateLocation(index, coordinates)
                        }
                        value={location}
                      />
                    </div>
                  )}
                </section>
              ) : (
                <div className="territory-vector-confirmation">
                  <ScopeIcon size={18} />
                  <div>
                    <strong>
                      {location.geometry_type === "department"
                        ? location.department || "Seleccione un departamento"
                        : location.municipality || "Seleccione un municipio"}
                    </strong>
                    <span>
                      Se utilizará el límite administrativo completo; no necesita
                      ingresar coordenadas manualmente.
                    </span>
                  </div>
                </div>
              )}

              <details className="territory-compact-details">
                <summary>
                  <Info size={14} /> Detalle territorial opcional
                  <ChevronDown size={14} />
                </summary>
                <label className="field">
                  <span>Notas útiles para seguimiento</span>
                  <textarea
                    onChange={(event) =>
                      updateLocation(index, { notes: event.target.value })
                    }
                    placeholder="Población atendida, intensidad, alcance o particularidades del territorio."
                    value={location.notes}
                  />
                </label>
              </details>
            </article>
          );
        })}
      </div>

      <button
        className="secondary-button territory-compact-add"
        onClick={() =>
          setLocations((current) => [...current, createEmptyLocation()])
        }
        type="button"
      >
        <Plus size={16} /> Agregar otra cobertura o ubicación
      </button>
    </div>
  );
}
