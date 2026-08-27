"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  DatabaseZap,
  Grid2X2,
  List,
  PencilLine,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { getAreas, getProjects } from "@/lib/data";
import { date, money, percent, statusLabel } from "@/lib/format";
import { usePersistentState } from "@/lib/persistent-state";

const FILTER_PREFIX = "fao-hn-geohub:portfolio:v2";

export function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [areas, setAreas] = useState([]);
  const [query, setQuery] = usePersistentState(`${FILTER_PREFIX}:query`, "");
  const [area, setArea] = usePersistentState(`${FILTER_PREFIX}:area`, "all");
  const [status, setStatus] = usePersistentState(
    `${FILTER_PREFIX}:status`,
    "all",
  );
  const [view, setView] = usePersistentState(`${FILTER_PREFIX}:view`, "grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function refreshProjects() {
    const rows = await getProjects();
    setProjects(rows);
    return rows;
  }

  useEffect(() => {
    let active = true;

    Promise.all([getProjects(), getAreas()])
      .then(([projectRows, areaRows]) => {
        if (!active) return;
        setProjects(projectRows);
        setAreas(areaRows);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError.message || "No fue posible cargar la cartera de proyectos.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      projects.filter((project) => {
        const haystack = [
          project.title,
          project.acronym,
          project.code,
          project.donor,
          project.coordinator,
          ...(project.municipalities || []),
        ]
          .join(" ")
          .toLowerCase();

        return (
          haystack.includes(query.toLowerCase()) &&
          (area === "all" || project.primary_area_slug === area) &&
          (status === "all" || project.status === status)
        );
      }),
    [projects, query, area, status],
  );

  const demoCount = projects.filter((project) => project.is_demo).length;

  async function handleSaved() {
    setError("");
    try {
      await refreshProjects();
    } catch (refreshError) {
      setError(
        refreshError.message ||
          "El proyecto se guardó, pero la cartera no pudo recargarse.",
      );
    }
  }

  async function handleDeleted() {
    setError("");
    try {
      await refreshProjects();
    } catch (refreshError) {
      setError(
        refreshError.message ||
          "El proyecto se retiró, pero la cartera no pudo recargarse.",
      );
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">PROJECT PORTFOLIO</span>
          <h1>Cartera de proyectos</h1>
          <p>
            Explore, filtre, edite, retire y abra la ficha integral de cada
            intervención. Sus filtros y tipo de vista se conservan al navegar.
          </p>
        </div>
        <Link href="/projects/new" className="primary-button">
          <Plus size={17} /> Agregar proyecto
        </Link>
      </section>

      {demoCount > 0 && (
        <section className="portfolio-demo-notice">
          <DatabaseZap size={19} />
          <div>
            <strong>{demoCount} registros demostrativos activos</strong>
            <p>
              Puede editarlos o retirarlos para limpiar la cartera. Los proyectos
              creados con el formulario se guardan directamente en Supabase.
            </p>
          </div>
        </section>
      )}

      <section className="filter-bar">
        <label className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar proyecto, código, donante, coordinador o municipio"
          />
        </label>
        <label>
          <SlidersHorizontal size={16} />
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="all">Todas las áreas</option>
            {areas.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="active">En curso</option>
            <option value="attention">Atención</option>
            <option value="critical">Crítico</option>
            <option value="closing">En cierre</option>
            <option value="closed">Cerrado</option>
          </select>
        </label>
        <div className="view-switch">
          <button
            aria-label="Vista de tarjetas"
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
            type="button"
          >
            <Grid2X2 size={16} />
          </button>
          <button
            aria-label="Vista de tabla"
            className={view === "table" ? "active" : ""}
            onClick={() => setView("table")}
            type="button"
          >
            <List size={16} />
          </button>
        </div>
      </section>

      {error && <div className="form-error operational-error">{error}</div>}

      {loading ? (
        <div className="skeleton-panel">Cargando cartera protegida…</div>
      ) : (
        <>
          <div className="result-count">
            <strong>{filtered.length}</strong> proyectos encontrados
          </div>

          {view === "grid" ? (
            <section className="project-grid">
              {filtered.map((projectItem) => (
                <article
                  className="project-card project-card--managed"
                  key={projectItem.id}
                  style={{
                    "--accent": projectItem.primary_area_accent || "#69CFD8",
                  }}
                >
                  <Link
                    className="project-card-content"
                    href={`/project?id=${projectItem.id}`}
                  >
                    <div className="project-card-head">
                      <span className={`status status--${projectItem.status}`}>
                        {statusLabel[projectItem.status]}
                      </span>
                      <ArrowUpRight size={17} />
                    </div>
                    <span className="project-code">{projectItem.code}</span>
                    <h2>{projectItem.acronym || projectItem.title}</h2>
                    <p>{projectItem.title}</p>
                    <div className="project-card-kpis">
                      <div>
                        <span>Presupuesto</span>
                        <strong>{money(projectItem.budget_total)}</strong>
                      </div>
                      <div>
                        <span>Ejecución</span>
                        <strong>{percent(projectItem.execution_pct)}</strong>
                      </div>
                      <div>
                        <span>Avance</span>
                        <strong>{percent(projectItem.physical_progress_pct)}</strong>
                      </div>
                      <div>
                        <span>RRHH</span>
                        <strong>{projectItem.staff_count || 0}</strong>
                      </div>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            projectItem.physical_progress_pct || 0,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="project-card-foot">
                      <span>{projectItem.primary_area_short_name}</span>
                      <span>
                        {(projectItem.municipalities || []).length} municipios
                      </span>
                      <span>{date(projectItem.end_date)}</span>
                    </div>
                  </Link>

                  {projectItem.is_demo && (
                    <span className="project-demo-tag">DEMO</span>
                  )}

                  <div className="project-admin-actions">
                    <button
                      aria-label={`Editar ${projectItem.acronym || projectItem.title}`}
                      onClick={() => setEditTarget(projectItem)}
                      title="Editar información principal"
                      type="button"
                    >
                      <PencilLine size={15} />
                    </button>
                    <button
                      aria-label={`Retirar ${projectItem.acronym || projectItem.title}`}
                      className="project-admin-delete"
                      onClick={() => setDeleteTarget(projectItem)}
                      title="Retirar de la cartera"
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="panel table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Área</th>
                    <th>Donante</th>
                    <th>Presupuesto</th>
                    <th>Ejecución</th>
                    <th>Avance</th>
                    <th>RRHH</th>
                    <th>Estado</th>
                    <th>Administrar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((projectItem) => (
                    <tr key={projectItem.id}>
                      <td>
                        <Link href={`/project?id=${projectItem.id}`}>
                          <strong>{projectItem.acronym || projectItem.title}</strong>
                          <span>{projectItem.code}</span>
                        </Link>
                      </td>
                      <td>{projectItem.primary_area_short_name}</td>
                      <td>{projectItem.donor || "—"}</td>
                      <td>{money(projectItem.budget_total)}</td>
                      <td>{percent(projectItem.execution_pct)}</td>
                      <td>{percent(projectItem.physical_progress_pct)}</td>
                      <td>{projectItem.staff_count || 0}</td>
                      <td>
                        <span className={`status status--${projectItem.status}`}>
                          {statusLabel[projectItem.status]}
                        </span>
                      </td>
                      <td>
                        <div className="table-admin-actions">
                          <button
                            onClick={() => setEditTarget(projectItem)}
                            title="Editar"
                            type="button"
                          >
                            <PencilLine size={14} />
                          </button>
                          <button
                            className="table-admin-delete"
                            onClick={() => setDeleteTarget(projectItem)}
                            title="Retirar"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {editTarget && (
        <EditProjectDialog
          areas={areas}
          key={`edit-${editTarget.id}`}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          project={editTarget}
        />
      )}

      {deleteTarget && (
        <DeleteProjectDialog
          key={`delete-${deleteTarget.id}`}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
          project={deleteTarget}
        />
      )}
    </div>
  );
}
