"use client";

import { useState } from "react";
import { ShieldAlert, Trash2, X } from "lucide-react";
import { deleteProject } from "@/lib/data";

export function DeleteProjectDialog({ project, onClose, onDeleted }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expected = (project.code || project.acronym || "").trim();
  const normalizedConfirmation = confirmation.trim().toLowerCase();
  const normalizedAcronym = (project.acronym || "").trim().toLowerCase();
  const matches =
    normalizedConfirmation === expected.toLowerCase() ||
    (normalizedAcronym.length > 0 &&
      normalizedConfirmation === normalizedAcronym);

  function close() {
    if (busy) return;
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    if (!matches || busy) return;

    setBusy(true);
    setError("");
    try {
      await deleteProject(project.id, confirmation.trim());
      await onDeleted?.(project.id);
      onClose();
    } catch (deleteError) {
      setError(
        deleteError.message || "No fue posible retirar el proyecto de la cartera.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop delete-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="delete-project-title"
        aria-modal="true"
        className="delete-dialog"
        role="dialog"
      >
        <button
          aria-label="Cerrar"
          className="delete-dialog-close"
          onClick={close}
          type="button"
        >
          <X size={18} />
        </button>

        <div className="delete-dialog-icon">
          <ShieldAlert size={24} />
        </div>
        <span className="eyebrow">ACCIÓN PROTEGIDA</span>
        <h2 id="delete-project-title">Retirar proyecto de la cartera</h2>
        <p>
          <strong>{project.acronym || project.title}</strong> dejará de aparecer
          en el dashboard, la cartera y el geoportal. Se aplicará una baja
          lógica: el registro conservará trazabilidad en Supabase.
        </p>

        {project.is_demo && (
          <div className="demo-delete-warning">
            Este es un registro DEMO. Puede retirarlo para limpiar la cartera
            antes de incorporar información oficial.
          </div>
        )}

        <form onSubmit={submit}>
          <label className="field">
            <span>
              Para confirmar, escriba <strong>{expected}</strong>
            </span>
            <input
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={expected}
              value={confirmation}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="delete-dialog-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={close}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="danger-button"
              disabled={!matches || busy}
              type="submit"
            >
              <Trash2 size={16} />
              {busy
                ? "Retirando…"
                : project.is_demo
                  ? "Retirar DEMO"
                  : "Retirar de la cartera"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
