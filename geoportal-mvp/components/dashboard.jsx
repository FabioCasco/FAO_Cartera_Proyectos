"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BriefcaseBusiness, CircleAlert, Clock3, MapPinned, UsersRound, WalletCards } from "lucide-react";
import { getDashboard } from "@/lib/data";
import { compactMoney, date, money, number, percent, statusLabel } from "@/lib/format";
import { ExecutionChart, PortfolioBars } from "./charts";

function Kpi({ icon: Icon, label, value, note }) { return <article className="kpi-card"><div className="kpi-icon"><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>; }

export function Dashboard() {
  const [data, setData] = useState({ areas: [], projects: [], monthly: [], locations: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => { getDashboard().then(setData).finally(() => setLoading(false)); }, []);
  const totals = useMemo(() => {
    const projects = data.projects;
    return { budget: projects.reduce((s, p) => s + Number(p.budget_total || 0), 0), spent: projects.reduce((s, p) => s + Number(p.spent || 0), 0), staff: projects.reduce((s, p) => s + Number(p.staff_count || 0), 0), municipalities: new Set(projects.flatMap((p) => p.municipalities || [])).size, risks: projects.filter((p) => ["attention", "critical"].includes(p.status)).length };
  }, [data]);
  const alertOrder = { critical: 0, attention: 1, closing: 2 };
  const alerts = [...data.projects].filter((p) => ["attention", "critical", "closing"].includes(p.status)).sort((a, b) => (alertOrder[a.status] ?? 99) - (alertOrder[b.status] ?? 99)).slice(0, 4);

  return <div className="page-stack">
    <section className="page-heading"><div><span className="eyebrow">PORTFOLIO COMMAND CENTER</span><h1>Visión integrada de la cartera</h1><p>Recursos, resultados, equipos y territorio en una sola lectura ejecutiva.</p></div><Link href="/projects/new" className="primary-button">Agregar proyecto <ArrowUpRight size={17}/></Link></section>
    {loading ? <div className="skeleton-panel">Sincronizando cartera…</div> : <>
      <section className="kpi-grid">
        <Kpi icon={BriefcaseBusiness} label="Proyectos registrados" value={number(data.projects.length)} note={`${data.projects.filter((p) => p.status === "active").length} en curso`}/>
        <Kpi icon={WalletCards} label="Valor de cartera" value={compactMoney(totals.budget)} note={`${percent(totals.budget ? totals.spent / totals.budget * 100 : 0)} ejecutado`}/>
        <Kpi icon={UsersRound} label="Asignaciones de RRHH" value={number(totals.staff)} note="Suma de asignaciones por proyecto"/>
        <Kpi icon={MapPinned} label="Municipios cubiertos" value={number(totals.municipalities)} note="Conteo territorial sin duplicados"/>
        <Kpi icon={CircleAlert} label="Proyectos a revisar" value={number(totals.risks)} note="Atención o estado crítico"/>
      </section>
      <section className="area-grid">
        {data.areas.map((area) => <article className="area-card" key={area.id} style={{ "--accent": area.accent }}><div className="area-card-top"><span>{area.code}</span><Activity size={18}/></div><h3>{area.name}</h3><div className="area-metrics"><div><strong>{area.project_count}</strong><span>proyectos</span></div><div><strong>{compactMoney(area.total_budget)}</strong><span>presupuesto</span></div><div><strong>{area.staff_count}</strong><span>RRHH</span></div></div><div className="progress-track"><span style={{ width: `${Math.min(100, area.execution_pct || 0)}%` }}/></div><small>{percent(area.execution_pct)} de ejecución</small></article>)}
      </section>
      <section className="dashboard-grid dashboard-grid--wide">
        <article className="panel panel--chart"><div className="panel-heading"><div><span className="eyebrow">MOVILIZACIÓN DE RECURSOS</span><h2>Ejecución acumulada</h2></div><span className="data-cut">Corte: agosto 2026 · DEMO</span></div><ExecutionChart rows={data.monthly}/></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">DISTRIBUCIÓN</span><h2>Presupuesto por Mejora</h2></div></div><PortfolioBars areas={data.areas}/><p className="panel-note">El presupuesto se atribuye una sola vez al área principal para evitar doble conteo.</p></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">ATENCIÓN DIRECTIVA</span><h2>Alertas de cartera</h2></div><Link href="/projects">Ver cartera</Link></div><div className="alert-list">{alerts.map((project) => <Link href={`/project?id=${project.id}`} className="alert-row" key={project.id}><span className={`status status--${project.status}`}>{statusLabel[project.status]}</span><div><strong>{project.acronym}</strong><p>{project.status === "closing" ? `Cierre previsto: ${date(project.end_date)}` : `Ejecución ${percent(project.execution_pct)} · avance ${percent(project.physical_progress_pct)}`}</p></div><ArrowUpRight size={16}/></Link>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">TERRITORIO</span><h2>Convergencias programáticas</h2></div><Link href="/geoportal">Abrir mapa</Link></div><div className="territory-list">{[...new Set(data.locations.map((l) => l.municipality))].map((municipality) => { const projects = new Set(data.locations.filter((l) => l.municipality === municipality).map((l) => l.project_id)); return <div key={municipality}><span>{municipality}</span><strong>{projects.size} proyecto{projects.size === 1 ? "" : "s"}</strong></div>; }).sort((a, b) => 0).slice(0, 6)}</div><p className="panel-note">La convergencia muestra presencia; no asigna automáticamente el presupuesto completo al municipio.</p></article>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">LECTURA RÁPIDA</span><h2>Proyectos prioritarios</h2></div><Link href="/projects">Explorar todos</Link></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Proyecto</th><th>Área</th><th>Presupuesto</th><th>Ejecución</th><th>Avance físico</th><th>Finaliza</th><th>Estado</th></tr></thead><tbody>{data.projects.slice(0, 6).map((p) => <tr key={p.id}><td><Link href={`/project?id=${p.id}`}><strong>{p.acronym}</strong><span>{p.code}</span></Link></td><td>{p.primary_area_short_name}</td><td>{money(p.budget_total)}</td><td>{percent(p.execution_pct)}</td><td>{percent(p.physical_progress_pct)}</td><td>{date(p.end_date)}</td><td><span className={`status status--${p.status}`}>{statusLabel[p.status]}</span></td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}
