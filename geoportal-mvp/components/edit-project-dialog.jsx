"use client";

import { useMemo, useState } from "react";
import { PencilLine, Save, X } from "lucide-react";
import { updateProjectCore } from "@/lib/data";

function initialForm(project) {
  return {
    code: project.code || "",
    acronym: project.acronym || "",
    title: project.title || "",
    summary: project.summary || "",
    donor: project.donor || "",
    coordinator: project.coordinator || "",
    start_date: project.start_date || "",
    end_date: project.end_date || "",
    currency: project.currency || "USD",
    budget_total: Number(project.budget_total || 0),
    status: project.status || "draft",
    primary_area_id: Number(project.primary_area_id || 0),
  };
}

export function EditProjectDialog({ project, areas, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(project));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = useMemo(() => {
    if (!form.code.trim() || !form.title.trim()) return false;
    if (!form.start_date || !form.end_date) return false;
    return new Date(form.end_date).getTime() >= new Date(form.start_date).getTime();
  }, [form]);

  function patch(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!valid || busy) return;

    setBusy(true);
    setError("");
    try {
      await updateProjectCore(project.id, {
        ...form,
        budget_total: Number(form.budget_total || 0),
        primary_area_id: Number(form.primary_area_id || project.primary_area_id),
      });
      await onSaved?.();
      onClose();
    } catch (saveError) {
      setError(saveError.message || "No fue posible actualizar el proyecto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="edit-project-title"
        aria-modal="true"
        className="edit-project-dialog"
        role="dialog"
      >
        <header className="edit-project-head">
          <div>
            <span className="eyebrow">GESTIÓN DEL PROYECTO</span>
            <h2 id="edit-project-title">Editar información principal</h2>
            <p>
              Actualice identidad, alineamiento, vigencia y presupuesto. Los
              cortes de ejecución se mantienen en la Ficha 360°.
            </p>
          </div>
          <button aria-label="Cerrar" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        {project.is_demo && (
          <div className="demo-edit-warning">
            <PencilLine size={16} />
            Este registro es demostrativo. Los cambios se guardarán en
            Supabase y seguirán marcados como DEMO hasta que el registro sea
            retirado o sustituido por información oficial.
          </div>
        )}

        <form className="edit-project-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span>Código *</span>
              <input
                onChange={(event) => patch("code", event.target.value)}
                required
                value={form.code}
              />
            </label>
            <label className="field">
              <span>Acrónimo</span>
              <input
                onChange={(event) => patch("acronym", event.target.value)}
                value={form.acronym}
              />
            </label>
            <label className="field field--wide">
              <span>Nombre completo *</span>
              <input
                onChange={(event) => patch("title", event.target.value)}
                required
                value={form.title}
              />
            </label>
            <label className="field field--wide">
              <span>Resumen</span>
              <textarea
                onChange={(event) => patch("summary", event.target.value)}
                value={form.summary}
              />
            </label>
            <label className="field">
              <span>Área principal</span>
              <select
                onChange={(event) =>
                  patch("primary_area_id", Number(event.target.value))
                }
                value={form.primary_area_id}
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Estado</span>
              <select
                onChange={(event) => patch("status", event.target.value)}
                value={form.status}
              >
                <option value="draft">Borrador</option>
                <option value="active">En curso</option>
                <option value="attention">Atención</option>
                <option value="critical">Crítico</option>
                <option value="closing">En cierre</option>
                <option value="closed">Cerrado</option>
              </select>
            </label>
            <label className="field">
              <span>Donante</span>
              <input
                onChange={(event) => patch("donor", event.target.value)}
                value={form.donor}
              />
            </label>
            <label className="field">
              <span>Coordinación</span>
              <input
                onChange={(event) => patch("coordinator", event.target.value)}
                value={form.coordinator}
              />
            </label>
            <label className="field">
              <span>Fecha de inicio *</span>
              <input
                onChange={(event) => patch("start_date", event.target.value)}
                required
                type="date"
                value={form.start_date}
              />
            </label>
            <label className="field">
              <span>Fecha de cierre *</span>
              <input
                onChange={(event) => patch("end_date", event.target.value)}
                required
                type="date"
                value={form.end_date}
              />
            </label>
            <label className="field">
              <span>Presupuesto total</span>
              <input
                min="0"
                onChange={(event) => patch("budget_total", event.target.value)}
                step="0.01"
                type="number"
                value={form.budget_total}
              />
            </label>
            <label className="field">
              <span>Moneda</span>
              <select
                onChange={(event) => patch("currency", event.target.value)}
                value={form.currency}
              >
                <option value="USD">USD</option>
                <option value="HNL">HNL</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
          </div>

          {!valid && form.start_date && form.end_date && (
            <div className="form-error">
              La fecha de cierre no puede ser anterior a la fecha de inicio.
            </div>
          )}
          {error && <div className="form-error">{error}</div>}

          <footer className="edit-project-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={!valid || busy}
              type="submit"
            >
              <Save size={16} />
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
