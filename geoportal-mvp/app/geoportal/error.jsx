"use client";

import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function GeoportalError({ error, reset }) {
  return (
    <section className="geo-route-error">
      <div className="geo-route-error-card">
        <TriangleAlert size={32} />
        <span className="eyebrow">RECUPERACIÓN CARTOGRÁFICA</span>
        <h2>El Geoportal encontró un problema</h2>
        <p>
          {error?.message ||
            "No fue posible completar la visualización territorial. La cartera continúa disponible."}
        </p>
        <div className="geo-route-error-actions">
          <button className="primary-button" onClick={reset} type="button">
            <RefreshCw size={16} /> Reintentar
          </button>
          <Link className="secondary-button" href="/projects">
            Volver a la cartera
          </Link>
        </div>
      </div>
    </section>
  );
}
