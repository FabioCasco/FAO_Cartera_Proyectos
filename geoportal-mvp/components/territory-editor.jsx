"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDot,
  Info,
  MapPin,
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
      label: "Cobertura departamental",
      description:
        "Use esta opción cuando el proyecto tenga una intervención verificable en todo el departamento.",
    };
  }
  if (scope === "municipality") {
    return {
      icon: Shapes,
      label: "Cobertura municipal",
      description:
        "El Geoportal sombreará el polígono completo del municipio seleccionado.",
    };
  }
  return {
    icon: CircleDot,
    label: "Punto específico",
    description:
      "Registre una comunidad, oficina, infraestructura, parcela o sitio de intervención concreto.",
  };
}

export function TerritoryEditor({ locations, setLocations }) {
  const [catalogue, setCatalogue] = useState({
    departments: [],
    municipalities: [],
  });
  const [catalogueError, setCatalogueError] = useState("");

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
        scope === "department" && department
          ? department.centroid_lat
          : location.latitude,
      longitude:
        scope === "department" && department
          ? department.centroid_lon
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
    setLocations((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [createEmptyLocation()];
    });
  }

  return (
    <div className="territory-editor territory-editor-v2">
      {catalogueError && (
        <div className="form-error territory-catalogue-error">
          <TriangleAlert size={15} /> {catalogueError}
        </div>
      )}

      <div className="territory-guidance">
        <MapPin size={18} />
        <div>
          <strong>Seleccione territorios normalizados, no escriba nombres libres</strong>
          <p>
            Departamento y municipio provienen del catálogo cartográfico. Puede
            combinar varias coberturas sin duplicar el proyecto en los análisis.
          </p>
        </div>
      </div>

      <div className="territory-location-list">
        {locations.map((location, index) => {
          const meta = scopeMeta(location.geometry_type);
          const ScopeIcon = meta.icon;
          const departmentMunicipalities =
            municipalityByDepartment.get(
              location.department_code ||
                catalogue.departments.find(
                  (item) =>
                    departmentDisplay(item.department) === location.department,
                )?.department_code,
            ) || [];
          const interventionValue = interventionSelection(location);

          return (
            <article className="territory-location-card" key={index}>
              <header>
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{meta.label}</strong>
                    <small>{meta.description}</small>
                  </div>
                </div>
                <button
                  aria-label={`Eliminar cobertura ${index + 1}`}
                  onClick={() => removeLocation(index)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </header>

              <div className="territory-scope-switch">
                {[
                  ["municipality", Shapes, "Municipio"],
                  ["department", Building2, "Departamento"],
                  ["point", CircleDot, "Punto"],
                ].map(([scope, Icon, label]) => (
                  <button
                    className={location.geometry_type === scope ? "active" : ""}
                    key={scope}
                    onClick={() => changeScope(index, scope)}
                    type="button"
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              <div className="form-grid territory-admin-grid">
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

                <label className="field territory-intervention-field">
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
                  <small>
                    Esta categoría permitirá filtrar y resumir las acciones en
                    el Geoportal.
                  </small>
                </label>

                {interventionValue === "__other__" && (
                  <label className="field">
                    <span>Especifique la intervención</span>
                    <input
                      onChange={(event) =>
                        updateLocation(index, {
                          intervention_option: "__other__",
                          intervention_type: event.target.value,
                        })
                      }
                      placeholder="Describa una categoría breve y consistente"
                      value={location.intervention_type}
                    />
                  </label>
                )}

                {location.geometry_type === "point" && (
                  <label className="field">
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
                )}

                <label className="field field--wide territory-notes-field">
                  <span>Detalle territorial <em>opcional</em></span>
                  <textarea
                    onChange={(event) =>
                      updateLocation(index, { notes: event.target.value })
                    }
                    placeholder="Añada únicamente información útil: población, intensidad, alcance o particularidades del territorio."
                    value={location.notes}
                  />
                </label>
              </div>

              {location.geometry_type === "point" ? (
                <div className="territory-point-layout territory-point-layout-v2">
                  <LocationPicker
                    onChange={(coordinates) =>
                      updateLocation(index, coordinates)
                    }
                    value={location}
                  />
                  <div className="territory-coordinate-panel">
                    <div className="territory-coordinate-heading">
                      <CircleDot size={16} />
                      <div>
                        <strong>Coordenada del sitio</strong>
                        <span>
                          Puede elegir el punto en el mapa o escribir los valores.
                        </span>
                      </div>
                    </div>
                    <div className="form-grid territory-coordinate-grid">
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
                    <div className="territory-coordinate-note">
                      <Info size={14} />
                      <span>
                        La coordenada representa el sitio seleccionado; no implica
                        que toda la inversión del proyecto se concentre allí.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="territory-vector-preview">
                  <ScopeIcon size={22} />
                  <div>
                    <strong>
                      {location.geometry_type === "department"
                        ? location.department || "Seleccione un departamento"
                        : location.municipality || "Seleccione un municipio"}
                    </strong>
                    <span>
                      El Geoportal utilizará el límite administrativo completo.
                      La coordenada representativa se calcula automáticamente.
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <button
        className="secondary-button territory-add-button"
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
