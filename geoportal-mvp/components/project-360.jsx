"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  FileText,
  MapPin,
  PencilLine,
  Plus,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { getAreas, getProject, recordProjectUpdate } from "@/lib/data";
import { date, money, percent, statusLabel } from "@/lib/format";
import { AlignmentChart, ExecutionChart } from "./charts";

const tabs = [
  "Resumen",
  "Marco lógico",
  "Equipo",
  "Territorio",
  "Riesgos e hitos",
  "Evidencias",
];

function Progress({ label, value, tone = "cyan" }) {
  return (
    <div className="metric-progress">
      <div>
        <span>{label}</span>
        <strong>{percent(value)}</strong>
      </div>
      <div className={`progress-track progress-track--${tone}`}>
        <span style={{ width: `${Math.min(100, Number(value || 0))}%` }} />
      </div>
    </div>
  );
}

function EmptySection({ title, description }) {
  return (
    <div className="empty-state compact-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function Project360({ id }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [areas, setAreas] = useState([]);
  const [tab, setTab] = useState("Resumen");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(null);
  const [form, setForm] = useState({
    snapshot_date: new Date().toISOString().slice(0, 10),
    expenditure_amount: 0,
    commitments_amount: 0,
    planned_execution_amount: 0,
    physical_progress_pct: 0,
    summary: "",
    achievements: "",
    bottlenecks: "",
    next_steps: "",
    status: "active",
  });

  useEffect(() => {
    let active = true;

    Promise.all([getProject(id), getAreas()])
      .then(([projectData, areaRows]) => {
        if (!active) return;
        setData(projectData);
        setAreas(areaRows);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message || "No fue posible abrir la Ficha 360°.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const project = data?.project;

  const timeProgress = useMemo(() => {
    if (!project || !now) return 0;
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return 0;
    }
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  }, [project, now]);

  async function reloadProject() {
    const [projectData, areaRows] = await Promise.all([
      getProject(id),
      getAreas(),
    ]);
    setData(projectData);
    setAreas(areaRows);
  }

  function openUpdate() {
    setMessage("");
    setForm((current) => ({
      ...current,
      snapshot_date: new Date().toISOString().slice(0, 10),
      expenditure_amount: project?.spent || 0,
      commitments_amount: project?.commitments || 0,
      planned_execution_amount: 0,
      physical_progress_pct: project?.physical_progress_pct || 0,
      status: project?.status || "active",
    }));
    setUpdateOpen(true);
  }

  async function saveUpdate() {
    setSaving(true);
    setMessage("");
    try {
      await recordProjectUpdate(id, {
        ...form,
        budget_amount: project.budget_total,
        report_date: form.snapshot_date,
        expenditure_amount: Number(form.expenditure_amount || 0),
        commitments_amount: Number(form.commitments_amount || 0),
        planned_execution_amount: Number(form.planned_execution_amount || 0),
        physical_progress_pct: Number(form.physical_progress_pct || 0),
      });
      setUpdateOpen(false);
      await reloadProject();
    } catch (error) {
      setMessage(error.message || "No fue posible guardar el corte.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="skeleton-panel">Cargando Ficha 360°…</div>;
  }

  if (loadError || !data || !project) {
    return (
      <div className="empty-state project-load-error">
        <CircleAlert size={30} />
        <strong>No fue posible abrir el proyecto</strong>
        <p>{loadError || "El registro no está disponible."}</p>
        <Link className="primary-button" href="/projects">
          Volver a la cartera
        </Link>
      </div>
    );
  }

  const projectForRadar = {
    ...project,
    time_progress_pct: timeProgress,
  };

  return (
    <div className="page-stack">
      <Link href="/projects" className="back-link">
        <ArrowLeft size={15} /> Volver a la cartera
      </Link>

      <section
        className="project-hero"
        style={{ "--accent": project.primary_area_accent || "#69CFD8" }}
      >
        <div>
          <div className="hero-meta">
            <span className={`status status--${project.status}`}>
              {statusLabel[project.status]}
            </span>
            {project.is_demo && <span className="hero-demo-badge">DEMO</span>}
            <span>{project.code}</span>
            <span>{project.primary_area_short_name}</span>
          </div>
          <h1>{project.acronym || project.title}</h1>
          <p>{project.title}</p>
        </div>

        <div className="project-hero-actions">
          <button
            className="secondary-button"
            onClick={() => setEditOpen(true)}
            type="button"
          >
            <PencilLine size={16} /> Editar proyecto
          </button>
          <button className="primary-button" onClick={openUpdate} type="button">
            <Plus size={16} /> Registrar corte
          </button>
          <button
            className="danger-button danger-button--compact"
            onClick={() => setDeleteOpen(true)}
            type="button"
          >
            <Trash2 size={16} /> Retirar
          </button>
        </div>
      </section>

      {project.is_demo && (
        <div className="project-demo-management-note">
          Este es un registro de demostración. Como operador puede editarlo,
          retirarlo o utilizarlo como referencia antes de cargar la cartera
          oficial.
        </div>
      )}

      <section className="project-facts">
        <div>
          <WalletCards size={17} />
          <span>Presupuesto</span>
          <strong>{money(project.budget_total)}</strong>
        </div>
        <div>
          <CalendarDays size={17} />
          <span>Vigencia</span>
          <strong>
            {date(project.start_date)} — {date(project.end_date)}
          </strong>
        </div>
        <div>
          <UsersRound size={17} />
          <span>Equipo</span>
          <strong>
            {project.staff_count || data.staff.length} asignaciones
          </strong>
        </div>
        <div>
          <MapPin size={17} />
          <span>Territorio</span>
          <strong>
            {(project.municipalities || data.locations.map((row) => row.municipality))
              .length} municipios
          </strong>
        </div>
      </section>

      <nav className="tabs">
        {tabs.map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>

      {tab === "Resumen" && (
        <div className="dashboard-grid dashboard-grid--wide">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ALINEAMIENTO</span>
                <h2>Tiempo, recursos y resultados</h2>
              </div>
            </div>
            <div className="alignment-layout">
              <div>
                <Progress
                  label="Tiempo consumido"
                  value={timeProgress}
                  tone="muted"
                />
                <Progress
                  label="Ejecución financiera"
                  value={project.execution_pct}
                />
                <Progress
                  label="Avance físico"
                  value={project.physical_progress_pct}
                  tone="violet"
                />
                <Progress
                  label="Utilización"
                  value={project.utilization_pct}
                  tone="gold"
                />
              </div>
              <AlignmentChart project={projectForRadar} />
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">IDENTIDAD</span>
                <h2>Datos del proyecto</h2>
              </div>
            </div>
            <dl className="fact-list">
              <div>
                <dt>Donante</dt>
                <dd>{project.donor || "—"}</dd>
              </div>
              <div>
                <dt>Coordinación</dt>
                <dd>{project.coordinator || "—"}</dd>
              </div>
              <div>
                <dt>Departamentos</dt>
                <dd>{(project.departments || []).join(", ") || "—"}</dd>
              </div>
              <div>
                <dt>Municipios</dt>
                <dd>{(project.municipalities || []).join(", ") || "—"}</dd>
              </div>
            </dl>
            <p className="summary-text">{project.summary || "Sin resumen."}</p>
          </article>

          <article className="panel panel--chart span-2">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">HISTÓRICO</span>
                <h2>Trayectoria financiera</h2>
              </div>
            </div>
            <ExecutionChart
              rows={(data.snapshots || []).map((snapshot) => ({
                month_key: snapshot.snapshot_date?.slice(0, 7),
                planned: snapshot.planned_execution_amount,
                spent: snapshot.expenditure_amount,
                commitments: snapshot.commitments_amount,
              }))}
            />
          </article>

          <article className="panel span-2">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">COMPONENTES</span>
                <h2>Arquitectura operativa</h2>
              </div>
            </div>
            {data.components.length ? (
              <div className="component-grid">
                {data.components.map((component) => (
                  <div className="component-card" key={component.id}>
                    <span>{component.code}</span>
                    <h3>{component.title}</h3>
                    <p>{component.description}</p>
                    <Progress label="Avance" value={component.progress_pct} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                title="Sin componentes registrados"
                description="Añada la estructura técnica al completar o actualizar el proyecto."
              />
            )}
          </article>
        </div>
      )}

      {tab === "Marco lógico" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">RESULTS CHAIN</span>
              <h2>Matriz de resultados e indicadores</h2>
            </div>
          </div>
          {data.results.length ? (
            <div className="results-tree">
              {data.results.map((result) => (
                <div className="result-node" key={result.id}>
                  <div className="result-node-head">
                    <span>{result.level}</span>
                    <strong>
                      {result.code} · {result.title}
                    </strong>
                  </div>
                  <p>{result.description}</p>
                  <div className="indicator-list">
                    {data.indicators
                      .filter((indicator) => indicator.result_id === result.id)
                      .map((indicator) => {
                        const value = indicator.target_value
                          ? (Number(indicator.current_value || 0) /
                              Number(indicator.target_value)) *
                            100
                          : 0;
                        return (
                          <div key={indicator.id}>
                            <span>{indicator.code}</span>
                            <div>
                              <strong>{indicator.name}</strong>
                              <small>
                                {indicator.current_value ?? 0} /{" "}
                                {indicator.target_value ?? "—"} {indicator.unit}
                              </small>
                            </div>
                            <Progress label="Cumplimiento" value={value} />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection
              title="Sin resultados registrados"
              description="El marco lógico aparecerá aquí después de completar el formulario del proyecto."
            />
          )}
        </section>
      )}

      {tab === "Equipo" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">HUMAN RESOURCES</span>
              <h2>Asignaciones al proyecto</h2>
            </div>
          </div>
          {data.staff.length ? (
            <div className="people-grid">
              {data.staff.map((person) => (
                <article key={person.id}>
                  <div className="avatar">
                    {person.full_name
                      ?.split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div>
                    <strong>{person.full_name}</strong>
                    <span>{person.role_title || person.title}</span>
                    <small>
                      {person.contract_type} · {person.allocation_pct}% de
                      dedicación
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptySection
              title="Sin asignaciones de RRHH"
              description="El equipo del proyecto todavía no ha sido registrado."
            />
          )}
        </section>
      )}

      {tab === "Territorio" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">FIELD FOOTPRINT</span>
              <h2>Intervenciones registradas</h2>
            </div>
          </div>
          {data.locations.length ? (
            <div className="location-list">
              {data.locations.map((location) => (
                <article key={location.id}>
                  <MapPin size={18} />
                  <div>
                    <strong>
                      {location.municipality || location.location_name}
                    </strong>
                    <span>{location.department}</span>
                    <small>{location.intervention_type}</small>
                  </div>
                  <code>
                    {Number(location.latitude).toFixed(4)},{" "}
                    {Number(location.longitude).toFixed(4)}
                  </code>
                </article>
              ))}
            </div>
          ) : (
            <EmptySection
              title="Sin ubicaciones registradas"
              description="Agregue municipios o coordenadas para visualizar el proyecto en el Geoportal."
            />
          )}
        </section>
      )}

      {tab === "Riesgos e hitos" && (
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">RISK REGISTER</span>
                <h2>Riesgos activos</h2>
              </div>
            </div>
            {data.risks.length ? (
              <div className="risk-list">
                {data.risks.map((risk) => (
                  <article key={risk.id}>
                    <CircleAlert size={18} />
                    <div>
                      <span
                        className={`status status--${
                          risk.level === "critical" ? "critical" : "attention"
                        }`}
                      >
                        {risk.level}
                      </span>
                      <h3>{risk.title}</h3>
                      <p>{risk.description}</p>
                      <small>Mitigación: {risk.mitigation}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection
                title="Sin riesgos abiertos"
                description="No hay riesgos registrados para este proyecto."
              />
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">MILESTONES</span>
                <h2>Próximos hitos</h2>
              </div>
            </div>
            {data.milestones.length ? (
              <div className="milestone-list">
                {data.milestones.map((milestone) => (
                  <article key={milestone.id}>
                    <time>{date(milestone.due_date)}</time>
                    <div>
                      <strong>{milestone.title}</strong>
                      <span>{milestone.responsible}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection
                title="Sin hitos registrados"
                description="Agregue próximos productos, informes o decisiones clave."
              />
            )}
          </section>
        </div>
      )}

      {tab === "Evidencias" && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">EVIDENCE VAULT</span>
              <h2>Documentos y fotografías</h2>
            </div>
          </div>
          {data.assets.length ? (
            <div className="asset-grid">
              {data.assets.map((asset) => (
                <a
                  href={asset.external_url || undefined}
                  key={asset.id}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText size={20} />
                  <div>
                    <strong>{asset.title}</strong>
                    <span>{asset.asset_type}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={30} />
              <strong>Sin evidencias registradas</strong>
              <p>
                Los archivos cargados desde el formulario aparecerán en esta
                sección.
              </p>
            </div>
          )}
        </section>
      )}

      {updateOpen && (
        <div className="modal-backdrop">
          <div className="drawer">
            <div className="drawer-head">
              <div>
                <span className="eyebrow">NEW SNAPSHOT</span>
                <h2>Registrar corte periódico</h2>
              </div>
              <button onClick={() => setUpdateOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Fecha de corte</span>
                <input
                  type="date"
                  value={form.snapshot_date}
                  onChange={(event) =>
                    setForm({ ...form, snapshot_date: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Estado</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                >
                  <option value="active">En curso</option>
                  <option value="attention">Atención</option>
                  <option value="critical">Crítico</option>
                  <option value="closing">En cierre</option>
                  <option value="closed">Cerrado</option>
                </select>
              </label>
              <label className="field">
                <span>Gasto acumulado</span>
                <input
                  type="number"
                  value={form.expenditure_amount}
                  onChange={(event) =>
                    setForm({ ...form, expenditure_amount: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Compromisos</span>
                <input
                  type="number"
                  value={form.commitments_amount}
                  onChange={(event) =>
                    setForm({ ...form, commitments_amount: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Plan acumulado</span>
                <input
                  type="number"
                  value={form.planned_execution_amount}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      planned_execution_amount: event.target.value,
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Avance físico %</span>
                <input
                  max="100"
                  min="0"
                  type="number"
                  value={form.physical_progress_pct}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      physical_progress_pct: event.target.value,
                    })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>Resumen del período</span>
                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm({ ...form, summary: event.target.value })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>Principales logros</span>
                <textarea
                  value={form.achievements}
                  onChange={(event) =>
                    setForm({ ...form, achievements: event.target.value })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>Cuellos de botella</span>
                <textarea
                  value={form.bottlenecks}
                  onChange={(event) =>
                    setForm({ ...form, bottlenecks: event.target.value })
                  }
                />
              </label>
              <label className="field field--wide">
                <span>Próximos pasos</span>
                <textarea
                  value={form.next_steps}
                  onChange={(event) =>
                    setForm({ ...form, next_steps: event.target.value })
                  }
                />
              </label>
            </div>
            {message && <div className="form-error">{message}</div>}
            <button
              className="primary-button full-button"
              disabled={saving}
              onClick={saveUpdate}
              type="button"
            >
              {saving ? "Guardando…" : "Guardar corte"}
            </button>
          </div>
        </div>
      )}

      {editOpen && (
        <EditProjectDialog
          areas={areas}
          key={`edit-${project.id}`}
          onClose={() => setEditOpen(false)}
          onSaved={reloadProject}
          project={project}
        />
      )}

      {deleteOpen && (
        <DeleteProjectDialog
          key={`delete-${project.id}`}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push("/projects")}
          project={project}
        />
      )}
    </div>
  );
}
