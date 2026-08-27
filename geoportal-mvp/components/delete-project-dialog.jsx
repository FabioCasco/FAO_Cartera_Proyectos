"use client";

import { useState } from "react";
import { ShieldAlert, Trash2, X } from "lucide-react";
import { deleteProject } from "@/lib/data";

export function DeleteProjectDialog({ project, open, onClose, onDeleted }) {
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open || !project) return null;

  const expected = (project.code || project.acronym || "").trim();
  const normalizedConfirmation = confirmation.trim().toLowerCase();
  const normalizedAcronym = (project.acronym || "").trim().toLowerCase();
  const matches =
    normalizedConfirmation === expected.toLowerCase() ||
    (normalizedAcronym.length > 0 &&
      normalizedConfirmation === normalizedAcronym);

  function close() {
    if (busy) return;
    setConfirmation("");
    setError("");
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await deleteProject(project.id, confirmation.trim());
      setConfirmation("");
      onDeleted(project.id);
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
        <h2 id="delete-project-title">Eliminar proyecto de la cartera</h2>
        <p>
          <strong>{project.acronym || project.title}</strong> dejará de aparecer
          en el dashboard, la cartera y el geoportal. La operación es una baja
          lógica: conserva la trazabilidad y puede ser restaurada desde la base
          de datos.
        </p>

        {project.is_demo ? (
          <div className="form-error">
            Los proyectos DEMO están protegidos y no pueden eliminarse desde la
            aplicación.
          </div>
        ) : (
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
                disabled={!matches || busy || project.is_demo}
                type="submit"
              >
                <Trash2 size={16} />
                {busy ? "Eliminando…" : "Eliminar de la cartera"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
