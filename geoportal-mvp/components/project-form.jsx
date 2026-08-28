"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  FileUp,
  Info,
  MapPinned,
  Plus,
  RotateCcw,
  Save,
  Target,
  Trash2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createProjectBundle, getAreas, uploadProjectAssets } from "@/lib/data";
import { usePersistentState } from "@/lib/persistent-state";
import { TerritoryEditor, createEmptyLocation } from "./territory-editor-compact";

const DRAFT_VERSION = 3;

const STEPS = [
  {
    label: "Ficha",
    title: "Ficha del proyecto",
    description: "Identidad, alineamiento, gobernanza y vigencia.",
  },
  {
    label: "Recursos",
    title: "Finanzas y estructura",
    description: "Presupuesto, corte financiero y componentes principales.",
  },
  {
    label: "Resultados",
    title: "Resultados clave",
    description: "Outcomes, outputs e indicadores prioritarios para Programas.",
  },
  {
    label: "Territorio",
    title: "Cobertura territorial",
    description: "Departamentos, municipios y sitios específicos de intervención.",
  },
  {
    label: "Equipo y docs",
    title: "Equipo y documentos",
    description: "Personal principal, evidencias y revisión antes del registro.",
  },
];

function tempId(prefix) {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyComponent() {
  return {
    temp_id: tempId("component"),
    code: "",
    title: "",
    description: "",
    budget_allocated: 0,
    progress_pct: 0,
  };
}

function emptyIndicator() {
  return {
    temp_id: tempId("indicator"),
    code: "",
    name: "",
    unit: "personas",
    baseline_value: 0,
    target_value: 0,
    current_value: 0,
    frequency: "quarterly",
    data_source: "",
  };
}

function emptyResult() {
  return {
    temp_id: tempId("result"),
    code: "",
    level: "outcome",
    title: "",
    description: "",
    parent_temp_id: null,
    indicators: [emptyIndicator()],
  };
}

function emptyStaff() {
  return {
    temp_id: tempId("staff"),
    full_name: "",
    email: "",
    title: "",
    contract_type: "Proyecto",
    role_title: "",
    allocation_pct: 100,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialDraft() {
  return {
    version: DRAFT_VERSION,
    step: 0,
    savedAt: null,
    areaId: "",
    project: {
      code: "",
      acronym: "",
      title: "",
      summary: "",
      donor: "",
      coordinator: "",
      start_date: "",
      end_date: "",
      currency: "USD",
      budget_total: 0,
      status: "draft",
      country: "Honduras",
      is_demo: false,
    },
    financial: {
      snapshot_date: today(),
      budget_amount: 0,
      planned_execution_amount: 0,
      expenditure_amount: 0,
      commitments_amount: 0,
      notes: "Registro inicial",
    },
    components: [],
    results: [],
    locations: [createEmptyLocation()],
    staff: [],
  };
}

function formatSavedAt(value) {
  if (!value) return "El primer cambio activará el guardado automático.";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Borrador guardado automáticamente.";
  return `Último guardado: ${date.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function isBlankLocation(location) {
  return !(
    location.department ||
    location.municipality ||
    location.location_name ||
    location.intervention_type ||
    location.latitude !== null ||
    location.longitude !== null
  );
}

function isValidLocation(location) {
  if (isBlankLocation(location)) return true;
  if (location.geometry_type === "department") return Boolean(location.department);
  if (location.geometry_type === "municipality") {
    return Boolean(location.department && location.municipality);
  }
  return Boolean(
    location.department &&
      location.location_name &&
      Number.isFinite(Number(location.latitude)) &&
      Number.isFinite(Number(location.longitude)),
  );
}

function resultLevelLabel(level) {
  if (level === "impact") return "Impacto / objetivo superior";
  if (level === "output") return "Producto (Output)";
  return "Resultado (Outcome)";
}

function FormBlock({ icon: Icon, title, description, optional = false, children }) {
  return (
    <section className="project-form-block">
      <header className="project-form-block-head">
        <span className="project-form-block-icon">
          <Icon size={17} />
        </span>
        <div>
          <div>
            <h3>{title}</h3>
            {optional && <span>Opcional</span>}
          </div>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function OptionalEmpty({ title, description, action, onAction }) {
  return (
    <div className="project-form-optional-empty">
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <button className="secondary-button" onClick={onAction} type="button">
        <Plus size={15} /> {action}
      </button>
    </div>
  );
}

export function ProjectForm() {
  const router = useRouter();
  const { user } = useAuth();
  const initialDraft = useMemo(() => createInitialDraft(), []);
  const storageKey = `fao-hn-geohub:project-draft:v${DRAFT_VERSION}:${user?.id || "operator"}`;
  const [draft, setDraft, clearStoredDraft] = usePersistentState(
    storageKey,
    initialDraft,
  );
  const [areas, setAreas] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState([]);

  const step = Math.max(0, Math.min(STEPS.length - 1, Number(draft.step || 0)));
  const project = draft.project || initialDraft.project;
  const financial = draft.financial || initialDraft.financial;
  const components = draft.components || [];
  const results = draft.results || [];
  const locations = draft.locations?.length
    ? draft.locations
    : [createEmptyLocation()];
  const staff = draft.staff || [];
  const areaId = draft.areaId || "";

  function updateDraft(updater) {
    setDraft((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return {
        ...next,
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
      };
    });
  }

  function updateProject(patch) {
    updateDraft((current) => ({
      ...current,
      project: { ...current.project, ...patch },
    }));
  }

  function updateFinancial(patch) {
    updateDraft((current) => ({
      ...current,
      financial: { ...current.financial, ...patch },
    }));
  }

  function updateCollection(name, nextRows) {
    updateDraft((current) => ({
      ...current,
      [name]:
        typeof nextRows === "function"
          ? nextRows(current[name] || [])
          : nextRows,
    }));
  }

  function updateCollectionRow(name, index, patch) {
    updateCollection(name, (rows) =>
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  useEffect(() => {
    let active = true;
    getAreas()
      .then((rows) => {
        if (!active) return;
        setAreas(rows);
        if (rows[0]) {
          setDraft((current) =>
            current.areaId
              ? current
              : {
                  ...current,
                  areaId: String(rows[0].id),
                  savedAt: new Date().toISOString(),
                },
          );
        }
      })
      .catch((error) => {
        if (active) {
          setMessage(error.message || "No fue posible cargar las áreas.");
        }
      });
    return () => {
      active = false;
    };
  }, [setDraft]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      const datesAreValid =
        project.start_date &&
        project.end_date &&
        project.end_date >= project.start_date;
      return Boolean(
        project.code && project.title && areaId && datesAreValid,
      );
    }
    if (step === 3) return locations.every(isValidLocation);
    return true;
  }, [areaId, locations, project, step]);

  function setStep(nextStep) {
    setMessage("");
    updateDraft((current) => ({ ...current, step: nextStep }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    if (!canContinue) {
      setMessage(
        step === 0
          ? "Complete código, nombre, área y fechas válidas para continuar."
          : "Revise las coberturas territoriales incompletas.",
      );
      return;
    }
    setStep(Math.min(STEPS.length - 1, step + 1));
  }

  function discardDraft() {
    const hasWork = Boolean(
      project.code ||
        project.title ||
        components.length ||
        results.length ||
        staff.length ||
        step > 0,
    );
    if (
      hasWork &&
      !window.confirm(
        "¿Descartar todo el borrador? Esta acción no elimina proyectos ya registrados en Supabase.",
      )
    ) {
      return;
    }
    clearStoredDraft();
    setDraft(createInitialDraft());
    setFiles([]);
    setMessage("");
  }

  async function submit() {
    if (!project.code || !project.title || !areaId) {
      setStep(0);
      setMessage("Complete la ficha básica antes de registrar el proyecto.");
      return;
    }
    if (!locations.every(isValidLocation)) {
      setStep(3);
      setMessage("Revise las coberturas territoriales incompletas.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const payload = {
        project: {
          ...project,
          budget_total: Number(project.budget_total || 0),
        },
        areas: [
          {
            area_id: Number(areaId),
            is_primary: true,
            contribution_pct: 100,
          },
        ],
        components: components
          .filter((component) => component.title.trim())
          .map((component, index) => ({
            ...component,
            code: component.code || `C${index + 1}`,
            budget_allocated: Number(component.budget_allocated || 0),
            progress_pct: Number(component.progress_pct || 0),
            sort_order: index + 1,
          })),
        results: results
          .filter((result) => result.title.trim())
          .map((result, resultIndex) => ({
            ...result,
            code: result.code || `R${resultIndex + 1}`,
            sort_order: resultIndex + 1,
            indicators: (result.indicators || [])
              .filter((indicator) => indicator.name.trim())
              .map((indicator, indicatorIndex) => ({
                ...indicator,
                code:
                  indicator.code ||
                  `IND-${resultIndex + 1}.${indicatorIndex + 1}`,
                baseline_value: Number(indicator.baseline_value || 0),
                target_value: Number(indicator.target_value || 0),
                current_value: Number(indicator.current_value || 0),
              })),
          })),
        locations: locations
          .filter((location) => !isBlankLocation(location))
          .map((location) => ({
            ...location,
            latitude:
              location.latitude === null || location.latitude === ""
                ? null
                : Number(location.latitude),
            longitude:
              location.longitude === null || location.longitude === ""
                ? null
                : Number(location.longitude),
          })),
        staff: staff
          .filter((person) => person.full_name.trim())
          .map((person) => ({
            ...person,
            allocation_pct: Number(person.allocation_pct || 0),
          })),
        financial: {
          ...financial,
          budget_amount: Number(project.budget_total || 0),
          planned_execution_amount: Number(
            financial.planned_execution_amount || 0,
          ),
          expenditure_amount: Number(financial.expenditure_amount || 0),
          commitments_amount: Number(financial.commitments_amount || 0),
        },
        update: {
          report_date: financial.snapshot_date || today(),
          physical_progress_pct: 0,
          summary: "Registro inicial del proyecto",
          achievements: "",
          bottlenecks: "",
          next_steps: "Completar línea base y primer corte de seguimiento.",
        },
      };

      const id = await createProjectBundle(payload);
      await uploadProjectAssets(id, files);
      clearStoredDraft();
      setFiles([]);
      router.push(`/project?id=${id}`);
    } catch (error) {
      setMessage(error.message || "No fue posible registrar el proyecto.");
    } finally {
      setBusy(false);
    }
  }

  const assignedBudget = components.reduce(
    (sum, component) => sum + Number(component.budget_allocated || 0),
    0,
  );

  return (
    <div className="page-stack project-intake-v2">
      <section className="page-heading project-intake-heading">
        <div>
          <span className="eyebrow">PROJECT PORTFOLIO INTAKE</span>
          <h1>Agregar un proyecto</h1>
          <p>
            Registre la información esencial para monitoreo de cartera. Los
            detalles técnicos extensos pueden incorporarse como documentos.
          </p>
        </div>
      </section>

      <section className="project-draft-toolbar">
        <div>
          <Save size={17} />
          <span>
            <strong>Borrador automático</strong>
            <small>{formatSavedAt(draft.savedAt)}</small>
          </span>
        </div>
        <p>
          El borrador permanece solamente en este navegador; al registrar, el
          proyecto se guarda centralmente en Supabase.
        </p>
        <button onClick={discardDraft} type="button">
          <RotateCcw size={14} /> Descartar borrador
        </button>
      </section>

      <section className="wizard wizard-v2">
        <ol className="stepper stepper-v2">
          {STEPS.map((item, index) => (
            <li
              className={
                index === step ? "active" : index < step ? "done" : ""
              }
              key={item.label}
            >
              <button
                aria-current={index === step ? "step" : undefined}
                onClick={() => setStep(index)}
                type="button"
              >
                <span>{index < step ? <Check size={14} /> : index + 1}</span>
                <small>{item.label}</small>
              </button>
            </li>
          ))}
        </ol>

        <div className="wizard-body wizard-body-v2">
          <div className="section-title section-title-v2">
            <span>{String(step + 1).padStart(2, "0")}</span>
            <div>
              <h2>{STEPS[step].title}</h2>
              <p>{STEPS[step].description}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="form-section form-section-v2">
              <FormBlock
                icon={FileText}
                title="Identificación"
                description="Datos que permiten reconocer el proyecto de forma inequívoca."
              >
                <div className="form-grid">
                  <label className="field">
                    <span>Código corporativo *</span>
                    <input
                      onChange={(event) =>
                        updateProject({ code: event.target.value })
                      }
                      placeholder="GCP/HON/000/XXX"
                      value={project.code}
                    />
                  </label>
                  <label className="field">
                    <span>Acrónimo</span>
                    <input
                      onChange={(event) =>
                        updateProject({ acronym: event.target.value })
                      }
                      placeholder="RECOVER"
                      value={project.acronym}
                    />
                  </label>
                  <label className="field field--wide">
                    <span>Nombre completo *</span>
                    <input
                      onChange={(event) =>
                        updateProject({ title: event.target.value })
                      }
                      placeholder="Nombre oficial del proyecto"
                      value={project.title}
                    />
                  </label>
                  <label className="field field--wide">
                    <span>Descripción ejecutiva</span>
                    <textarea
                      onChange={(event) =>
                        updateProject({ summary: event.target.value })
                      }
                      placeholder="En dos o tres líneas: propósito, población y cambio esperado."
                      value={project.summary}
                    />
                  </label>
                </div>
              </FormBlock>

              <FormBlock
                icon={Target}
                title="Alineamiento y gobernanza"
                description="Clasificación programática, responsables y vigencia del proyecto."
              >
                <div className="form-grid">
                  <label className="field">
                    <span>Área programática principal *</span>
                    <select
                      onChange={(event) =>
                        updateDraft((current) => ({
                          ...current,
                          areaId: event.target.value,
                        }))
                      }
                      value={areaId}
                    >
                      {areas.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Estado</span>
                    <select
                      onChange={(event) =>
                        updateProject({ status: event.target.value })
                      }
                      value={project.status}
                    >
                      <option value="draft">Borrador / formulación</option>
                      <option value="active">En curso</option>
                      <option value="attention">Requiere atención</option>
                      <option value="critical">Crítico</option>
                      <option value="closing">En cierre</option>
                      <option value="closed">Cerrado</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Donante o fuente de financiamiento</span>
                    <input
                      onChange={(event) =>
                        updateProject({ donor: event.target.value })
                      }
                      value={project.donor}
                    />
                  </label>
                  <label className="field">
                    <span>Coordinación del proyecto</span>
                    <input
                      onChange={(event) =>
                        updateProject({ coordinator: event.target.value })
                      }
                      placeholder="Nombre de la persona responsable"
                      value={project.coordinator}
                    />
                  </label>
                  <label className="field">
                    <span>Fecha de inicio *</span>
                    <input
                      onChange={(event) =>
                        updateProject({ start_date: event.target.value })
                      }
                      type="date"
                      value={project.start_date}
                    />
                  </label>
                  <label className="field">
                    <span>Fecha de cierre *</span>
                    <input
                      min={project.start_date || undefined}
                      onChange={(event) =>
                        updateProject({ end_date: event.target.value })
                      }
                      type="date"
                      value={project.end_date}
                    />
                  </label>
                </div>
              </FormBlock>
            </div>
          )}

          {step === 1 && (
            <div className="form-section form-section-v2">
              <FormBlock
                icon={WalletCards}
                title="Situación financiera"
                description="Corte inicial para comparar presupuesto, gasto y compromisos."
              >
                <div className="form-grid finance-grid-v2">
                  <label className="field">
                    <span>Presupuesto vigente (USD)</span>
                    <input
                      min="0"
                      onChange={(event) =>
                        updateProject({ budget_total: event.target.value })
                      }
                      type="number"
                      value={project.budget_total}
                    />
                  </label>
                  <label className="field">
                    <span>Gasto acumulado</span>
                    <input
                      min="0"
                      onChange={(event) =>
                        updateFinancial({
                          expenditure_amount: event.target.value,
                        })
                      }
                      type="number"
                      value={financial.expenditure_amount}
                    />
                  </label>
                  <label className="field">
                    <span>Compromisos vigentes</span>
                    <input
                      min="0"
                      onChange={(event) =>
                        updateFinancial({
                          commitments_amount: event.target.value,
                        })
                      }
                      type="number"
                      value={financial.commitments_amount}
                    />
                  </label>
                  <label className="field">
                    <span>Fecha del corte</span>
                    <input
                      onChange={(event) =>
                        updateFinancial({ snapshot_date: event.target.value })
                      }
                      type="date"
                      value={financial.snapshot_date}
                    />
                  </label>
                </div>
                <div className="project-form-info-note">
                  <Info size={15} />
                  <span>
                    Gasto y compromisos se mantienen separados. La utilización
                    presupuestaria se calculará automáticamente en el dashboard.
                  </span>
                </div>
              </FormBlock>

              <FormBlock
                icon={Target}
                title="Componentes principales"
                description="Registre únicamente los grandes bloques técnicos utilizados para organizar la ejecución."
                optional
              >
                {components.length === 0 ? (
                  <OptionalEmpty
                    action="Agregar componente"
                    description="Puede dejar esta sección pendiente y completar la estructura después."
                    onAction={() =>
                      updateCollection("components", [emptyComponent()])
                    }
                    title="Sin componentes registrados"
                  />
                ) : (
                  <div className="repeat-list repeat-list-v2">
                    {components.map((component, index) => (
                      <article className="repeat-card repeat-card-v2" key={component.temp_id}>
                        <div className="repeat-card-head">
                          <strong>Componente {index + 1}</strong>
                          <button
                            aria-label={`Eliminar componente ${index + 1}`}
                            onClick={() =>
                              updateCollection("components", (rows) =>
                                rows.filter((_, rowIndex) => rowIndex !== index),
                              )
                            }
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="form-grid">
                          <label className="field">
                            <span>Código</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("components", index, {
                                  code: event.target.value,
                                })
                              }
                              placeholder={`C${index + 1}`}
                              value={component.code}
                            />
                          </label>
                          <label className="field field--grow">
                            <span>Nombre del componente *</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("components", index, {
                                  title: event.target.value,
                                })
                              }
                              value={component.title}
                            />
                          </label>
                          <label className="field">
                            <span>Presupuesto asociado</span>
                            <input
                              min="0"
                              onChange={(event) =>
                                updateCollectionRow("components", index, {
                                  budget_allocated: event.target.value,
                                })
                              }
                              type="number"
                              value={component.budget_allocated}
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Descripción breve</span>
                            <textarea
                              onChange={(event) =>
                                updateCollectionRow("components", index, {
                                  description: event.target.value,
                                })
                              }
                              placeholder="Qué agrupa este componente y qué tipo de productos genera."
                              value={component.description}
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                    <button
                      className="secondary-button full-width-button"
                      onClick={() =>
                        updateCollection("components", (rows) => [
                          ...rows,
                          emptyComponent(),
                        ])
                      }
                      type="button"
                    >
                      <Plus size={16} /> Agregar componente
                    </button>
                  </div>
                )}
                {components.length > 0 && (
                  <div className="component-budget-summary">
                    <span>Presupuesto distribuido entre componentes</span>
                    <strong>
                      USD {assignedBudget.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                    </strong>
                  </div>
                )}
              </FormBlock>
            </div>
          )}

          {step === 2 && (
            <div className="form-section form-section-v2">
              <div className="results-guidance-card">
                <Target size={19} />
                <div>
                  <strong>Registre solo lo necesario para monitorear la cartera</strong>
                  <p>
                    No es obligatorio reproducir aquí toda la matriz del PRODOC.
                    Incluya los resultados, productos e indicadores que Programas
                    necesita revisar periódicamente; la matriz completa puede
                    adjuntarse como documento.
                  </p>
                </div>
              </div>

              <FormBlock
                icon={Target}
                title="Cadena de resultados prioritaria"
                description="Cada resultado puede tener uno o varios indicadores con línea base y meta."
                optional
              >
                {results.length === 0 ? (
                  <OptionalEmpty
                    action="Agregar resultado"
                    description="Puede registrar el proyecto sin esta sección y completarla en una fase posterior."
                    onAction={() => updateCollection("results", [emptyResult()])}
                    title="Sin resultados priorizados"
                  />
                ) : (
                  <div className="repeat-list repeat-list-v2 results-editor-v2">
                    {results.map((result, resultIndex) => (
                      <article className="repeat-card repeat-card-v2" key={result.temp_id}>
                        <div className="repeat-card-head">
                          <div>
                            <strong>Resultado {resultIndex + 1}</strong>
                            <span>{resultLevelLabel(result.level)}</span>
                          </div>
                          <button
                            aria-label={`Eliminar resultado ${resultIndex + 1}`}
                            onClick={() =>
                              updateCollection("results", (rows) =>
                                rows.filter((_, index) => index !== resultIndex),
                              )
                            }
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="form-grid">
                          <label className="field">
                            <span>Tipo</span>
                            <select
                              onChange={(event) =>
                                updateCollectionRow("results", resultIndex, {
                                  level: event.target.value,
                                })
                              }
                              value={result.level}
                            >
                              <option value="outcome">Resultado (Outcome)</option>
                              <option value="output">Producto (Output)</option>
                              <option value="impact">Impacto / objetivo superior</option>
                            </select>
                          </label>
                          <label className="field">
                            <span>Código</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("results", resultIndex, {
                                  code: event.target.value,
                                })
                              }
                              placeholder={`R${resultIndex + 1}`}
                              value={result.code}
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Enunciado del resultado *</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("results", resultIndex, {
                                  title: event.target.value,
                                })
                              }
                              placeholder="Cambio o producto que el proyecto se compromete a lograr."
                              value={result.title}
                            />
                          </label>
                          <label className="field field--wide">
                            <span>Descripción o alcance</span>
                            <textarea
                              onChange={(event) =>
                                updateCollectionRow("results", resultIndex, {
                                  description: event.target.value,
                                })
                              }
                              value={result.description}
                            />
                          </label>
                        </div>

                        <div className="indicator-section-v2">
                          <div className="indicator-section-head">
                            <div>
                              <strong>Indicadores clave</strong>
                              <span>
                                Defina cómo se medirá este resultado. Puede dejarlos
                                pendientes.
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const indicators = [
                                  ...(result.indicators || []),
                                  emptyIndicator(),
                                ];
                                updateCollectionRow("results", resultIndex, {
                                  indicators,
                                });
                              }}
                              type="button"
                            >
                              <Plus size={14} /> Indicador
                            </button>
                          </div>

                          {(result.indicators || []).map(
                            (indicator, indicatorIndex) => (
                              <div
                                className="indicator-card-v2"
                                key={indicator.temp_id || indicatorIndex}
                              >
                                <div className="indicator-card-number">
                                  {indicatorIndex + 1}
                                </div>
                                <label className="field">
                                  <span>Código</span>
                                  <input
                                    onChange={(event) => {
                                      const indicators = result.indicators.map(
                                        (item, index) =>
                                          index === indicatorIndex
                                            ? { ...item, code: event.target.value }
                                            : item,
                                      );
                                      updateCollectionRow("results", resultIndex, {
                                        indicators,
                                      });
                                    }}
                                    placeholder={`IND-${resultIndex + 1}.${indicatorIndex + 1}`}
                                    value={indicator.code}
                                  />
                                </label>
                                <label className="field indicator-name-field">
                                  <span>Indicador</span>
                                  <input
                                    onChange={(event) => {
                                      const indicators = result.indicators.map(
                                        (item, index) =>
                                          index === indicatorIndex
                                            ? { ...item, name: event.target.value }
                                            : item,
                                      );
                                      updateCollectionRow("results", resultIndex, {
                                        indicators,
                                      });
                                    }}
                                    placeholder="Qué variable se medirá"
                                    value={indicator.name}
                                  />
                                </label>
                                <label className="field">
                                  <span>Unidad</span>
                                  <input
                                    onChange={(event) => {
                                      const indicators = result.indicators.map(
                                        (item, index) =>
                                          index === indicatorIndex
                                            ? { ...item, unit: event.target.value }
                                            : item,
                                      );
                                      updateCollectionRow("results", resultIndex, {
                                        indicators,
                                      });
                                    }}
                                    value={indicator.unit}
                                  />
                                </label>
                                <label className="field">
                                  <span>Línea base</span>
                                  <input
                                    onChange={(event) => {
                                      const indicators = result.indicators.map(
                                        (item, index) =>
                                          index === indicatorIndex
                                            ? {
                                                ...item,
                                                baseline_value: event.target.value,
                                              }
                                            : item,
                                      );
                                      updateCollectionRow("results", resultIndex, {
                                        indicators,
                                      });
                                    }}
                                    type="number"
                                    value={indicator.baseline_value}
                                  />
                                </label>
                                <label className="field">
                                  <span>Meta</span>
                                  <input
                                    onChange={(event) => {
                                      const indicators = result.indicators.map(
                                        (item, index) =>
                                          index === indicatorIndex
                                            ? {
                                                ...item,
                                                target_value: event.target.value,
                                              }
                                            : item,
                                      );
                                      updateCollectionRow("results", resultIndex, {
                                        indicators,
                                      });
                                    }}
                                    type="number"
                                    value={indicator.target_value}
                                  />
                                </label>
                                <button
                                  aria-label="Eliminar indicador"
                                  className="indicator-delete-button"
                                  onClick={() => {
                                    const indicators = result.indicators.filter(
                                      (_, index) => index !== indicatorIndex,
                                    );
                                    updateCollectionRow("results", resultIndex, {
                                      indicators,
                                    });
                                  }}
                                  type="button"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      </article>
                    ))}
                    <button
                      className="secondary-button full-width-button"
                      onClick={() =>
                        updateCollection("results", (rows) => [
                          ...rows,
                          emptyResult(),
                        ])
                      }
                      type="button"
                    >
                      <Plus size={16} /> Agregar resultado o producto
                    </button>
                  </div>
                )}
              </FormBlock>
            </div>
          )}

          {step === 3 && (
            <div className="form-section form-section-v2">
              <TerritoryEditor
                locations={locations}
                setLocations={(nextRows) =>
                  updateCollection("locations", nextRows)
                }
              />
            </div>
          )}

          {step === 4 && (
            <div className="form-section form-section-v2">
              <FormBlock
                icon={UsersRound}
                title="Equipo principal"
                description="Incluya únicamente personas con responsabilidad directa de gestión o coordinación."
                optional
              >
                {staff.length === 0 ? (
                  <OptionalEmpty
                    action="Agregar persona"
                    description="No es necesario cargar todo el personal para crear la ficha inicial."
                    onAction={() => updateCollection("staff", [emptyStaff()])}
                    title="Sin asignaciones de equipo"
                  />
                ) : (
                  <div className="repeat-list repeat-list-v2">
                    {staff.map((person, index) => (
                      <article className="repeat-card repeat-card-v2" key={person.temp_id}>
                        <div className="repeat-card-head">
                          <strong>Asignación {index + 1}</strong>
                          <button
                            aria-label={`Eliminar asignación ${index + 1}`}
                            onClick={() =>
                              updateCollection("staff", (rows) =>
                                rows.filter((_, rowIndex) => rowIndex !== index),
                              )
                            }
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="form-grid">
                          <label className="field">
                            <span>Nombre</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("staff", index, {
                                  full_name: event.target.value,
                                })
                              }
                              value={person.full_name}
                            />
                          </label>
                          <label className="field">
                            <span>Rol en el proyecto</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("staff", index, {
                                  role_title: event.target.value,
                                })
                              }
                              placeholder="Coordinación, especialista, operaciones…"
                              value={person.role_title}
                            />
                          </label>
                          <label className="field">
                            <span>Correo</span>
                            <input
                              onChange={(event) =>
                                updateCollectionRow("staff", index, {
                                  email: event.target.value,
                                })
                              }
                              type="email"
                              value={person.email}
                            />
                          </label>
                          <label className="field">
                            <span>Dedicación estimada %</span>
                            <input
                              max="100"
                              min="0"
                              onChange={(event) =>
                                updateCollectionRow("staff", index, {
                                  allocation_pct: event.target.value,
                                })
                              }
                              type="number"
                              value={person.allocation_pct}
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                    <button
                      className="secondary-button full-width-button"
                      onClick={() =>
                        updateCollection("staff", (rows) => [
                          ...rows,
                          emptyStaff(),
                        ])
                      }
                      type="button"
                    >
                      <Plus size={16} /> Agregar persona
                    </button>
                  </div>
                )}
              </FormBlock>

              <FormBlock
                icon={FileUp}
                title="Documentos iniciales"
                description="PRODOC, matriz de resultados, POA, mapas o documentos de referencia."
                optional
              >
                <label className="file-drop file-drop-v2">
                  <FileUp size={28} />
                  <strong>Seleccionar fotografías y documentos</strong>
                  <span>
                    PDF, imágenes, Word, Excel, CSV o GeoJSON · máximo 25 MB por
                    archivo
                  </span>
                  <input
                    multiple
                    onChange={(event) => setFiles([...event.target.files])}
                    type="file"
                  />
                  <small>
                    {files.length
                      ? `${files.length} archivo(s) listo(s) para cargar`
                      : "Los archivos no se conservan después de una recarga completa del navegador."}
                  </small>
                </label>
                {files.length > 0 && (
                  <div className="selected-file-list">
                    {files.map((file) => (
                      <span key={`${file.name}-${file.size}`}>{file.name}</span>
                    ))}
                  </div>
                )}
              </FormBlock>

              <section className="project-review-summary">
                <header>
                  <Check size={17} />
                  <div>
                    <strong>Resumen antes de registrar</strong>
                    <span>
                      Revise la ficha esencial; podrá continuar actualizando el
                      proyecto desde su Ficha 360°.
                    </span>
                  </div>
                </header>
                <div>
                  <span>
                    <strong>{project.code || "—"}</strong>
                    <small>Código</small>
                  </span>
                  <span>
                    <strong>{components.filter((item) => item.title).length}</strong>
                    <small>Componentes</small>
                  </span>
                  <span>
                    <strong>{results.filter((item) => item.title).length}</strong>
                    <small>Resultados</small>
                  </span>
                  <span>
                    <strong>{locations.filter((item) => !isBlankLocation(item)).length}</strong>
                    <small>Coberturas</small>
                  </span>
                  <span>
                    <strong>{staff.filter((item) => item.full_name).length}</strong>
                    <small>Personas</small>
                  </span>
                </div>
                <p>
                  El presupuesto se contabilizará una sola vez bajo el área
                  principal. La cobertura territorial representa presencia, no
                  una distribución automática del presupuesto.
                </p>
              </section>
            </div>
          )}

          {message && <div className="form-error project-form-message">{message}</div>}

          <div className="wizard-actions wizard-actions-v2">
            <button
              className="secondary-button"
              disabled={step === 0 || busy}
              onClick={() => setStep(step - 1)}
              type="button"
            >
              <ArrowLeft size={16} /> Anterior
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className="primary-button"
                disabled={!canContinue || busy}
                onClick={goNext}
                type="button"
              >
                Guardar y continuar <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={busy}
                onClick={submit}
                type="button"
              >
                {busy ? "Registrando…" : "Registrar proyecto"} <Check size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
