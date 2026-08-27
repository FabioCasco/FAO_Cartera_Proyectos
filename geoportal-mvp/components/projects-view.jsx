"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Grid2X2,
  List,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { getAreas, getProjects } from "@/lib/data";
import { date, money, percent, statusLabel } from "@/lib/format";

export function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [areas, setAreas] = useState([]);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  function handleDeleted(projectId) {
    setProjects((current) =>
      current.filter((project) => project.id !== projectId),
    );
    setDeleteTarget(null);
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">PROJECT PORTFOLIO</span>
          <h1>Cartera de proyectos</h1>
          <p>
            Explore, filtre, administre y abra la ficha integral de cada
            intervención.
          </p>
        </div>
        <Link href="/projects/new" className="primary-button">
          <Plus size={17} /> Agregar proyecto
        </Link>
      </section>

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
              {filtered.map((project) => (
                <article
                  className="project-card project-card--managed"
                  key={project.id}
                  style={{
                    "--accent": project.primary_area_accent || "#69CFD8",
                  }}
                >
                  <Link
                    className="project-card-content"
                    href={`/project?id=${project.id}`}
                  >
                    <div className="project-card-head">
                      <span className={`status status--${project.status}`}>
                        {statusLabel[project.status]}
                      </span>
                      <ArrowUpRight size={17} />
                    </div>
                    <span className="project-code">{project.code}</span>
                    <h2>{project.acronym || project.title}</h2>
                    <p>{project.title}</p>
                    <div className="project-card-kpis">
                      <div>
                        <span>Presupuesto</span>
                        <strong>{money(project.budget_total)}</strong>
                      </div>
                      <div>
                        <span>Ejecución</span>
                        <strong>{percent(project.execution_pct)}</strong>
                      </div>
                      <div>
                        <span>Avance</span>
                        <strong>{percent(project.physical_progress_pct)}</strong>
                      </div>
                      <div>
                        <span>RRHH</span>
                        <strong>{project.staff_count || 0}</strong>
                      </div>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            project.physical_progress_pct || 0,
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="project-card-foot">
                      <span>{project.primary_area_short_name}</span>
                      <span>
                        {(project.municipalities || []).length} municipios
                      </span>
                      <span>{date(project.end_date)}</span>
                    </div>
                  </Link>

                  {project.is_demo ? (
                    <span className="project-protected-tag">
                      <ShieldCheck size={13} /> DEMO protegido
                    </span>
                  ) : (
                    <button
                      aria-label={`Eliminar ${project.acronym || project.title}`}
                      className="project-delete-button"
                      onClick={() => setDeleteTarget(project)}
                      title="Eliminar de la cartera"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link href={`/project?id=${project.id}`}>
                          <strong>{project.acronym || project.title}</strong>
                          <span>{project.code}</span>
                        </Link>
                      </td>
                      <td>{project.primary_area_short_name}</td>
                      <td>{project.donor}</td>
                      <td>{money(project.budget_total)}</td>
                      <td>{percent(project.execution_pct)}</td>
                      <td>{percent(project.physical_progress_pct)}</td>
                      <td>{project.staff_count}</td>
                      <td>
                        <span className={`status status--${project.status}`}>
                          {statusLabel[project.status]}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link
                            className="table-action-link"
                            href={`/project?id=${project.id}`}
                          >
                            Abrir
                          </Link>
                          {!project.is_demo && (
                            <button
                              aria-label={`Eliminar ${project.acronym || project.title}`}
                              onClick={() => setDeleteTarget(project)}
                              type="button"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      <DeleteProjectDialog
        key={deleteTarget?.id || "none"}
        open={Boolean(deleteTarget)}
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
