"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Project360 } from "@/components/project-360";

function ProjectQueryView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id) {
    return <div className="empty-state"><strong>Proyecto no especificado</strong><p>Abra la ficha desde la cartera o el geoportal.</p><Link className="primary-button" href="/projects">Volver a la cartera</Link></div>;
  }
  return <Project360 id={id} />;
}

export default function ProjectPage() {
  return <Suspense fallback={<div className="skeleton-panel">Cargando Ficha 360°…</div>}><ProjectQueryView /></Suspense>;
}
