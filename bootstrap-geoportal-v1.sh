#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-geoportal-mvp}"
mkdir -p "$ROOT"/{app/projects/new,app/projects/'[id]',app/geoportal,components,lib,public,supabase/migrations,docs}

cat > "$ROOT/package.json" <<'EOF'
{
  "name": "fao-honduras-geoportal-mvp",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "check": "npm run lint && npm run build"
  },
  "engines": { "node": ">=22" },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "echarts": "^6.0.0",
    "echarts-for-react": "^3.0.6",
    "lucide-react": "^0.468.0",
    "maplibre-gl": "^5.9.0",
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "eslint": "^9.39.0",
    "eslint-config-next": "^16.0.0"
  }
}
EOF

cat > "$ROOT/next.config.mjs" <<'EOF'
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
EOF

cat > "$ROOT/jsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
EOF

cat > "$ROOT/eslint.config.mjs" <<'EOF'
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**"]),
]);
EOF

cat > "$ROOT/.gitignore" <<'EOF'
node_modules
.next
.env
.env.local
*.log
.DS_Store
EOF

cat > "$ROOT/.env.example" <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xweafcknhbaxpnfeniiq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL=https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson
EOF

cat > "$ROOT/public/geoportal-mark.svg" <<'EOF'
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="62" height="62" rx="18" fill="#0B1118" stroke="#2A3948"/>
  <path d="M17 42V22L32 14L47 22V42L32 50L17 42Z" stroke="#DCE8F1" stroke-width="2"/>
  <path d="M17 22L32 31L47 22M32 31V50" stroke="#6ED0E0" stroke-width="2"/>
  <circle cx="32" cy="31" r="4" fill="#DCE8F1"/>
</svg>
EOF

cat > "$ROOT/app/layout.jsx" <<'EOF'
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Geoportal de Proyectos | FAO Honduras",
  description: "MVP para inteligencia, monitoreo y visualización territorial de la cartera de proyectos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
EOF

cat > "$ROOT/components/app-shell.jsx" <<'EOF'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BriefcaseBusiness, ChevronRight, Database, FolderPlus, Map, Menu, X } from "lucide-react";

const nav = [
  { href: "/", label: "Centro de mando", icon: BarChart3 },
  { href: "/projects", label: "Cartera", icon: BriefcaseBusiness },
  { href: "/geoportal", label: "Geoportal", icon: Map },
  { href: "/projects/new", label: "Agregar proyecto", icon: FolderPlus },
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <img src="/geoportal-mark.svg" alt="" width="42" height="42" />
          <div><strong>FAO Honduras</strong><span>Portfolio Intelligence</span></div>
          <button className="icon-button sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18}/></button>
        </div>
        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "nav-item--active" : ""}`} onClick={() => setOpen(false)}>
                <Icon size={18}/><span>{item.label}</span><ChevronRight className="nav-arrow" size={14}/>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-status">
          <span className="status-dot" />
          <div><strong>Supabase conectado</strong><small>MVP · datos demostrativos</small></div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="Menú"><Menu size={20}/></button>
          <div className="topbar-title"><Database size={16}/><span>Sistema Integrado de Cartera y Resultados</span></div>
          <div className="demo-chip"><span/> ENTORNO DEMO</div>
        </header>
        <main className="main-content">{children}</main>
      </div>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Cerrar menú"/>}
    </div>
  );
}
EOF

cat > "$ROOT/lib/format.js" <<'EOF'
export const money = (value = 0, currency = "USD") => new Intl.NumberFormat("es-HN", {
  style: "currency", currency, maximumFractionDigits: 0,
}).format(Number(value || 0));

export const compactMoney = (value = 0) => new Intl.NumberFormat("es-HN", {
  notation: "compact", style: "currency", currency: "USD", maximumFractionDigits: 1,
}).format(Number(value || 0));

export const number = (value = 0) => new Intl.NumberFormat("es-HN").format(Number(value || 0));
export const percent = (value = 0) => `${Number(value || 0).toFixed(1)}%`;
export const date = (value) => value ? new Intl.DateTimeFormat("es-HN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";

export const statusLabel = {
  draft: "Borrador", active: "En curso", attention: "Atención", critical: "Crítico", closing: "En cierre", closed: "Cerrado",
};
EOF

cat > "$ROOT/lib/supabase.js" <<'EOF'
import { createClient } from "@supabase/supabase-js";

let client;

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabase() {
  if (!hasSupabaseConfig()) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
EOF

cat > "$ROOT/lib/demo-data.js" <<'EOF'
export const demoAreas = [
  { id: 1, code: "BP", slug: "produccion", short_name: "Producción", name: "Mejor Producción", accent: "#72D6C9", project_count: 2, total_budget: 10500000, spent: 6960000, staff_count: 17, execution_pct: 66.3, physical_progress_pct: 64.5 },
  { id: 2, code: "BN", slug: "nutricion", short_name: "Nutrición", name: "Mejor Nutrición", accent: "#E5B86B", project_count: 1, total_budget: 3100000, spent: 890000, staff_count: 7, execution_pct: 28.7, physical_progress_pct: 31.0 },
  { id: 3, code: "BE", slug: "ambiente", short_name: "Ambiente", name: "Mejor Ambiente", accent: "#77B5E8", project_count: 1, total_budget: 8400000, spent: 3150000, staff_count: 12, execution_pct: 37.5, physical_progress_pct: 44.0 },
  { id: 4, code: "BL", slug: "vida", short_name: "Vida", name: "Mejor Vida", accent: "#A99BE7", project_count: 2, total_budget: 8700000, spent: 4540000, staff_count: 16, execution_pct: 52.2, physical_progress_pct: 46.0 },
];

export const demoProjects = [
  { id: "demo-reverde", code: "DEMO-HND-001", acronym: "REVERDE", title: "Restauración productiva y resiliencia de paisajes", primary_area_id: 3, primary_area_slug: "ambiente", primary_area_short_name: "Ambiente", primary_area_accent: "#77B5E8", budget_total: 8400000, spent: 3150000, commitments: 4170000, execution_pct: 37.5, utilization_pct: 49.6, physical_progress_pct: 44, start_date: "2024-01-15", end_date: "2028-12-31", status: "active", donor: "Donante multilateral · DEMO", coordinator: "Coordinación REVERDE", staff_count: 12, component_count: 4, indicator_count: 18, departments: ["Choluteca", "La Paz", "Valle"], municipalities: ["Choluteca", "Marcala", "Nacaome"], summary: "Muestra demostrativa para restauración de paisajes, gestión sostenible de recursos y resiliencia climática." },
  { id: "demo-agriplus", code: "DEMO-HND-002", acronym: "AGRI+", title: "Innovación y agricultura de precisión para pequeños productores", primary_area_id: 1, primary_area_slug: "produccion", primary_area_short_name: "Producción", primary_area_accent: "#72D6C9", budget_total: 4200000, spent: 1620000, commitments: 2050000, execution_pct: 38.6, utilization_pct: 48.8, physical_progress_pct: 41, start_date: "2025-02-01", end_date: "2028-01-31", status: "active", donor: "Cooperación técnica · DEMO", coordinator: "Coordinación AGRI+", staff_count: 8, component_count: 3, indicator_count: 14, departments: ["El Paraíso", "Olancho"], municipalities: ["Danlí", "Juticalpa"], summary: "Innovación, datos y servicios agroclimáticos para mejorar productividad y decisiones de finca." },
  { id: "demo-nutrir", code: "DEMO-HND-003", acronym: "NUTRIR", title: "Sistemas alimentarios territoriales y nutrición rural", primary_area_id: 2, primary_area_slug: "nutricion", primary_area_short_name: "Nutrición", primary_area_accent: "#E5B86B", budget_total: 3100000, spent: 890000, commitments: 1240000, execution_pct: 28.7, utilization_pct: 40, physical_progress_pct: 31, start_date: "2025-06-01", end_date: "2027-11-30", status: "attention", donor: "Fondo conjunto · DEMO", coordinator: "Coordinación NUTRIR", staff_count: 7, component_count: 3, indicator_count: 12, departments: ["Intibucá", "Lempira"], municipalities: ["La Esperanza", "Gracias"], summary: "Fortalecimiento de dietas saludables, compras locales y sistemas alimentarios inclusivos." },
  { id: "demo-vidarural", code: "DEMO-HND-004", acronym: "VIDA RURAL", title: "Inclusión económica y medios de vida rurales", primary_area_id: 4, primary_area_slug: "vida", primary_area_short_name: "Vida", primary_area_accent: "#A99BE7", budget_total: 5800000, spent: 3520000, commitments: 4130000, execution_pct: 60.7, utilization_pct: 71.2, physical_progress_pct: 63, start_date: "2023-09-01", end_date: "2027-08-31", status: "active", donor: "Socio bilateral · DEMO", coordinator: "Coordinación VIDA RURAL", staff_count: 10, component_count: 4, indicator_count: 16, departments: ["Copán", "Santa Bárbara"], municipalities: ["Santa Rosa de Copán", "Santa Bárbara"], summary: "Empleo rural, emprendimientos y fortalecimiento organizativo para medios de vida sostenibles." },
  { id: "demo-agroclima", code: "DEMO-HND-005", acronym: "AGROCLIMA", title: "Gestión de riesgos y resiliencia agroclimática", primary_area_id: 4, primary_area_slug: "vida", primary_area_short_name: "Vida", primary_area_accent: "#A99BE7", budget_total: 2900000, spent: 1020000, commitments: 1510000, execution_pct: 35.2, utilization_pct: 52.1, physical_progress_pct: 29, start_date: "2025-01-15", end_date: "2027-05-31", status: "critical", donor: "Respuesta y resiliencia · DEMO", coordinator: "Coordinación AGROCLIMA", staff_count: 6, component_count: 3, indicator_count: 10, departments: ["Choluteca", "El Paraíso"], municipalities: ["Choluteca", "Danlí"], summary: "Servicios de alerta, reducción de riesgo y capacidades para anticipar impactos climáticos." },
  { id: "demo-valor", code: "DEMO-HND-006", acronym: "VALOR+", title: "Cadenas de valor y acceso inclusivo a mercados", primary_area_id: 1, primary_area_slug: "produccion", primary_area_short_name: "Producción", primary_area_accent: "#72D6C9", budget_total: 6300000, spent: 5340000, commitments: 5790000, execution_pct: 84.8, utilization_pct: 91.9, physical_progress_pct: 88, start_date: "2022-07-01", end_date: "2026-12-31", status: "closing", donor: "Programa de inversión · DEMO", coordinator: "Coordinación VALOR+", staff_count: 9, component_count: 4, indicator_count: 15, departments: ["Comayagua", "Francisco Morazán"], municipalities: ["Comayagua", "Distrito Central"], summary: "Desarrollo empresarial, acceso a mercados y servicios para organizaciones de productores." },
];

export const demoMonthly = [
  ["2026-01", 8596000, 6993000, 8568000], ["2026-02", 9824000, 7925400, 9689400], ["2026-03", 11359000, 9168600, 11153100], ["2026-04", 12587000, 10411800, 12585300], ["2026-05", 14122000, 11655000, 14080500], ["2026-06", 15657000, 12898200, 15544200], ["2026-07", 17192000, 14141400, 17039400], ["2026-08", 18727000, 15540000, 18690000],
].map(([month_key, planned, spent, commitments]) => ({ month_key, planned, spent, commitments }));

export const demoLocations = [
  ["loc-1", "demo-reverde", "REVERDE", "ambiente", "Choluteca", "Choluteca", -87.1908, 13.3015, "Restauración productiva"],
  ["loc-2", "demo-reverde", "REVERDE", "ambiente", "Nacaome", "Valle", -87.4876, 13.5361, "Paisaje resiliente"],
  ["loc-3", "demo-reverde", "REVERDE", "ambiente", "Marcala", "La Paz", -88.0333, 14.15, "Restauración de cuenca"],
  ["loc-4", "demo-agriplus", "AGRI+", "produccion", "Danlí", "El Paraíso", -86.5833, 14.0333, "Agricultura digital"],
  ["loc-5", "demo-agriplus", "AGRI+", "produccion", "Juticalpa", "Olancho", -86.2194, 14.6664, "Servicios productivos"],
  ["loc-6", "demo-nutrir", "NUTRIR", "nutricion", "La Esperanza", "Intibucá", -88.1806, 14.3111, "Sistemas alimentarios"],
  ["loc-7", "demo-nutrir", "NUTRIR", "nutricion", "Gracias", "Lempira", -88.5833, 14.5833, "Nutrición territorial"],
  ["loc-8", "demo-vidarural", "VIDA RURAL", "vida", "Santa Rosa de Copán", "Copán", -88.7797, 14.7662, "Emprendimiento rural"],
  ["loc-9", "demo-vidarural", "VIDA RURAL", "vida", "Santa Bárbara", "Santa Bárbara", -88.2333, 14.9167, "Inclusión económica"],
  ["loc-10", "demo-agroclima", "AGROCLIMA", "vida", "Choluteca", "Choluteca", -87.185, 13.31, "Gestión de riesgo"],
  ["loc-11", "demo-agroclima", "AGROCLIMA", "vida", "Danlí", "El Paraíso", -86.575, 14.04, "Alerta temprana"],
  ["loc-12", "demo-valor", "VALOR+", "produccion", "Comayagua", "Comayagua", -87.6375, 14.4514, "Cadena de valor"],
  ["loc-13", "demo-valor", "VALOR+", "produccion", "Distrito Central", "Francisco Morazán", -87.2068, 14.0723, "Acceso a mercados"],
].map(([id, project_id, project_acronym, area_slug, municipality, department, longitude, latitude, intervention_type]) => ({ id, project_id, project_acronym, area_slug, municipality, department, longitude, latitude, intervention_type }));

const names = ["Especialista de proyecto", "Analista de monitoreo", "Especialista territorial", "Asistente de operaciones"];

export function demoProjectDetail(id) {
  const project = demoProjects.find((item) => item.id === id) || demoProjects[0];
  const components = Array.from({ length: project.component_count }, (_, index) => ({ id: `${project.id}-c${index + 1}`, code: `C${index + 1}`, title: ["Gobernanza y planificación", "Implementación territorial", "Conocimiento e innovación", "Monitoreo y sostenibilidad"][index] || `Componente ${index + 1}`, description: "Componente demostrativo sujeto a sustitución por la formulación oficial del proyecto.", budget_allocated: project.budget_total / project.component_count, progress_pct: Math.max(0, project.physical_progress_pct - index * 4) }));
  const results = [
    { id: `${project.id}-r1`, code: "R1", level: "outcome", title: "Capacidades y condiciones habilitantes fortalecidas", description: "Resultado demostrativo de nivel outcome." },
    { id: `${project.id}-r2`, code: "P1.1", level: "output", title: "Servicios e instrumentos implementados en territorio", description: "Producto demostrativo vinculado a la intervención." },
  ];
  const indicators = [
    { id: `${project.id}-i1`, result_id: `${project.id}-r1`, code: "IND-01", name: "Organizaciones que aplican capacidades fortalecidas", unit: "organizaciones", baseline_value: 4, target_value: 40, current_value: 23, status: "on_track", data_source: "Registro de proyecto" },
    { id: `${project.id}-i2`, result_id: `${project.id}-r2`, code: "IND-02", name: "Personas alcanzadas por servicios del proyecto", unit: "personas", baseline_value: 0, target_value: 2200, current_value: 1180, status: project.status === "critical" ? "off_track" : "attention", data_source: "Sistema de seguimiento" },
  ];
  const staff = Array.from({ length: Math.min(project.staff_count, 4) }, (_, index) => ({ id: `${project.id}-s${index}`, full_name: `${names[index]} · DEMO`, title: names[index], role_title: names[index], allocation_pct: index === 0 ? 100 : 75, contract_type: "Proyecto" }));
  const locations = demoLocations.filter((item) => item.project_id === project.id);
  const risks = [{ id: `${project.id}-risk`, title: "Retraso operativo en actividades críticas", description: "Riesgo demostrativo para activar seguimiento preventivo.", level: project.status === "critical" ? "critical" : "medium", probability: 3, impact: 4, mitigation: "Reprogramación de hitos y seguimiento quincenal.", owner: project.coordinator, status: "open" }];
  const milestones = [{ id: `${project.id}-m1`, title: "Informe técnico semestral", due_date: "2026-09-30", status: "pending", responsible: project.coordinator }, { id: `${project.id}-m2`, title: "Comité directivo", due_date: "2026-11-15", status: "planned", responsible: "Programas" }];
  const snapshots = demoMonthly.map((row, index) => ({ snapshot_date: `${row.month_key}-28`, budget_amount: project.budget_total, planned_execution_amount: project.budget_total * ((index + 2) / 12), expenditure_amount: project.spent * ((index + 1) / 8), commitments_amount: project.commitments * ((index + 1) / 8) }));
  return { project, components, results, indicators, staff, locations, risks, milestones, assets: [], snapshots, updates: [] };
}
EOF

cat > "$ROOT/lib/data.js" <<'EOF'
"use client";

import { getSupabase } from "./supabase";
import { demoAreas, demoLocations, demoMonthly, demoProjectDetail, demoProjects } from "./demo-data";

const LOCAL_KEY = "fao-geoportal-local-projects";

function localProjects() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); } catch { return []; }
}

function saveLocal(project) {
  const current = localProjects();
  localStorage.setItem(LOCAL_KEY, JSON.stringify([project, ...current.filter((item) => item.id !== project.id)]));
}

export async function getAreas() {
  const sb = getSupabase();
  if (!sb) return demoAreas;
  const { data, error } = await sb.from("portfolio_area_summary").select("*").order("id");
  return error || !data?.length ? demoAreas : data;
}

export async function getProjects() {
  const sb = getSupabase();
  if (!sb) return [...localProjects(), ...demoProjects];
  const { data, error } = await sb.from("portfolio_project_summary").select("*").order("updated_at", { ascending: false });
  return error || !data?.length ? [...localProjects(), ...demoProjects] : data;
}

export async function getMonthlyExecution() {
  const sb = getSupabase();
  if (!sb) return demoMonthly;
  const { data, error } = await sb.from("portfolio_monthly_execution").select("*").order("month_key");
  return error || !data?.length ? demoMonthly : data;
}

export async function getLocations() {
  const sb = getSupabase();
  if (!sb) return demoLocations;
  const { data, error } = await sb.from("portfolio_project_locations_v").select("*");
  return error || !data?.length ? demoLocations : data;
}

export async function getDashboard() {
  const [areas, projects, monthly, locations] = await Promise.all([getAreas(), getProjects(), getMonthlyExecution(), getLocations()]);
  return { areas, projects, monthly, locations };
}

export async function getProject(id) {
  const local = localProjects().find((item) => item.id === id);
  if (local) return { ...demoProjectDetail("demo-reverde"), project: local, components: local.components || [], results: local.results || [], indicators: local.indicators || [], staff: local.staff || [], locations: local.locations || [] };
  const sb = getSupabase();
  if (!sb || id.startsWith("demo-")) return demoProjectDetail(id);
  const [summary, components, results, indicators, staff, locations, risks, milestones, assets, snapshots, updates] = await Promise.all([
    sb.from("portfolio_project_summary").select("*").eq("id", id).maybeSingle(),
    sb.from("portfolio_project_components").select("*").eq("project_id", id).order("sort_order"),
    sb.from("portfolio_results").select("*").eq("project_id", id).order("sort_order"),
    sb.from("portfolio_indicators").select("*").eq("project_id", id).order("code"),
    sb.from("portfolio_project_staff_v").select("*").eq("project_id", id),
    sb.from("portfolio_project_locations_v").select("*").eq("project_id", id),
    sb.from("portfolio_risks").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    sb.from("portfolio_project_milestones").select("*").eq("project_id", id).order("due_date"),
    sb.from("portfolio_project_assets").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    sb.from("portfolio_financial_snapshots").select("*").eq("project_id", id).order("snapshot_date"),
    sb.from("portfolio_project_updates").select("*").eq("project_id", id).order("report_date", { ascending: false }),
  ]);
  if (summary.error || !summary.data) return demoProjectDetail(id);
  return { project: summary.data, components: components.data || [], results: results.data || [], indicators: indicators.data || [], staff: staff.data || [], locations: locations.data || [], risks: risks.data || [], milestones: milestones.data || [], assets: assets.data || [], snapshots: snapshots.data || [], updates: updates.data || [] };
}

export async function createProjectBundle(payload) {
  const sb = getSupabase();
  if (!sb) {
    const id = `local-${Date.now()}`;
    const area = demoAreas.find((item) => item.id === payload.areas?.[0]?.area_id) || demoAreas[0];
    const project = { id, ...payload.project, primary_area_id: area.id, primary_area_slug: area.slug, primary_area_short_name: area.short_name, primary_area_accent: area.accent, spent: payload.financial?.expenditure_amount || 0, commitments: payload.financial?.commitments_amount || 0, execution_pct: payload.project.budget_total ? ((payload.financial?.expenditure_amount || 0) / payload.project.budget_total) * 100 : 0, physical_progress_pct: payload.update?.physical_progress_pct || 0, staff_count: payload.staff?.length || 0, component_count: payload.components?.length || 0, indicator_count: payload.results?.reduce((sum, item) => sum + (item.indicators?.length || 0), 0) || 0, departments: [...new Set((payload.locations || []).map((item) => item.department).filter(Boolean))], municipalities: [...new Set((payload.locations || []).map((item) => item.municipality).filter(Boolean))], is_demo: true, components: payload.components || [], results: payload.results || [], indicators: (payload.results || []).flatMap((item) => item.indicators || []), staff: payload.staff || [], locations: payload.locations || [] };
    saveLocal(project);
    return id;
  }
  const { data, error } = await sb.rpc("portfolio_create_project_bundle", { payload });
  if (error) throw error;
  return data;
}

export async function uploadProjectAssets(projectId, files) {
  const sb = getSupabase();
  if (!sb || !files?.length) return [];
  const uploaded = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${projectId}/${Date.now()}-${safeName}`;
    const { error } = await sb.storage.from("portfolio-assets").upload(storagePath, file, { upsert: false });
    if (error) throw error;
    const { data: publicUrl } = sb.storage.from("portfolio-assets").getPublicUrl(storagePath);
    const { data, error: rowError } = await sb.from("portfolio_project_assets").insert({ project_id: projectId, title: file.name, file_name: file.name, mime_type: file.type, size_bytes: file.size, storage_bucket: "portfolio-assets", storage_path: storagePath, external_url: publicUrl.publicUrl, asset_type: file.type.startsWith("image/") ? "photo" : "document" }).select().single();
    if (rowError) throw rowError;
    uploaded.push(data);
  }
  return uploaded;
}

export async function recordProjectUpdate(projectId, payload) {
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.rpc("portfolio_record_project_update", { target_project_id: projectId, payload });
  if (error) throw error;
  return true;
}
EOF

cat > "$ROOT/components/charts.jsx" <<'EOF'
"use client";

import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const axis = { axisLine: { lineStyle: { color: "#263443" } }, axisLabel: { color: "#8393A4" }, splitLine: { lineStyle: { color: "rgba(255,255,255,.055)" } } };

export function ExecutionChart({ rows = [] }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#101821", borderColor: "#2B3A48", textStyle: { color: "#EEF5F8" } },
    legend: { top: 0, right: 0, textStyle: { color: "#91A2B2" } },
    grid: { top: 44, left: 12, right: 12, bottom: 8, containLabel: true },
    xAxis: { type: "category", data: rows.map((r) => r.month_key), ...axis },
    yAxis: { type: "value", ...axis, axisLabel: { color: "#8393A4", formatter: (value) => `$${Math.round(value / 1e6)}M` } },
    series: [
      { name: "Plan", type: "line", smooth: true, symbol: "none", data: rows.map((r) => Number(r.planned || 0)), lineStyle: { color: "#7F91A4", width: 2 } },
      { name: "Gasto", type: "line", smooth: true, symbol: "none", areaStyle: { color: "rgba(85,202,213,.10)" }, data: rows.map((r) => Number(r.spent || 0)), lineStyle: { color: "#69CFD8", width: 3 } },
      { name: "Compromisos", type: "line", smooth: true, symbol: "none", data: rows.map((r) => Number(r.commitments || 0)), lineStyle: { color: "#A999E5", width: 2, type: "dashed" } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 310 }} />;
}

export function PortfolioBars({ areas = [] }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#101821", borderColor: "#2B3A48", textStyle: { color: "#EEF5F8" } },
    grid: { top: 8, left: 8, right: 18, bottom: 4, containLabel: true },
    xAxis: { type: "value", ...axis, axisLabel: { color: "#8393A4", formatter: (v) => `$${Math.round(v / 1e6)}M` } },
    yAxis: { type: "category", data: areas.map((a) => a.short_name), ...axis },
    series: [{ type: "bar", data: areas.map((a) => ({ value: Number(a.total_budget || 0), itemStyle: { color: a.accent, borderRadius: [0, 8, 8, 0] } })), barWidth: 12 }],
  };
  return <ReactECharts option={option} style={{ height: 250 }} />;
}

export function AlignmentChart({ project }) {
  const option = {
    radar: { indicator: [{ name: "Tiempo", max: 100 }, { name: "Finanzas", max: 100 }, { name: "Resultados", max: 100 }, { name: "Utilización", max: 100 }], splitLine: { lineStyle: { color: "rgba(255,255,255,.08)" } }, splitArea: { areaStyle: { color: ["rgba(255,255,255,.01)"] } }, axisName: { color: "#91A2B2" }, axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } } },
    series: [{ type: "radar", data: [{ value: [project.time_progress_pct || 50, project.execution_pct || 0, project.physical_progress_pct || 0, project.utilization_pct || 0], areaStyle: { color: "rgba(105,207,216,.22)" }, lineStyle: { color: "#69CFD8", width: 2 }, symbol: "circle" }] }],
  };
  return <ReactECharts option={option} style={{ height: 280 }} />;
}
EOF

cat > "$ROOT/components/dashboard.jsx" <<'EOF'
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
  const alerts = [...data.projects].filter((p) => ["attention", "critical", "closing"].includes(p.status)).sort((a, b) => ({ critical: 0, attention: 1, closing: 2 }[a.status] - ({ critical: 0, attention: 1, closing: 2 }[b.status])).slice(0, 4);

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
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">ATENCIÓN DIRECTIVA</span><h2>Alertas de cartera</h2></div><Link href="/projects">Ver cartera</Link></div><div className="alert-list">{alerts.map((project) => <Link href={`/projects/${project.id}`} className="alert-row" key={project.id}><span className={`status status--${project.status}`}>{statusLabel[project.status]}</span><div><strong>{project.acronym}</strong><p>{project.status === "closing" ? `Cierre previsto: ${date(project.end_date)}` : `Ejecución ${percent(project.execution_pct)} · avance ${percent(project.physical_progress_pct)}`}</p></div><ArrowUpRight size={16}/></Link>)}</div></article>
        <article className="panel"><div className="panel-heading"><div><span className="eyebrow">TERRITORIO</span><h2>Convergencias programáticas</h2></div><Link href="/geoportal">Abrir mapa</Link></div><div className="territory-list">{[...new Set(data.locations.map((l) => l.municipality))].map((municipality) => { const projects = new Set(data.locations.filter((l) => l.municipality === municipality).map((l) => l.project_id)); return <div key={municipality}><span>{municipality}</span><strong>{projects.size} proyecto{projects.size === 1 ? "" : "s"}</strong></div>; }).sort((a, b) => 0).slice(0, 6)}</div><p className="panel-note">La convergencia muestra presencia; no asigna automáticamente el presupuesto completo al municipio.</p></article>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">LECTURA RÁPIDA</span><h2>Proyectos prioritarios</h2></div><Link href="/projects">Explorar todos</Link></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Proyecto</th><th>Área</th><th>Presupuesto</th><th>Ejecución</th><th>Avance físico</th><th>Finaliza</th><th>Estado</th></tr></thead><tbody>{data.projects.slice(0, 6).map((p) => <tr key={p.id}><td><Link href={`/projects/${p.id}`}><strong>{p.acronym}</strong><span>{p.code}</span></Link></td><td>{p.primary_area_short_name}</td><td>{money(p.budget_total)}</td><td>{percent(p.execution_pct)}</td><td>{percent(p.physical_progress_pct)}</td><td>{date(p.end_date)}</td><td><span className={`status status--${p.status}`}>{statusLabel[p.status]}</span></td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}
EOF

cat > "$ROOT/app/page.jsx" <<'EOF'
import { Dashboard } from "@/components/dashboard";
export default function HomePage() { return <Dashboard/>; }
EOF

cat > "$ROOT/components/projects-view.jsx" <<'EOF'
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Grid2X2, List, Plus, Search, SlidersHorizontal } from "lucide-react";
import { getAreas, getProjects } from "@/lib/data";
import { date, money, percent, statusLabel } from "@/lib/format";

export function ProjectsView() {
  const [projects, setProjects] = useState([]); const [areas, setAreas] = useState([]); const [query, setQuery] = useState(""); const [area, setArea] = useState("all"); const [status, setStatus] = useState("all"); const [view, setView] = useState("grid");
  useEffect(() => { Promise.all([getProjects(), getAreas()]).then(([p, a]) => { setProjects(p); setAreas(a); }); }, []);
  const filtered = useMemo(() => projects.filter((p) => { const haystack = [p.title, p.acronym, p.code, p.donor, p.coordinator, ...(p.municipalities || [])].join(" ").toLowerCase(); return haystack.includes(query.toLowerCase()) && (area === "all" || p.primary_area_slug === area) && (status === "all" || p.status === status); }), [projects, query, area, status]);
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">PROJECT PORTFOLIO</span><h1>Cartera de proyectos</h1><p>Explore, filtre y abra la ficha integral de cada intervención.</p></div><Link href="/projects/new" className="primary-button"><Plus size={17}/> Agregar proyecto</Link></section>
    <section className="filter-bar"><label className="search-box"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar proyecto, código, donante, coordinador o municipio"/></label><label><SlidersHorizontal size={16}/><select value={area} onChange={(e) => setArea(e.target.value)}><option value="all">Todas las áreas</option>{areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}</select></label><label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todos los estados</option><option value="active">En curso</option><option value="attention">Atención</option><option value="critical">Crítico</option><option value="closing">En cierre</option><option value="closed">Cerrado</option></select></label><div className="view-switch"><button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Grid2X2 size={16}/></button><button className={view === "table" ? "active" : ""} onClick={() => setView("table")}><List size={16}/></button></div></section>
    <div className="result-count"><strong>{filtered.length}</strong> proyectos encontrados</div>
    {view === "grid" ? <section className="project-grid">{filtered.map((p) => <Link href={`/projects/${p.id}`} className="project-card" key={p.id} style={{ "--accent": p.primary_area_accent || "#69CFD8" }}><div className="project-card-head"><span className={`status status--${p.status}`}>{statusLabel[p.status]}</span><ArrowUpRight size={17}/></div><span className="project-code">{p.code}</span><h2>{p.acronym}</h2><p>{p.title}</p><div className="project-card-kpis"><div><span>Presupuesto</span><strong>{money(p.budget_total)}</strong></div><div><span>Ejecución</span><strong>{percent(p.execution_pct)}</strong></div><div><span>Avance</span><strong>{percent(p.physical_progress_pct)}</strong></div><div><span>RRHH</span><strong>{p.staff_count || 0}</strong></div></div><div className="progress-track"><span style={{ width: `${Math.min(100, p.physical_progress_pct || 0)}%` }}/></div><div className="project-card-foot"><span>{p.primary_area_short_name}</span><span>{(p.municipalities || []).length} municipios</span><span>{date(p.end_date)}</span></div></Link>)}</section> : <section className="panel table-wrap"><table className="data-table"><thead><tr><th>Proyecto</th><th>Área</th><th>Donante</th><th>Presupuesto</th><th>Ejecución</th><th>Avance</th><th>RRHH</th><th>Estado</th></tr></thead><tbody>{filtered.map((p) => <tr key={p.id}><td><Link href={`/projects/${p.id}`}><strong>{p.acronym}</strong><span>{p.code}</span></Link></td><td>{p.primary_area_short_name}</td><td>{p.donor}</td><td>{money(p.budget_total)}</td><td>{percent(p.execution_pct)}</td><td>{percent(p.physical_progress_pct)}</td><td>{p.staff_count}</td><td><span className={`status status--${p.status}`}>{statusLabel[p.status]}</span></td></tr>)}</tbody></table></section>}
  </div>;
}
EOF

cat > "$ROOT/app/projects/page.jsx" <<'EOF'
import { ProjectsView } from "@/components/projects-view";
export default function ProjectsPage() { return <ProjectsView/>; }
EOF

cat > "$ROOT/components/geoportal-map.jsx" <<'EOF'
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import { ArrowUpRight, Layers3, LocateFixed, MapPinned, Search } from "lucide-react";
import { getAreas, getLocations, getProjects } from "@/lib/data";

const boundaryUrl = process.env.NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL || "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson";

export function GeoportalMap() {
  const node = useRef(null); const mapRef = useRef(null); const [locations, setLocations] = useState([]); const [projects, setProjects] = useState([]); const [areas, setAreas] = useState([]); const [area, setArea] = useState("all"); const [project, setProject] = useState("all"); const [selected, setSelected] = useState(null); const [query, setQuery] = useState("");
  useEffect(() => { Promise.all([getLocations(), getProjects(), getAreas()]).then(([l, p, a]) => { setLocations(l); setProjects(p); setAreas(a); }); }, []);
  const filtered = useMemo(() => locations.filter((l) => (area === "all" || l.area_slug === area) && (project === "all" || l.project_id === project) && (!query || `${l.municipality} ${l.department} ${l.project_acronym}`.toLowerCase().includes(query.toLowerCase()))), [locations, area, project, query]);
  const municipalities = useMemo(() => { const map = new Map(); filtered.forEach((l) => { const key = `${l.department}|${l.municipality}`; if (!map.has(key)) map.set(key, { municipality: l.municipality, department: l.department, longitude: Number(l.longitude), latitude: Number(l.latitude), projects: new Map(), interventions: [] }); const row = map.get(key); row.projects.set(l.project_id, { id: l.project_id, acronym: l.project_acronym }); row.interventions.push(l.intervention_type); }); return [...map.values()].map((row) => ({ ...row, projects: [...row.projects.values()], project_count: row.projects.size })).sort((a, b) => b.project_count - a.project_count); }, [filtered]);
  useEffect(() => {
    if (!node.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: node.current, style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", center: [-86.6, 14.65], zoom: 6.1, minZoom: 5.4 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      map.addSource("municipios", { type: "geojson", data: boundaryUrl });
      map.addLayer({ id: "municipios-fill", type: "fill", source: "municipios", paint: { "fill-color": "#11202B", "fill-opacity": 0.18 } });
      map.addLayer({ id: "municipios-line", type: "line", source: "municipios", paint: { "line-color": "rgba(158,185,202,.38)", "line-width": 0.55 } });
      map.addSource("intervenciones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "intervenciones-halo", type: "circle", source: "intervenciones", paint: { "circle-radius": ["+", ["*", ["get", "project_count"], 7], 12], "circle-color": "rgba(105,207,216,.13)", "circle-stroke-color": "rgba(105,207,216,.4)", "circle-stroke-width": 1 } });
      map.addLayer({ id: "intervenciones", type: "circle", source: "intervenciones", paint: { "circle-radius": ["+", ["*", ["get", "project_count"], 2.5], 5], "circle-color": ["step", ["get", "project_count"], "#72D6C9", 2, "#E5B86B", 3, "#E77C7C"], "circle-stroke-color": "#EAF3F7", "circle-stroke-width": 1.2 } });
      map.addLayer({ id: "intervenciones-label", type: "symbol", source: "intervenciones", layout: { "text-field": ["to-string", ["get", "project_count"]], "text-size": 11 }, paint: { "text-color": "#071018" } });
      map.on("click", "intervenciones", (e) => setSelected(e.features?.[0]?.properties || null));
      map.on("mouseenter", "intervenciones", () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", "intervenciones", () => { map.getCanvas().style.cursor = ""; });
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => { const source = mapRef.current?.getSource("intervenciones"); if (!source) return; source.setData({ type: "FeatureCollection", features: municipalities.map((m) => ({ type: "Feature", geometry: { type: "Point", coordinates: [m.longitude, m.latitude] }, properties: { municipality: m.municipality, department: m.department, project_count: m.project_count, projects: m.projects.map((p) => p.acronym).join(", ") } })) }); }, [municipalities]);
  return <div className="page-stack geo-page"><section className="page-heading"><div><span className="eyebrow">TERRITORIAL INTELLIGENCE</span><h1>Geoportal de intervenciones</h1><p>Visualice presencia, convergencias y cobertura programática en Honduras.</p></div><div className="geo-count"><MapPinned size={18}/><strong>{municipalities.length}</strong><span>municipios visibles</span></div></section>
    <section className="geo-layout"><aside className="geo-sidebar"><div className="geo-filter-title"><Layers3 size={17}/><strong>Capas y filtros</strong></div><label className="search-box"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Municipio o proyecto"/></label><label className="field"><span>Área programática</span><select value={area} onChange={(e) => setArea(e.target.value)}><option value="all">Todas</option>{areas.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}</select></label><label className="field"><span>Proyecto</span><select value={project} onChange={(e) => setProject(e.target.value)}><option value="all">Todos</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.acronym}</option>)}</select></label><div className="legend"><strong>Convergencia</strong><span><i className="dot dot--one"/> 1 proyecto</span><span><i className="dot dot--two"/> 2 proyectos</span><span><i className="dot dot--three"/> 3 o más</span></div><div className="convergence-list"><div className="geo-filter-title"><LocateFixed size={16}/><strong>Mayor convergencia</strong></div>{municipalities.slice(0, 7).map((m) => <button key={`${m.department}-${m.municipality}`} onClick={() => { setSelected({ municipality: m.municipality, department: m.department, project_count: m.project_count, projects: m.projects.map((p) => p.acronym).join(", ") }); mapRef.current?.flyTo({ center: [m.longitude, m.latitude], zoom: 8.7 }); }}><span>{m.municipality}<small>{m.department}</small></span><strong>{m.project_count}</strong></button>)}</div></aside><div className="map-stage"><div ref={node} className="map-canvas"/><div className="map-note">Los círculos representan proyectos distintos. La cifra presupuestaria del proyecto no se interpreta como inversión municipal.</div>{selected && <div className="map-detail"><button onClick={() => setSelected(null)}>×</button><span className="eyebrow">MUNICIPIO</span><h3>{selected.municipality}</h3><p>{selected.department}</p><div><strong>{selected.project_count}</strong><span>proyectos coincidentes</span></div><p>{selected.projects}</p>{selected.project_count === 1 && <Link href={`/projects/${municipalities.find((m) => m.municipality === selected.municipality)?.projects[0]?.id || ""}`}>Abrir proyecto <ArrowUpRight size={15}/></Link>}</div>}</div></section>
  </div>;
}
EOF

cat > "$ROOT/app/geoportal/page.jsx" <<'EOF'
import { GeoportalMap } from "@/components/geoportal-map";
export default function GeoportalPage() { return <GeoportalMap/>; }
EOF

cat > "$ROOT/components/location-picker.jsx" <<'EOF'
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export function LocationPicker({ value, onChange }) {
  const node = useRef(null); const mapRef = useRef(null); const markerRef = useRef(null);
  useEffect(() => { if (!node.current || mapRef.current) return; const map = new maplibregl.Map({ container: node.current, style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json", center: value?.longitude && value?.latitude ? [value.longitude, value.latitude] : [-86.6, 14.65], zoom: value?.longitude ? 9 : 6.1 }); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right"); map.on("click", (e) => onChange({ latitude: Number(e.lngLat.lat.toFixed(6)), longitude: Number(e.lngLat.lng.toFixed(6)) })); mapRef.current = map; return () => map.remove(); }, [onChange, value?.latitude, value?.longitude]);
  useEffect(() => { if (!mapRef.current || !value?.longitude || !value?.latitude) return; markerRef.current?.remove(); markerRef.current = new maplibregl.Marker({ color: "#69CFD8" }).setLngLat([value.longitude, value.latitude]).addTo(mapRef.current); }, [value]);
  return <div className="location-picker" ref={node}/>;
}
EOF

cat > "$ROOT/components/project-form.jsx" <<'EOF'
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileUp, MapPin, Plus, Trash2 } from "lucide-react";
import { createProjectBundle, getAreas, uploadProjectAssets } from "@/lib/data";
import { LocationPicker } from "./location-picker";

const emptyComponent = () => ({ code: "", title: "", description: "", budget_allocated: 0, progress_pct: 0 });
const emptyIndicator = () => ({ code: "", name: "", unit: "personas", baseline_value: 0, target_value: 0, current_value: 0, frequency: "quarterly", data_source: "" });
const emptyResult = () => ({ temp_id: crypto.randomUUID(), code: "", level: "outcome", title: "", description: "", parent_temp_id: null, indicators: [emptyIndicator()] });
const emptyLocation = () => ({ geometry_type: "point", department: "", municipality: "", location_name: "", latitude: 14.0723, longitude: -87.2068, intervention_type: "", notes: "" });
const emptyStaff = () => ({ full_name: "", email: "", title: "", contract_type: "Proyecto", role_title: "", allocation_pct: 100 });

export function ProjectForm() {
  const router = useRouter(); const [areas, setAreas] = useState([]); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [files, setFiles] = useState([]);
  const [project, setProject] = useState({ code: "", acronym: "", title: "", summary: "", donor: "", coordinator: "", start_date: "", end_date: "", currency: "USD", budget_total: 0, status: "draft", country: "Honduras", is_demo: false });
  const [areaId, setAreaId] = useState(1); const [financial, setFinancial] = useState({ snapshot_date: new Date().toISOString().slice(0, 10), budget_amount: 0, planned_execution_amount: 0, expenditure_amount: 0, commitments_amount: 0, notes: "Registro inicial" });
  const [components, setComponents] = useState([emptyComponent()]); const [results, setResults] = useState([emptyResult()]); const [locations, setLocations] = useState([emptyLocation()]); const [staff, setStaff] = useState([emptyStaff()]);
  useEffect(() => { getAreas().then((rows) => { setAreas(rows); if (rows[0]) setAreaId(rows[0].id); }); }, []);
  useEffect(() => { setFinancial((v) => ({ ...v, budget_amount: Number(project.budget_total || 0) })); }, [project.budget_total]);
  const steps = ["Identidad", "Recursos", "Marco lógico", "Territorio", "Equipo y evidencias"];
  const canContinue = useMemo(() => step === 0 ? project.code && project.title && project.start_date && project.end_date : true, [step, project]);
  const updateRow = (setter, rows, index, patch) => setter(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  async function submit() { setBusy(true); setMessage(""); try { const payload = { project: { ...project, budget_total: Number(project.budget_total || 0) }, areas: [{ area_id: Number(areaId), is_primary: true, contribution_pct: 100 }], components: components.filter((c) => c.title).map((c, i) => ({ ...c, code: c.code || `C${i + 1}`, budget_allocated: Number(c.budget_allocated || 0), sort_order: i + 1 })), results: results.filter((r) => r.title).map((r, i) => ({ ...r, code: r.code || `R${i + 1}`, sort_order: i + 1, indicators: r.indicators.filter((ind) => ind.name).map((ind, j) => ({ ...ind, code: ind.code || `IND-${i + 1}.${j + 1}`, baseline_value: Number(ind.baseline_value || 0), target_value: Number(ind.target_value || 0), current_value: Number(ind.current_value || 0) })) })), locations: locations.filter((l) => l.municipality || (l.latitude && l.longitude)).map((l) => ({ ...l, latitude: Number(l.latitude), longitude: Number(l.longitude) })), staff: staff.filter((s) => s.full_name).map((s) => ({ ...s, allocation_pct: Number(s.allocation_pct || 0) })), financial: { ...financial, budget_amount: Number(project.budget_total || 0), planned_execution_amount: Number(financial.planned_execution_amount || 0), expenditure_amount: Number(financial.expenditure_amount || 0), commitments_amount: Number(financial.commitments_amount || 0) }, update: { report_date: financial.snapshot_date, physical_progress_pct: 0, summary: "Registro inicial del proyecto", achievements: "", bottlenecks: "", next_steps: "Completar línea base y primer corte de seguimiento." } }; const id = await createProjectBundle(payload); await uploadProjectAssets(id, files); router.push(`/projects/${id}`); } catch (error) { setMessage(error.message || "No fue posible registrar el proyecto."); } finally { setBusy(false); } }
  return <div className="page-stack"><section className="page-heading"><div><span className="eyebrow">STRUCTURED PROJECT INTAKE</span><h1>Agregar un proyecto</h1><p>Registro progresivo y homogéneo para la cartera de FAO Honduras.</p></div></section><section className="wizard"><ol className="stepper">{steps.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "done" : ""}><span>{index < step ? <Check size={14}/> : index + 1}</span><small>{label}</small></li>)}</ol><div className="wizard-body">
    {step === 0 && <div className="form-section"><div className="section-title"><span>01</span><div><h2>Identidad y alineamiento</h2><p>Información corporativa básica y área programática principal.</p></div></div><div className="form-grid"><label className="field"><span>Código *</span><input value={project.code} onChange={(e) => setProject({ ...project, code: e.target.value })} placeholder="GCP/HON/000/XXX"/></label><label className="field"><span>Acrónimo</span><input value={project.acronym} onChange={(e) => setProject({ ...project, acronym: e.target.value })} placeholder="RECOVER"/></label><label className="field field--wide"><span>Nombre completo *</span><input value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })}/></label><label className="field field--wide"><span>Resumen</span><textarea value={project.summary} onChange={(e) => setProject({ ...project, summary: e.target.value })}/></label><label className="field"><span>Área principal</span><select value={areaId} onChange={(e) => setAreaId(e.target.value)}>{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field"><span>Estado</span><select value={project.status} onChange={(e) => setProject({ ...project, status: e.target.value })}><option value="draft">Borrador</option><option value="active">En curso</option><option value="attention">Atención</option><option value="critical">Crítico</option><option value="closing">En cierre</option></select></label><label className="field"><span>Donante</span><input value={project.donor} onChange={(e) => setProject({ ...project, donor: e.target.value })}/></label><label className="field"><span>Coordinación</span><input value={project.coordinator} onChange={(e) => setProject({ ...project, coordinator: e.target.value })}/></label><label className="field"><span>Fecha de inicio *</span><input type="date" value={project.start_date} onChange={(e) => setProject({ ...project, start_date: e.target.value })}/></label><label className="field"><span>Fecha de cierre *</span><input type="date" value={project.end_date} onChange={(e) => setProject({ ...project, end_date: e.target.value })}/></label></div></div>}
    {step === 1 && <div className="form-section"><div className="section-title"><span>02</span><div><h2>Recursos y componentes</h2><p>Presupuesto, punto de partida financiero y estructura técnica.</p></div></div><div className="form-grid"><label className="field"><span>Presupuesto total (USD)</span><input type="number" value={project.budget_total} onChange={(e) => setProject({ ...project, budget_total: e.target.value })}/></label><label className="field"><span>Gasto a la fecha</span><input type="number" value={financial.expenditure_amount} onChange={(e) => setFinancial({ ...financial, expenditure_amount: e.target.value })}/></label><label className="field"><span>Compromisos</span><input type="number" value={financial.commitments_amount} onChange={(e) => setFinancial({ ...financial, commitments_amount: e.target.value })}/></label><label className="field"><span>Fecha de corte</span><input type="date" value={financial.snapshot_date} onChange={(e) => setFinancial({ ...financial, snapshot_date: e.target.value })}/></label></div><div className="repeat-list">{components.map((row, index) => <div className="repeat-card" key={index}><div className="repeat-card-head"><strong>Componente {index + 1}</strong>{components.length > 1 && <button onClick={() => setComponents(components.filter((_, i) => i !== index))}><Trash2 size={15}/></button>}</div><div className="form-grid"><label className="field"><span>Código</span><input value={row.code} onChange={(e) => updateRow(setComponents, components, index, { code: e.target.value })}/></label><label className="field field--grow"><span>Título</span><input value={row.title} onChange={(e) => updateRow(setComponents, components, index, { title: e.target.value })}/></label><label className="field field--wide"><span>Descripción</span><textarea value={row.description} onChange={(e) => updateRow(setComponents, components, index, { description: e.target.value })}/></label></div></div>)}<button className="secondary-button" onClick={() => setComponents([...components, emptyComponent()])}><Plus size={16}/> Agregar componente</button></div></div>}
    {step === 2 && <div className="form-section"><div className="section-title"><span>03</span><div><h2>Marco lógico</h2><p>Resultados e indicadores estandarizados con línea base y meta.</p></div></div><div className="repeat-list">{results.map((row, index) => <div className="repeat-card" key={row.temp_id}><div className="repeat-card-head"><strong>Resultado {index + 1}</strong>{results.length > 1 && <button onClick={() => setResults(results.filter((_, i) => i !== index))}><Trash2 size={15}/></button>}</div><div className="form-grid"><label className="field"><span>Nivel</span><select value={row.level} onChange={(e) => updateRow(setResults, results, index, { level: e.target.value })}><option value="impact">Impacto</option><option value="outcome">Outcome</option><option value="output">Output</option></select></label><label className="field"><span>Código</span><input value={row.code} onChange={(e) => updateRow(setResults, results, index, { code: e.target.value })}/></label><label className="field field--wide"><span>Título</span><input value={row.title} onChange={(e) => updateRow(setResults, results, index, { title: e.target.value })}/></label></div>{row.indicators.map((ind, indIndex) => <div className="indicator-row" key={indIndex}><input value={ind.code} onChange={(e) => { const indicators = row.indicators.map((item, i) => i === indIndex ? { ...item, code: e.target.value } : item); updateRow(setResults, results, index, { indicators }); }} placeholder="Código"/><input value={ind.name} onChange={(e) => { const indicators = row.indicators.map((item, i) => i === indIndex ? { ...item, name: e.target.value } : item); updateRow(setResults, results, index, { indicators }); }} placeholder="Indicador"/><input value={ind.unit} onChange={(e) => { const indicators = row.indicators.map((item, i) => i === indIndex ? { ...item, unit: e.target.value } : item); updateRow(setResults, results, index, { indicators }); }} placeholder="Unidad"/><input type="number" value={ind.baseline_value} onChange={(e) => { const indicators = row.indicators.map((item, i) => i === indIndex ? { ...item, baseline_value: e.target.value } : item); updateRow(setResults, results, index, { indicators }); }} placeholder="Línea base"/><input type="number" value={ind.target_value} onChange={(e) => { const indicators = row.indicators.map((item, i) => i === indIndex ? { ...item, target_value: e.target.value } : item); updateRow(setResults, results, index, { indicators }); }} placeholder="Meta"/></div>)}</div>)}<button className="secondary-button" onClick={() => setResults([...results, emptyResult()])}><Plus size={16}/> Agregar resultado</button></div></div>}
    {step === 3 && <div className="form-section"><div className="section-title"><span>04</span><div><h2>Territorio</h2><p>Registre puntos de intervención; posteriormente podrán incorporarse polígonos y corredores.</p></div></div>{locations.map((row, index) => <div className="location-editor" key={index}><LocationPicker value={row} onChange={(coords) => updateRow(setLocations, locations, index, coords)}/><div className="form-grid"><label className="field"><span>Departamento</span><input value={row.department} onChange={(e) => updateRow(setLocations, locations, index, { department: e.target.value })}/></label><label className="field"><span>Municipio</span><input value={row.municipality} onChange={(e) => updateRow(setLocations, locations, index, { municipality: e.target.value })}/></label><label className="field"><span>Latitud</span><input type="number" step="any" value={row.latitude} onChange={(e) => updateRow(setLocations, locations, index, { latitude: e.target.value })}/></label><label className="field"><span>Longitud</span><input type="number" step="any" value={row.longitude} onChange={(e) => updateRow(setLocations, locations, index, { longitude: e.target.value })}/></label><label className="field field--wide"><span>Tipo de intervención</span><input value={row.intervention_type} onChange={(e) => updateRow(setLocations, locations, index, { intervention_type: e.target.value })}/></label></div></div>)}<button className="secondary-button" onClick={() => setLocations([...locations, emptyLocation()])}><MapPin size={16}/> Agregar ubicación</button></div>}
    {step === 4 && <div className="form-section"><div className="section-title"><span>05</span><div><h2>Equipo y evidencias</h2><p>Asignaciones de RRHH y archivos iniciales del proyecto.</p></div></div><div className="repeat-list">{staff.map((row, index) => <div className="repeat-card" key={index}><div className="form-grid"><label className="field"><span>Nombre</span><input value={row.full_name} onChange={(e) => updateRow(setStaff, staff, index, { full_name: e.target.value })}/></label><label className="field"><span>Rol en el proyecto</span><input value={row.role_title} onChange={(e) => updateRow(setStaff, staff, index, { role_title: e.target.value })}/></label><label className="field"><span>Correo</span><input type="email" value={row.email} onChange={(e) => updateRow(setStaff, staff, index, { email: e.target.value })}/></label><label className="field"><span>Dedicación %</span><input type="number" min="0" max="100" value={row.allocation_pct} onChange={(e) => updateRow(setStaff, staff, index, { allocation_pct: e.target.value })}/></label></div></div>)}<button className="secondary-button" onClick={() => setStaff([...staff, emptyStaff()])}><Plus size={16}/> Agregar persona</button></div><label className="file-drop"><FileUp size={28}/><strong>Fotografías y documentos</strong><span>PDF, imágenes, Word, Excel, CSV o GeoJSON · máximo 25 MB por archivo</span><input type="file" multiple onChange={(e) => setFiles([...e.target.files])}/><small>{files.length ? `${files.length} archivo(s) seleccionado(s)` : "Seleccionar archivos"}</small></label><div className="review-box"><strong>Antes de registrar</strong><p>El presupuesto se contará una sola vez bajo el área principal. Las ubicaciones mostrarán presencia territorial, no una distribución automática del presupuesto.</p></div></div>}
    {message && <div className="form-error">{message}</div>}<div className="wizard-actions"><button className="secondary-button" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Anterior</button>{step < steps.length - 1 ? <button className="primary-button" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continuar <ArrowRight size={16}/></button> : <button className="primary-button" disabled={busy} onClick={submit}>{busy ? "Registrando…" : "Registrar proyecto"} <Check size={16}/></button>}</div></div></section></div>;
}
EOF

cat > "$ROOT/app/projects/new/page.jsx" <<'EOF'
import { ProjectForm } from "@/components/project-form";
export default function NewProjectPage() { return <ProjectForm/>; }
EOF

cat > "$ROOT/components/project-360.jsx" <<'EOF'
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CircleAlert, FileText, MapPin, Plus, UsersRound, WalletCards, X } from "lucide-react";
import { getProject, recordProjectUpdate } from "@/lib/data";
import { date, money, percent, statusLabel } from "@/lib/format";
import { AlignmentChart, ExecutionChart } from "./charts";

const tabs = ["Resumen", "Marco lógico", "Equipo", "Territorio", "Riesgos e hitos", "Evidencias"];

function Progress({ label, value, tone = "cyan" }) { return <div className="metric-progress"><div><span>{label}</span><strong>{percent(value)}</strong></div><div className={`progress-track progress-track--${tone}`}><span style={{ width: `${Math.min(100, Number(value || 0))}%` }}/></div></div>; }

export function Project360() {
  const { id } = useParams(); const [data, setData] = useState(null); const [tab, setTab] = useState("Resumen"); const [updateOpen, setUpdateOpen] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { getProject(id).then(setData); }, [id]);
  const p = data?.project;
  const timeProgress = useMemo(() => { if (!p) return 0; const start = new Date(p.start_date).getTime(); const end = new Date(p.end_date).getTime(); return Math.max(0, Math.min(100, (Date.now() - start) / (end - start) * 100)); }, [p]);
  const [form, setForm] = useState({ snapshot_date: new Date().toISOString().slice(0, 10), expenditure_amount: 0, commitments_amount: 0, planned_execution_amount: 0, physical_progress_pct: 0, summary: "", achievements: "", bottlenecks: "", next_steps: "", status: "active" });
  useEffect(() => { if (p) setForm((v) => ({ ...v, expenditure_amount: p.spent || 0, commitments_amount: p.commitments || 0, physical_progress_pct: p.physical_progress_pct || 0, status: p.status || "active" })); }, [p]);
  async function saveUpdate() { setSaving(true); setMessage(""); try { await recordProjectUpdate(id, { ...form, budget_amount: p.budget_total, report_date: form.snapshot_date, expenditure_amount: Number(form.expenditure_amount), commitments_amount: Number(form.commitments_amount), planned_execution_amount: Number(form.planned_execution_amount), physical_progress_pct: Number(form.physical_progress_pct) }); setUpdateOpen(false); setData(await getProject(id)); } catch (error) { setMessage(error.message); } finally { setSaving(false); } }
  if (!data || !p) return <div className="skeleton-panel">Cargando Ficha 360°…</div>;
  const projectForRadar = { ...p, time_progress_pct: timeProgress };
  return <div className="page-stack"><Link href="/projects" className="back-link"><ArrowLeft size={15}/> Volver a la cartera</Link><section className="project-hero" style={{ "--accent": p.primary_area_accent || "#69CFD8" }}><div><div className="hero-meta"><span className={`status status--${p.status}`}>{statusLabel[p.status]}</span><span>{p.code}</span><span>{p.primary_area_short_name}</span></div><h1>{p.acronym || p.title}</h1><p>{p.title}</p></div><button className="primary-button" onClick={() => setUpdateOpen(true)}><Plus size={16}/> Registrar corte</button></section><section className="project-facts"><div><WalletCards size={17}/><span>Presupuesto</span><strong>{money(p.budget_total)}</strong></div><div><CalendarDays size={17}/><span>Vigencia</span><strong>{date(p.start_date)} — {date(p.end_date)}</strong></div><div><UsersRound size={17}/><span>Equipo</span><strong>{p.staff_count || data.staff.length} asignaciones</strong></div><div><MapPin size={17}/><span>Territorio</span><strong>{(p.municipalities || data.locations.map((l) => l.municipality)).length} municipios</strong></div></section><nav className="tabs">{tabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
    {tab === "Resumen" && <div className="dashboard-grid dashboard-grid--wide"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">ALINEAMIENTO</span><h2>Tiempo, recursos y resultados</h2></div></div><div className="alignment-layout"><div><Progress label="Tiempo consumido" value={timeProgress} tone="muted"/><Progress label="Ejecución financiera" value={p.execution_pct}/><Progress label="Avance físico" value={p.physical_progress_pct} tone="violet"/><Progress label="Utilización" value={p.utilization_pct} tone="gold"/></div><AlignmentChart project={projectForRadar}/></div></article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">IDENTIDAD</span><h2>Datos del proyecto</h2></div></div><dl className="fact-list"><div><dt>Donante</dt><dd>{p.donor || "—"}</dd></div><div><dt>Coordinación</dt><dd>{p.coordinator || "—"}</dd></div><div><dt>Departamentos</dt><dd>{(p.departments || []).join(", ") || "—"}</dd></div><div><dt>Municipios</dt><dd>{(p.municipalities || []).join(", ") || "—"}</dd></div></dl><p className="summary-text">{p.summary}</p></article><article className="panel panel--chart span-2"><div className="panel-heading"><div><span className="eyebrow">HISTÓRICO</span><h2>Trayectoria financiera</h2></div></div><ExecutionChart rows={(data.snapshots || []).map((s) => ({ month_key: s.snapshot_date?.slice(0, 7), planned: s.planned_execution_amount, spent: s.expenditure_amount, commitments: s.commitments_amount }))}/></article><article className="panel span-2"><div className="panel-heading"><div><span className="eyebrow">COMPONENTES</span><h2>Arquitectura operativa</h2></div></div><div className="component-grid">{data.components.map((c) => <div className="component-card" key={c.id}><span>{c.code}</span><h3>{c.title}</h3><p>{c.description}</p><Progress label="Avance" value={c.progress_pct}/></div>)}</div></article></div>}
    {tab === "Marco lógico" && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">RESULTS CHAIN</span><h2>Matriz de resultados e indicadores</h2></div></div><div className="results-tree">{data.results.map((r) => <div className="result-node" key={r.id}><div className="result-node-head"><span>{r.level}</span><strong>{r.code} · {r.title}</strong></div><p>{r.description}</p><div className="indicator-list">{data.indicators.filter((i) => i.result_id === r.id).map((i) => { const value = i.target_value ? Number(i.current_value || 0) / Number(i.target_value) * 100 : 0; return <div key={i.id}><span>{i.code}</span><div><strong>{i.name}</strong><small>{i.current_value ?? 0} / {i.target_value ?? "—"} {i.unit}</small></div><Progress label="Cumplimiento" value={value}/></div>; })}</div></div>)}</div></section>}
    {tab === "Equipo" && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">HUMAN RESOURCES</span><h2>Asignaciones al proyecto</h2></div></div><div className="people-grid">{data.staff.map((s) => <article key={s.id}><div className="avatar">{s.full_name?.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div><div><strong>{s.full_name}</strong><span>{s.role_title || s.title}</span><small>{s.contract_type} · {s.allocation_pct}% de dedicación</small></div></article>)}</div></section>}
    {tab === "Territorio" && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">FIELD FOOTPRINT</span><h2>Intervenciones registradas</h2></div></div><div className="location-list">{data.locations.map((l) => <article key={l.id}><MapPin size={18}/><div><strong>{l.municipality || l.location_name}</strong><span>{l.department}</span><small>{l.intervention_type}</small></div><code>{Number(l.latitude).toFixed(4)}, {Number(l.longitude).toFixed(4)}</code></article>)}</div></section>}
    {tab === "Riesgos e hitos" && <div className="dashboard-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">RISK REGISTER</span><h2>Riesgos activos</h2></div></div><div className="risk-list">{data.risks.map((r) => <article key={r.id}><CircleAlert size={18}/><div><span className={`status status--${r.level === "critical" ? "critical" : "attention"}`}>{r.level}</span><h3>{r.title}</h3><p>{r.description}</p><small>Mitigación: {r.mitigation}</small></div></article>)}</div></section><section className="panel"><div className="panel-heading"><div><span className="eyebrow">MILESTONES</span><h2>Próximos hitos</h2></div></div><div className="milestone-list">{data.milestones.map((m) => <article key={m.id}><time>{date(m.due_date)}</time><div><strong>{m.title}</strong><span>{m.responsible}</span></div></article>)}</div></section></div>}
    {tab === "Evidencias" && <section className="panel"><div className="panel-heading"><div><span className="eyebrow">EVIDENCE VAULT</span><h2>Documentos y fotografías</h2></div></div>{data.assets.length ? <div className="asset-grid">{data.assets.map((a) => <a href={a.external_url} target="_blank" rel="noreferrer" key={a.id}><FileText size={20}/><div><strong>{a.title}</strong><span>{a.asset_type}</span></div></a>)}</div> : <div className="empty-state"><FileText size={30}/><strong>Sin evidencias registradas</strong><p>Los archivos cargados desde el formulario aparecerán en esta sección.</p></div>}</section>}
    {updateOpen && <div className="modal-backdrop"><div className="drawer"><div className="drawer-head"><div><span className="eyebrow">NEW SNAPSHOT</span><h2>Registrar corte periódico</h2></div><button onClick={() => setUpdateOpen(false)}><X size={18}/></button></div><div className="form-grid"><label className="field"><span>Fecha de corte</span><input type="date" value={form.snapshot_date} onChange={(e) => setForm({ ...form, snapshot_date: e.target.value })}/></label><label className="field"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">En curso</option><option value="attention">Atención</option><option value="critical">Crítico</option><option value="closing">En cierre</option><option value="closed">Cerrado</option></select></label><label className="field"><span>Gasto acumulado</span><input type="number" value={form.expenditure_amount} onChange={(e) => setForm({ ...form, expenditure_amount: e.target.value })}/></label><label className="field"><span>Compromisos</span><input type="number" value={form.commitments_amount} onChange={(e) => setForm({ ...form, commitments_amount: e.target.value })}/></label><label className="field"><span>Avance físico %</span><input type="number" min="0" max="100" value={form.physical_progress_pct} onChange={(e) => setForm({ ...form, physical_progress_pct: e.target.value })}/></label><label className="field field--wide"><span>Resumen del período</span><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}/></label><label className="field field--wide"><span>Principales logros</span><textarea value={form.achievements} onChange={(e) => setForm({ ...form, achievements: e.target.value })}/></label><label className="field field--wide"><span>Cuellos de botella</span><textarea value={form.bottlenecks} onChange={(e) => setForm({ ...form, bottlenecks: e.target.value })}/></label><label className="field field--wide"><span>Próximos pasos</span><textarea value={form.next_steps} onChange={(e) => setForm({ ...form, next_steps: e.target.value })}/></label></div>{message && <div className="form-error">{message}</div>}<button className="primary-button full-button" disabled={saving} onClick={saveUpdate}>{saving ? "Guardando…" : "Guardar corte"}</button></div></div>}
  </div>;
}
EOF

cat > "$ROOT/app/projects/'[id]'/page.jsx" <<'EOF'
import { Project360 } from "@/components/project-360";
export default function ProjectPage() { return <Project360/>; }
EOF

cat > "$ROOT/app/globals.css" <<'EOF'
:root { --bg:#070B10; --bg2:#0A1016; --panel:#0D141C; --panel2:#101923; --line:#21303D; --line2:#2C3C49; --text:#EDF4F7; --muted:#8A9AA8; --muted2:#647482; --cyan:#69CFD8; --violet:#A999E5; --gold:#E5B86B; --red:#E77C7C; --green:#72D6C9; --radius:18px; }
* { box-sizing:border-box; }
html { background:var(--bg); color-scheme:dark; }
body { margin:0; min-height:100vh; background:radial-gradient(circle at 74% -10%, rgba(69,112,139,.15), transparent 34%), linear-gradient(180deg,#080D12,#06090D); color:var(--text); font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
a { color:inherit; text-decoration:none; }
button,input,select,textarea { font:inherit; }
button { color:inherit; }
.shell { min-height:100vh; display:grid; grid-template-columns:260px minmax(0,1fr); }
.sidebar { position:sticky; top:0; height:100vh; border-right:1px solid rgba(255,255,255,.075); background:rgba(7,12,17,.92); backdrop-filter:blur(20px); padding:22px 16px; z-index:30; display:flex; flex-direction:column; }
.brand { display:flex; align-items:center; gap:12px; padding:2px 7px 24px; }
.brand img { border-radius:14px; }
.brand div { display:grid; gap:3px; }
.brand strong { font-size:14px; letter-spacing:.02em; }
.brand span { font-size:10px; text-transform:uppercase; letter-spacing:.15em; color:var(--muted); }
.nav-list { display:grid; gap:6px; }
.nav-item { display:flex; align-items:center; gap:12px; min-height:44px; padding:0 12px; border:1px solid transparent; border-radius:12px; color:#91A1AF; font-size:13px; transition:.2s ease; }
.nav-item:hover { background:rgba(255,255,255,.035); color:var(--text); }
.nav-item--active { color:var(--text); background:linear-gradient(90deg,rgba(105,207,216,.12),rgba(105,207,216,.035)); border-color:rgba(105,207,216,.18); }
.nav-item--active svg:first-child { color:var(--cyan); }
.nav-arrow { margin-left:auto; opacity:.45; }
.sidebar-status { margin-top:auto; border:1px solid var(--line); border-radius:14px; padding:13px; display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,.02); }
.sidebar-status div { display:grid; gap:3px; }
.sidebar-status strong { font-size:11px; }
.sidebar-status small { color:var(--muted); font-size:10px; }
.status-dot { width:7px; height:7px; margin-top:3px; border-radius:50%; background:var(--green); box-shadow:0 0 14px rgba(114,214,201,.7); }
.workspace { min-width:0; }
.topbar { position:sticky; top:0; z-index:20; height:64px; display:flex; align-items:center; justify-content:space-between; padding:0 28px; border-bottom:1px solid rgba(255,255,255,.065); background:rgba(7,11,16,.78); backdrop-filter:blur(22px); }
.topbar-title { display:flex; align-items:center; gap:9px; color:#A7B5C0; font-size:11px; text-transform:uppercase; letter-spacing:.11em; }
.demo-chip { display:flex; align-items:center; gap:7px; border:1px solid rgba(229,184,107,.25); background:rgba(229,184,107,.07); color:#EACB94; padding:7px 10px; border-radius:999px; font-size:9px; letter-spacing:.13em; }
.demo-chip span { width:5px; height:5px; background:var(--gold); border-radius:50%; }
.main-content { max-width:1700px; margin:0 auto; padding:36px 34px 64px; }
.page-stack { display:grid; gap:24px; }
.page-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:30px; }
.page-heading h1 { margin:6px 0 8px; font-size:clamp(31px,3.2vw,52px); line-height:1; letter-spacing:-.045em; font-weight:600; }
.page-heading p { margin:0; color:var(--muted); max-width:740px; font-size:14px; line-height:1.6; }
.eyebrow { color:#7FA2B7; font-size:9px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; }
.primary-button,.secondary-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:42px; border-radius:12px; padding:0 15px; border:1px solid transparent; cursor:pointer; font-size:12px; font-weight:650; transition:.2s ease; }
.primary-button { color:#071116; background:linear-gradient(135deg,#E8F3F5,#9ECED3); box-shadow:0 10px 30px rgba(105,207,216,.08); }
.primary-button:hover { transform:translateY(-1px); box-shadow:0 14px 34px rgba(105,207,216,.14); }
.primary-button:disabled,.secondary-button:disabled { opacity:.42; cursor:not-allowed; transform:none; }
.secondary-button { background:#101922; border-color:var(--line2); color:#C7D2D9; }
.icon-button { border:0; background:transparent; padding:8px; display:grid; place-items:center; cursor:pointer; }
.mobile-menu,.sidebar-close { display:none; }
.kpi-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
.kpi-card { min-height:126px; display:flex; gap:14px; padding:19px; border:1px solid var(--line); border-radius:var(--radius); background:linear-gradient(145deg,rgba(16,25,34,.93),rgba(10,16,22,.9)); box-shadow:inset 0 1px rgba(255,255,255,.025); }
.kpi-icon { width:34px; height:34px; display:grid; place-items:center; border:1px solid #2B3D4A; border-radius:11px; color:var(--cyan); background:#0B131A; }
.kpi-card div:last-child { display:grid; align-content:start; gap:6px; }
.kpi-card span,.kpi-card small { color:var(--muted); font-size:10px; }
.kpi-card strong { font-size:23px; letter-spacing:-.04em; font-weight:600; }
.area-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
.area-card { position:relative; overflow:hidden; padding:18px; min-height:178px; border:1px solid var(--line); border-radius:var(--radius); background:linear-gradient(150deg,color-mix(in srgb,var(--accent) 8%,#0D141C),#0A1117 72%); }
.area-card:before { content:""; position:absolute; inset:0 auto 0 0; width:2px; background:var(--accent); }
.area-card-top { display:flex; justify-content:space-between; color:var(--accent); font-size:10px; letter-spacing:.12em; }
.area-card h3 { margin:13px 0 17px; font-size:17px; font-weight:550; }
.area-metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
.area-metrics div { display:grid; gap:3px; }
.area-metrics strong { font-size:14px; }
.area-metrics span,.area-card small { color:var(--muted); font-size:9px; }
.progress-track { height:5px; margin:15px 0 8px; background:#19232D; border-radius:99px; overflow:hidden; }
.progress-track span { display:block; height:100%; background:linear-gradient(90deg,var(--cyan),#A9E0E5); border-radius:99px; }
.progress-track--violet span { background:linear-gradient(90deg,var(--violet),#CDC4F4); }
.progress-track--gold span { background:linear-gradient(90deg,var(--gold),#F0D49F); }
.progress-track--muted span { background:linear-gradient(90deg,#667A8C,#91A3B2); }
.dashboard-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.dashboard-grid--wide { grid-template-columns:minmax(0,1.55fr) minmax(320px,.75fr); }
.panel { border:1px solid var(--line); border-radius:var(--radius); padding:20px; background:linear-gradient(145deg,rgba(14,22,30,.95),rgba(9,15,21,.92)); min-width:0; }
.panel--chart { overflow:hidden; }
.panel-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:12px; }
.panel-heading h2 { margin:5px 0 0; font-size:17px; font-weight:550; letter-spacing:-.025em; }
.panel-heading > a { color:#9CB7C7; font-size:11px; }
.data-cut { color:var(--muted); font-size:9px; }
.panel-note { margin:10px 0 0; border-top:1px solid rgba(255,255,255,.06); padding-top:11px; color:var(--muted2); font-size:9px; line-height:1.5; }
.alert-list,.territory-list { display:grid; }
.alert-row { display:grid; grid-template-columns:auto 1fr auto; gap:13px; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.055); }
.alert-row:last-child { border:0; }
.alert-row div { min-width:0; }
.alert-row strong { font-size:12px; }
.alert-row p { margin:3px 0 0; color:var(--muted); font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.status { display:inline-flex; align-items:center; justify-content:center; min-width:64px; padding:5px 8px; border-radius:999px; font-size:8px; text-transform:uppercase; letter-spacing:.09em; border:1px solid; }
.status--active { color:#8FE2D6; border-color:rgba(114,214,201,.25); background:rgba(114,214,201,.07); }
.status--attention,.status--medium { color:#E9C887; border-color:rgba(229,184,107,.28); background:rgba(229,184,107,.08); }
.status--critical,.status--high { color:#F09A9A; border-color:rgba(231,124,124,.28); background:rgba(231,124,124,.08); }
.status--closing { color:#B9ACEA; border-color:rgba(169,153,229,.28); background:rgba(169,153,229,.08); }
.status--draft,.status--closed { color:#9CABB7; border-color:#33414D; background:#111922; }
.territory-list div { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid rgba(255,255,255,.055); font-size:11px; }
.territory-list div:last-child { border:0; }
.territory-list span { color:#C6D0D7; }.territory-list strong { color:var(--muted); font-weight:500; }
.table-wrap { overflow:auto; }
.data-table { width:100%; border-collapse:collapse; min-width:830px; }
.data-table th { padding:12px 10px; color:#748492; font-size:8px; letter-spacing:.13em; text-transform:uppercase; text-align:left; border-bottom:1px solid var(--line); }
.data-table td { padding:13px 10px; color:#B8C3CB; font-size:10px; border-bottom:1px solid rgba(255,255,255,.045); }
.data-table tr:last-child td { border:0; }
.data-table td:first-child a { display:grid; gap:3px; min-width:190px; }
.data-table td:first-child strong { color:var(--text); font-size:11px; }.data-table td:first-child span { color:var(--muted2); font-size:8px; }
.filter-bar { display:flex; align-items:center; gap:10px; padding:11px; border:1px solid var(--line); border-radius:15px; background:#0B1219; }
.filter-bar > label { height:40px; display:flex; align-items:center; gap:8px; border:1px solid #263542; background:#0A1117; border-radius:10px; padding:0 11px; }
.filter-bar select,.filter-bar input { border:0; outline:0; background:transparent; color:#C5D0D8; font-size:11px; }
.search-box { flex:1; min-width:200px; }.search-box input { width:100%; }
.view-switch { margin-left:auto; display:flex; border:1px solid #263542; border-radius:10px; padding:3px; }
.view-switch button { width:34px; height:32px; border:0; border-radius:7px; background:transparent; color:var(--muted); cursor:pointer; }.view-switch button.active { background:#18232C; color:var(--cyan); }
.result-count { color:var(--muted); font-size:11px; }.result-count strong { color:var(--text); }
.project-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
.project-card { position:relative; display:block; min-height:310px; padding:20px; border:1px solid var(--line); border-radius:var(--radius); background:linear-gradient(150deg,color-mix(in srgb,var(--accent) 6%,#0E161E),#090F15 72%); transition:.22s ease; }
.project-card:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--accent) 42%,#263642); box-shadow:0 24px 50px rgba(0,0,0,.22); }
.project-card:before { content:""; position:absolute; left:0; top:24px; bottom:24px; width:2px; background:var(--accent); }
.project-card-head { display:flex; justify-content:space-between; align-items:center; }
.project-code { display:block; margin-top:22px; color:var(--muted); font-size:9px; letter-spacing:.1em; }.project-card h2 { margin:8px 0 5px; font-size:25px; letter-spacing:-.04em; }.project-card > p { min-height:48px; margin:0; color:#97A5B0; font-size:11px; line-height:1.55; }
.project-card-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-top:18px; }.project-card-kpis div { display:grid; gap:4px; }.project-card-kpis span { color:var(--muted2); font-size:8px; }.project-card-kpis strong { font-size:11px; }
.project-card-foot { display:flex; flex-wrap:wrap; gap:8px 14px; color:var(--muted); font-size:8px; }
.geo-count { display:grid; grid-template-columns:auto auto; gap:0 8px; align-items:center; padding:10px 14px; border:1px solid var(--line); border-radius:13px; }.geo-count svg { grid-row:1/3; color:var(--cyan); }.geo-count strong { font-size:18px; }.geo-count span { font-size:9px; color:var(--muted); }
.geo-layout { display:grid; grid-template-columns:280px minmax(0,1fr); min-height:690px; border:1px solid var(--line); border-radius:20px; overflow:hidden; background:#080D12; }
.geo-sidebar { padding:17px; border-right:1px solid var(--line); overflow:auto; }.geo-filter-title { display:flex; align-items:center; gap:8px; margin-bottom:13px; font-size:11px; }.geo-sidebar .search-box { display:flex; align-items:center; gap:8px; height:40px; padding:0 10px; border:1px solid #263542; border-radius:10px; margin-bottom:13px; }.geo-sidebar .search-box input { border:0; outline:0; background:transparent; color:var(--text); width:100%; font-size:10px; }
.field { display:grid; gap:6px; }.field > span { color:#81919F; font-size:9px; letter-spacing:.03em; }.field input,.field select,.field textarea { width:100%; border:1px solid #283844; border-radius:10px; background:#0A1117; color:#E0E8EC; padding:10px 11px; outline:0; font-size:11px; }.field textarea { min-height:82px; resize:vertical; }.field input:focus,.field select:focus,.field textarea:focus { border-color:#557F91; box-shadow:0 0 0 3px rgba(105,207,216,.06); }
.geo-sidebar > .field { margin-bottom:12px; }.legend { display:grid; gap:9px; margin:18px 0; padding:14px 0; border-block:1px solid rgba(255,255,255,.06); }.legend strong { font-size:10px; }.legend span { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:9px; }.dot { width:9px; height:9px; border-radius:50%; display:inline-block; }.dot--one { background:var(--green); }.dot--two { background:var(--gold); }.dot--three { background:var(--red); }
.convergence-list button { width:100%; display:flex; justify-content:space-between; align-items:center; border:0; border-bottom:1px solid rgba(255,255,255,.05); padding:10px 0; background:transparent; text-align:left; cursor:pointer; }.convergence-list button span { display:grid; gap:3px; font-size:10px; }.convergence-list button small { color:var(--muted2); font-size:8px; }.convergence-list button strong { width:25px; height:25px; display:grid; place-items:center; border-radius:50%; background:#15212A; color:var(--cyan); font-size:10px; }
.map-stage { position:relative; min-width:0; }.map-canvas { position:absolute; inset:0; }.map-note { position:absolute; left:14px; bottom:14px; max-width:430px; padding:9px 12px; border:1px solid rgba(255,255,255,.1); border-radius:10px; background:rgba(8,13,18,.82); backdrop-filter:blur(12px); color:#91A1AD; font-size:8px; line-height:1.5; }.map-detail { position:absolute; right:15px; top:15px; width:260px; padding:17px; border:1px solid #2C3D49; border-radius:15px; background:rgba(10,16,22,.93); backdrop-filter:blur(18px); box-shadow:0 24px 70px rgba(0,0,0,.4); }.map-detail > button { position:absolute; right:10px; top:8px; border:0; background:transparent; cursor:pointer; }.map-detail h3 { margin:6px 0 2px; }.map-detail p { color:var(--muted); font-size:9px; }.map-detail div { display:grid; margin:14px 0; }.map-detail div strong { font-size:28px; color:var(--cyan); }.map-detail div span { color:var(--muted); font-size:9px; }.map-detail a { display:inline-flex; gap:5px; align-items:center; color:#B5D8DD; font-size:10px; }
.back-link { width:max-content; display:flex; gap:7px; align-items:center; color:var(--muted); font-size:10px; }.project-hero { position:relative; overflow:hidden; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; min-height:220px; padding:28px; border:1px solid var(--line); border-radius:22px; background:radial-gradient(circle at 82% 20%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 34%),linear-gradient(145deg,#111B24,#090F15); }.project-hero:before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent); }.hero-meta { display:flex; flex-wrap:wrap; gap:9px; align-items:center; color:var(--muted); font-size:9px; text-transform:uppercase; letter-spacing:.08em; }.project-hero h1 { margin:17px 0 6px; font-size:clamp(36px,5vw,70px); letter-spacing:-.06em; line-height:.9; }.project-hero p { margin:0; color:#A7B4BE; max-width:760px; }
.project-facts { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }.project-facts > div { display:grid; grid-template-columns:auto 1fr; gap:4px 10px; padding:16px; border:1px solid var(--line); border-radius:14px; background:#0C131A; }.project-facts svg { grid-row:1/3; color:var(--cyan); }.project-facts span { color:var(--muted); font-size:9px; }.project-facts strong { font-size:11px; }
.tabs { display:flex; gap:4px; overflow:auto; padding:4px; border:1px solid var(--line); border-radius:13px; background:#0A1117; }.tabs button { white-space:nowrap; border:0; border-radius:9px; padding:10px 13px; background:transparent; color:var(--muted); cursor:pointer; font-size:10px; }.tabs button.active { background:#15212A; color:var(--text); }
.alignment-layout { display:grid; grid-template-columns:1fr 280px; align-items:center; gap:20px; }.metric-progress { margin-bottom:18px; }.metric-progress > div:first-child { display:flex; justify-content:space-between; font-size:10px; }.metric-progress span { color:var(--muted); }.metric-progress .progress-track { margin-top:8px; }
.fact-list { margin:0; display:grid; }.fact-list div { display:grid; grid-template-columns:110px 1fr; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.05); }.fact-list dt { color:var(--muted); font-size:9px; }.fact-list dd { margin:0; font-size:10px; }.summary-text { color:#9DABB5; font-size:11px; line-height:1.65; }.span-2 { grid-column:1/-1; }
.component-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }.component-card { padding:15px; border:1px solid #263642; border-radius:13px; background:#0A1117; }.component-card > span { color:var(--cyan); font-size:9px; }.component-card h3 { margin:8px 0; font-size:12px; }.component-card p { min-height:46px; margin:0; color:var(--muted); font-size:9px; line-height:1.5; }
.results-tree { display:grid; gap:12px; }.result-node { padding:17px; border:1px solid #263642; border-radius:14px; background:#0A1117; }.result-node-head { display:flex; align-items:center; gap:10px; }.result-node-head span { padding:5px 7px; border-radius:7px; background:#15232D; color:var(--cyan); font-size:8px; text-transform:uppercase; }.result-node-head strong { font-size:12px; }.result-node > p { color:var(--muted); font-size:9px; }.indicator-list { display:grid; gap:8px; margin-top:12px; }.indicator-list > div { display:grid; grid-template-columns:58px minmax(180px,1fr) minmax(180px,.7fr); gap:12px; align-items:center; padding:11px; border:1px solid rgba(255,255,255,.06); border-radius:10px; }.indicator-list > div > span { color:var(--muted); font-size:8px; }.indicator-list > div > div:nth-child(2) { display:grid; gap:3px; }.indicator-list strong { font-size:10px; }.indicator-list small { color:var(--muted); font-size:8px; }.indicator-list .metric-progress { margin:0; }
.people-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }.people-grid article { display:flex; align-items:center; gap:11px; padding:13px; border:1px solid #263642; border-radius:13px; background:#0A1117; }.avatar { width:38px; height:38px; display:grid; place-items:center; border-radius:50%; background:linear-gradient(135deg,#23404B,#17232C); color:#AEE1E5; font-size:10px; }.people-grid article > div:last-child { display:grid; gap:3px; }.people-grid strong { font-size:10px; }.people-grid span,.people-grid small { color:var(--muted); font-size:8px; }
.location-list,.asset-grid { display:grid; gap:8px; }.location-list article { display:grid; grid-template-columns:auto 1fr auto; gap:12px; align-items:center; padding:12px; border:1px solid #263642; border-radius:12px; background:#0A1117; }.location-list svg { color:var(--cyan); }.location-list div { display:grid; gap:3px; }.location-list strong { font-size:10px; }.location-list span,.location-list small { color:var(--muted); font-size:8px; }.location-list code { color:#7F91A0; font-size:8px; }
.risk-list,.milestone-list { display:grid; gap:9px; }.risk-list article { display:flex; gap:12px; padding:13px; border:1px solid #3A3032; border-radius:12px; background:rgba(231,124,124,.035); }.risk-list svg { color:var(--red); flex:none; }.risk-list h3 { margin:8px 0 4px; font-size:11px; }.risk-list p,.risk-list small { color:var(--muted); font-size:8px; line-height:1.5; }.milestone-list article { display:grid; grid-template-columns:90px 1fr; gap:12px; padding:13px 0; border-bottom:1px solid rgba(255,255,255,.05); }.milestone-list time { color:var(--cyan); font-size:9px; }.milestone-list div { display:grid; gap:3px; }.milestone-list strong { font-size:10px; }.milestone-list span { color:var(--muted); font-size:8px; }
.asset-grid { grid-template-columns:repeat(3,1fr); }.asset-grid a { display:flex; gap:10px; padding:14px; border:1px solid #263642; border-radius:12px; }.asset-grid div { display:grid; gap:3px; }.asset-grid strong { font-size:10px; }.asset-grid span { color:var(--muted); font-size:8px; }.empty-state { min-height:260px; display:grid; place-items:center; align-content:center; text-align:center; color:var(--muted); }.empty-state strong { color:var(--text); margin-top:10px; }.empty-state p { font-size:10px; }
.wizard { border:1px solid var(--line); border-radius:20px; background:#0A1117; overflow:hidden; }.stepper { list-style:none; display:grid; grid-template-columns:repeat(5,1fr); margin:0; padding:18px; border-bottom:1px solid var(--line); }.stepper li { position:relative; display:flex; align-items:center; gap:8px; color:var(--muted2); font-size:9px; }.stepper li:after { content:""; position:absolute; left:34px; right:10px; top:13px; height:1px; background:#23323E; }.stepper li:last-child:after { display:none; }.stepper li > span { position:relative; z-index:1; width:27px; height:27px; display:grid; place-items:center; border:1px solid #30404D; border-radius:50%; background:#0A1117; }.stepper li.active { color:var(--text); }.stepper li.active > span { border-color:var(--cyan); color:var(--cyan); box-shadow:0 0 0 4px rgba(105,207,216,.07); }.stepper li.done > span { background:var(--cyan); color:#071116; border-color:var(--cyan); }.wizard-body { padding:26px; }.form-section { display:grid; gap:22px; }.section-title { display:flex; gap:13px; align-items:flex-start; }.section-title > span { width:34px; height:34px; display:grid; place-items:center; border:1px solid #30414D; border-radius:10px; color:var(--cyan); font-size:9px; }.section-title h2 { margin:0 0 4px; font-size:17px; }.section-title p { margin:0; color:var(--muted); font-size:9px; }.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }.field--wide { grid-column:1/-1; }.field--grow { min-width:0; }.repeat-list { display:grid; gap:11px; }.repeat-card { padding:15px; border:1px solid #263642; border-radius:14px; background:#090F15; }.repeat-card-head { display:flex; justify-content:space-between; margin-bottom:12px; font-size:10px; }.repeat-card-head button { border:0; background:transparent; color:var(--red); cursor:pointer; }.indicator-row { display:grid; grid-template-columns:100px 2fr 100px 100px 100px; gap:8px; margin-top:10px; }.indicator-row input { min-width:0; border:1px solid #283844; border-radius:9px; background:#0B1218; color:var(--text); padding:9px; font-size:9px; }.location-editor { display:grid; grid-template-columns:minmax(340px,1fr) minmax(300px,.8fr); gap:16px; padding:14px; border:1px solid #263642; border-radius:14px; background:#090F15; }.location-picker { min-height:360px; border-radius:12px; overflow:hidden; }.file-drop { min-height:170px; display:grid; place-items:center; align-content:center; gap:7px; border:1px dashed #3B5363; border-radius:15px; background:rgba(105,207,216,.025); text-align:center; cursor:pointer; }.file-drop svg { color:var(--cyan); }.file-drop span { color:var(--muted); font-size:9px; }.file-drop input { display:none; }.file-drop small { margin-top:5px; padding:7px 10px; border-radius:8px; background:#17232C; color:#BDD0D9; font-size:9px; }.review-box { padding:14px; border:1px solid rgba(229,184,107,.22); border-radius:12px; background:rgba(229,184,107,.035); }.review-box strong { color:#E9C887; font-size:10px; }.review-box p { margin:6px 0 0; color:var(--muted); font-size:9px; line-height:1.55; }.wizard-actions { display:flex; justify-content:space-between; margin-top:26px; padding-top:18px; border-top:1px solid var(--line); }.form-error { padding:11px; margin-top:14px; border:1px solid rgba(231,124,124,.3); border-radius:10px; background:rgba(231,124,124,.07); color:#F1AAAA; font-size:10px; }
.modal-backdrop { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.62); backdrop-filter:blur(8px); }.drawer { position:absolute; right:0; top:0; bottom:0; width:min(570px,100%); overflow:auto; padding:24px; background:#0A1117; border-left:1px solid var(--line); }.drawer-head { display:flex; justify-content:space-between; margin-bottom:20px; }.drawer-head h2 { margin:5px 0 0; }.drawer-head button { border:0; background:transparent; cursor:pointer; }.full-button { width:100%; margin-top:16px; }.skeleton-panel { min-height:340px; display:grid; place-items:center; border:1px solid var(--line); border-radius:var(--radius); color:var(--muted); background:#0C131A; }.backdrop { display:none; }
@media (max-width:1200px) { .kpi-grid { grid-template-columns:repeat(3,1fr); }.project-grid { grid-template-columns:repeat(2,1fr); }.component-grid { grid-template-columns:repeat(2,1fr); }.people-grid { grid-template-columns:repeat(2,1fr); }.dashboard-grid--wide { grid-template-columns:1fr; }.area-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:900px) { .shell { grid-template-columns:1fr; }.sidebar { position:fixed; left:0; top:0; width:270px; transform:translateX(-102%); transition:.22s ease; }.sidebar--open { transform:translateX(0); }.sidebar-close,.mobile-menu { display:grid; }.sidebar-close { margin-left:auto; }.backdrop { display:block; position:fixed; inset:0; z-index:25; border:0; background:rgba(0,0,0,.5); }.topbar { padding:0 18px; justify-content:flex-start; gap:12px; }.demo-chip { margin-left:auto; }.main-content { padding:26px 18px 50px; }.geo-layout { grid-template-columns:1fr; }.geo-sidebar { border-right:0; border-bottom:1px solid var(--line); }.map-stage { min-height:620px; }.project-facts { grid-template-columns:repeat(2,1fr); }.alignment-layout { grid-template-columns:1fr; }.location-editor { grid-template-columns:1fr; }.stepper small { display:none; }.stepper li:after { right:6px; }.indicator-row { grid-template-columns:1fr 2fr 1fr; }.indicator-row input:nth-last-child(-n+2) { grid-column:auto; } }
@media (max-width:620px) { .page-heading { align-items:flex-start; flex-direction:column; }.kpi-grid,.area-grid,.project-grid,.dashboard-grid,.project-facts,.people-grid,.asset-grid { grid-template-columns:1fr; }.filter-bar { align-items:stretch; flex-direction:column; }.view-switch { margin-left:0; width:max-content; }.component-grid { grid-template-columns:1fr; }.form-grid { grid-template-columns:1fr; }.field--wide { grid-column:auto; }.indicator-row { grid-template-columns:1fr; }.location-picker { min-height:300px; }.wizard-body { padding:18px; }.project-hero { align-items:flex-start; flex-direction:column; }.topbar-title span { display:none; }.map-detail { left:12px; right:12px; width:auto; }.indicator-list > div { grid-template-columns:1fr; } }
EOF

cat > "$ROOT/app/loading.jsx" <<'EOF'
export default function Loading() { return <div className="skeleton-panel">Cargando inteligencia de cartera…</div>; }
EOF

cat > "$ROOT/app/not-found.jsx" <<'EOF'
import Link from "next/link";
export default function NotFound() { return <div className="empty-state"><strong>Contenido no encontrado</strong><p>La ruta o el proyecto solicitado no está disponible.</p><Link className="primary-button" href="/projects">Volver a la cartera</Link></div>; }
EOF

cat > "$ROOT/supabase/migrations/202608260001_geoportal_contract.sql" <<'EOF'
-- Contrato reproducible del MVP. La instancia conectada ya contiene una versión ampliada.
create extension if not exists pgcrypto;
create extension if not exists postgis;

do $$ begin create type public.portfolio_project_status as enum ('draft','active','attention','critical','closing','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type public.portfolio_result_level as enum ('impact','outcome','output'); exception when duplicate_object then null; end $$;
do $$ begin create type public.portfolio_indicator_status as enum ('not_started','on_track','attention','off_track','achieved'); exception when duplicate_object then null; end $$;
do $$ begin create type public.portfolio_location_geometry_type as enum ('point','municipality','polygon','corridor','landscape','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.portfolio_asset_type as enum ('document','photo','map','dataset','link','other'); exception when duplicate_object then null; end $$;
do $$ begin create type public.portfolio_risk_level as enum ('low','medium','high','critical'); exception when duplicate_object then null; end $$;

create table if not exists public.portfolio_programmatic_areas (id smallserial primary key, code text unique not null, slug text unique not null, name text not null, short_name text not null, description text not null default '', accent text not null default '#69CFD8', sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_projects (id uuid primary key default gen_random_uuid(), code text unique not null, acronym text not null default '', title text not null, summary text not null default '', country text not null default 'Honduras', donor text not null default '', coordinator text not null default '', start_date date not null, end_date date not null, currency text not null default 'USD', budget_total numeric(18,2) not null default 0, status public.portfolio_project_status not null default 'draft', is_demo boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (end_date >= start_date));
create table if not exists public.portfolio_project_programmatic_areas (project_id uuid references public.portfolio_projects on delete cascade, area_id smallint references public.portfolio_programmatic_areas, is_primary boolean not null default false, contribution_pct numeric(5,2) not null default 0, created_at timestamptz not null default now(), primary key(project_id,area_id));
create unique index if not exists portfolio_one_primary_area on public.portfolio_project_programmatic_areas(project_id) where is_primary;
create table if not exists public.portfolio_project_components (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, code text not null, title text not null, description text not null default '', budget_allocated numeric(18,2) not null default 0, progress_pct numeric(5,2) not null default 0, sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_results (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, parent_result_id uuid references public.portfolio_results on delete set null, code text not null, level public.portfolio_result_level not null, title text not null, description text not null default '', sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_indicators (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, result_id uuid not null references public.portfolio_results on delete cascade, code text not null, name text not null, definition text not null default '', unit text not null default '', baseline_value numeric, target_value numeric, current_value numeric, direction text not null default 'increase', frequency text not null default 'quarterly', data_source text not null default '', status public.portfolio_indicator_status not null default 'not_started', last_measured_at date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_staff_members (id uuid primary key default gen_random_uuid(), full_name text not null, email text not null default '', title text not null default '', contract_type text not null default '', active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists portfolio_staff_email_unique on public.portfolio_staff_members(lower(email)) where email <> '';
create table if not exists public.portfolio_project_staff (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, staff_id uuid not null references public.portfolio_staff_members, role_title text not null, allocation_pct numeric(5,2) not null default 100, start_date date, end_date date, created_at timestamptz not null default now());
create table if not exists public.portfolio_project_locations (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, geometry_type public.portfolio_location_geometry_type not null default 'point', department text not null default '', municipality text not null default '', municipality_code text not null default '', location_name text not null default '', intervention_type text not null default '', latitude double precision, longitude double precision, geom geometry(Geometry,4326), notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists portfolio_locations_geom_gix on public.portfolio_project_locations using gist(geom);
create table if not exists public.portfolio_financial_snapshots (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, snapshot_date date not null, budget_amount numeric(18,2) not null default 0, planned_execution_amount numeric(18,2) not null default 0, expenditure_amount numeric(18,2) not null default 0, commitments_amount numeric(18,2) not null default 0, notes text not null default '', created_at timestamptz not null default now(), unique(project_id,snapshot_date));
create table if not exists public.portfolio_project_updates (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, report_date date not null, physical_progress_pct numeric(5,2) not null default 0, summary text not null default '', achievements text not null default '', bottlenecks text not null default '', next_steps text not null default '', created_at timestamptz not null default now(), unique(project_id,report_date));
create table if not exists public.portfolio_risks (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, title text not null, description text not null default '', level public.portfolio_risk_level not null default 'medium', probability int not null default 1, impact int not null default 1, mitigation text not null default '', owner text not null default '', status text not null default 'open', due_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_project_milestones (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, title text not null, milestone_type text not null default '', due_date date not null, status text not null default 'planned', responsible text not null default '', completed_at date, notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.portfolio_project_assets (id uuid primary key default gen_random_uuid(), project_id uuid not null references public.portfolio_projects on delete cascade, asset_type public.portfolio_asset_type not null default 'document', title text not null, description text not null default '', storage_bucket text not null default 'portfolio-assets', storage_path text not null, external_url text not null default '', file_name text not null default '', mime_type text not null default '', size_bytes bigint not null default 0, latitude double precision, longitude double precision, captured_at timestamptz, created_at timestamptz not null default now());

insert into public.portfolio_programmatic_areas(code,slug,name,short_name,accent,sort_order) values ('BP','produccion','Mejor Producción','Producción','#72D6C9',1),('BN','nutricion','Mejor Nutrición','Nutrición','#E5B86B',2),('BE','ambiente','Mejor Ambiente','Ambiente','#77B5E8',3),('BL','vida','Mejor Vida','Vida','#A99BE7',4) on conflict(code) do update set slug=excluded.slug,name=excluded.name,short_name=excluded.short_name,accent=excluded.accent;
EOF

cat > "$ROOT/supabase/migrations/202608260002_geoportal_views_rpc.sql" <<'EOF'
create or replace view public.portfolio_latest_financial with (security_invoker=true) as select distinct on (project_id) * from public.portfolio_financial_snapshots order by project_id,snapshot_date desc,created_at desc;
create or replace view public.portfolio_latest_update with (security_invoker=true) as select distinct on (project_id) * from public.portfolio_project_updates order by project_id,report_date desc,created_at desc;
create or replace view public.portfolio_project_staff_v with (security_invoker=true) as select ps.*,s.full_name,s.email,s.title,s.contract_type,s.active from public.portfolio_project_staff ps join public.portfolio_staff_members s on s.id=ps.staff_id;
create or replace view public.portfolio_project_locations_v with (security_invoker=true) as select l.*,p.code project_code,p.acronym project_acronym,p.title project_title,a.slug area_slug,case when l.geom is null then null else st_asgeojson(l.geom)::jsonb end geometry from public.portfolio_project_locations l join public.portfolio_projects p on p.id=l.project_id left join public.portfolio_project_programmatic_areas ppa on ppa.project_id=p.id and ppa.is_primary left join public.portfolio_programmatic_areas a on a.id=ppa.area_id;
create or replace view public.portfolio_project_summary with (security_invoker=true) as
select p.*,a.id primary_area_id,a.slug primary_area_slug,a.name primary_area_name,a.short_name primary_area_short_name,a.accent primary_area_accent,coalesce(f.expenditure_amount,0) spent,coalesce(f.commitments_amount,0) commitments,f.snapshot_date data_cutoff,case when p.budget_total>0 then round(coalesce(f.expenditure_amount,0)/p.budget_total*100,2) else 0 end execution_pct,case when p.budget_total>0 then round((coalesce(f.expenditure_amount,0)+coalesce(f.commitments_amount,0))/p.budget_total*100,2) else 0 end utilization_pct,coalesce(u.physical_progress_pct,0) physical_progress_pct,(select count(*) from public.portfolio_project_staff ps where ps.project_id=p.id) staff_count,(select count(*) from public.portfolio_project_components c where c.project_id=p.id) component_count,(select count(*) from public.portfolio_indicators i where i.project_id=p.id) indicator_count,(select array_agg(distinct l.department) filter(where l.department<>'') from public.portfolio_project_locations l where l.project_id=p.id) departments,(select array_agg(distinct l.municipality) filter(where l.municipality<>'') from public.portfolio_project_locations l where l.project_id=p.id) municipalities
from public.portfolio_projects p left join public.portfolio_project_programmatic_areas ppa on ppa.project_id=p.id and ppa.is_primary left join public.portfolio_programmatic_areas a on a.id=ppa.area_id left join public.portfolio_latest_financial f on f.project_id=p.id left join public.portfolio_latest_update u on u.project_id=p.id;
create or replace view public.portfolio_area_summary with (security_invoker=true) as select a.*,count(p.id) project_count,coalesce(sum(p.budget_total),0) total_budget,coalesce(sum(p.spent),0) spent,coalesce(sum(p.staff_count),0) staff_count,case when sum(p.budget_total)>0 then round(sum(p.spent)/sum(p.budget_total)*100,2) else 0 end execution_pct,coalesce(round(avg(p.physical_progress_pct),2),0) physical_progress_pct from public.portfolio_programmatic_areas a left join public.portfolio_project_summary p on p.primary_area_id=a.id group by a.id;
create or replace view public.portfolio_monthly_execution with (security_invoker=true) as select to_char(snapshot_date,'YYYY-MM') month_key,to_char(snapshot_date,'Mon YYYY') month_label,sum(planned_execution_amount) planned,sum(expenditure_amount) spent,sum(commitments_amount) commitments from public.portfolio_financial_snapshots group by 1,2 order by 1;

create or replace function public.portfolio_create_project_bundle(payload jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
declare v_project_id uuid; v_result_id uuid; v_staff_id uuid; area jsonb; component jsonb; result_row jsonb; indicator_row jsonb; location_row jsonb; staff_row jsonb;
begin
  insert into public.portfolio_projects(code,acronym,title,summary,country,donor,coordinator,start_date,end_date,currency,budget_total,status,is_demo)
  values(payload->'project'->>'code',coalesce(payload->'project'->>'acronym',''),payload->'project'->>'title',coalesce(payload->'project'->>'summary',''),coalesce(payload->'project'->>'country','Honduras'),coalesce(payload->'project'->>'donor',''),coalesce(payload->'project'->>'coordinator',''),(payload->'project'->>'start_date')::date,(payload->'project'->>'end_date')::date,coalesce(payload->'project'->>'currency','USD'),coalesce((payload->'project'->>'budget_total')::numeric,0),coalesce((payload->'project'->>'status')::public.portfolio_project_status,'draft'),coalesce((payload->'project'->>'is_demo')::boolean,false)) returning id into v_project_id;
  for area in select * from jsonb_array_elements(coalesce(payload->'areas','[]'::jsonb)) loop insert into public.portfolio_project_programmatic_areas(project_id,area_id,is_primary,contribution_pct) values(v_project_id,(area->>'area_id')::smallint,coalesce((area->>'is_primary')::boolean,false),coalesce((area->>'contribution_pct')::numeric,0)); end loop;
  for component in select * from jsonb_array_elements(coalesce(payload->'components','[]'::jsonb)) loop insert into public.portfolio_project_components(project_id,code,title,description,budget_allocated,progress_pct,sort_order) values(v_project_id,component->>'code',component->>'title',coalesce(component->>'description',''),coalesce((component->>'budget_allocated')::numeric,0),coalesce((component->>'progress_pct')::numeric,0),coalesce((component->>'sort_order')::int,0)); end loop;
  for result_row in select * from jsonb_array_elements(coalesce(payload->'results','[]'::jsonb)) loop insert into public.portfolio_results(project_id,code,level,title,description,sort_order) values(v_project_id,result_row->>'code',(result_row->>'level')::public.portfolio_result_level,result_row->>'title',coalesce(result_row->>'description',''),coalesce((result_row->>'sort_order')::int,0)) returning id into v_result_id; for indicator_row in select * from jsonb_array_elements(coalesce(result_row->'indicators','[]'::jsonb)) loop insert into public.portfolio_indicators(project_id,result_id,code,name,definition,unit,baseline_value,target_value,current_value,frequency,data_source) values(v_project_id,v_result_id,indicator_row->>'code',indicator_row->>'name',coalesce(indicator_row->>'definition',''),coalesce(indicator_row->>'unit',''),nullif(indicator_row->>'baseline_value','')::numeric,nullif(indicator_row->>'target_value','')::numeric,nullif(indicator_row->>'current_value','')::numeric,coalesce(indicator_row->>'frequency','quarterly'),coalesce(indicator_row->>'data_source','')); end loop; end loop;
  for location_row in select * from jsonb_array_elements(coalesce(payload->'locations','[]'::jsonb)) loop insert into public.portfolio_project_locations(project_id,geometry_type,department,municipality,location_name,intervention_type,latitude,longitude,geom,notes) values(v_project_id,coalesce((location_row->>'geometry_type')::public.portfolio_location_geometry_type,'point'),coalesce(location_row->>'department',''),coalesce(location_row->>'municipality',''),coalesce(location_row->>'location_name',''),coalesce(location_row->>'intervention_type',''),nullif(location_row->>'latitude','')::double precision,nullif(location_row->>'longitude','')::double precision,case when nullif(location_row->>'latitude','') is not null and nullif(location_row->>'longitude','') is not null then st_setsrid(st_makepoint((location_row->>'longitude')::double precision,(location_row->>'latitude')::double precision),4326) else null end,coalesce(location_row->>'notes','')); end loop;
  for staff_row in select * from jsonb_array_elements(coalesce(payload->'staff','[]'::jsonb)) loop select id into v_staff_id from public.portfolio_staff_members where (staff_row->>'email')<>'' and lower(email)=lower(staff_row->>'email') limit 1; if v_staff_id is null then insert into public.portfolio_staff_members(full_name,email,title,contract_type) values(staff_row->>'full_name',coalesce(staff_row->>'email',''),coalesce(staff_row->>'title',''),coalesce(staff_row->>'contract_type','')) returning id into v_staff_id; end if; insert into public.portfolio_project_staff(project_id,staff_id,role_title,allocation_pct) values(v_project_id,v_staff_id,coalesce(staff_row->>'role_title',''),coalesce((staff_row->>'allocation_pct')::numeric,100)); v_staff_id:=null; end loop;
  if payload ? 'financial' then insert into public.portfolio_financial_snapshots(project_id,snapshot_date,budget_amount,planned_execution_amount,expenditure_amount,commitments_amount,notes) values(v_project_id,(payload->'financial'->>'snapshot_date')::date,coalesce((payload->'financial'->>'budget_amount')::numeric,0),coalesce((payload->'financial'->>'planned_execution_amount')::numeric,0),coalesce((payload->'financial'->>'expenditure_amount')::numeric,0),coalesce((payload->'financial'->>'commitments_amount')::numeric,0),coalesce(payload->'financial'->>'notes','')); end if;
  if payload ? 'update' then insert into public.portfolio_project_updates(project_id,report_date,physical_progress_pct,summary,achievements,bottlenecks,next_steps) values(v_project_id,(payload->'update'->>'report_date')::date,coalesce((payload->'update'->>'physical_progress_pct')::numeric,0),coalesce(payload->'update'->>'summary',''),coalesce(payload->'update'->>'achievements',''),coalesce(payload->'update'->>'bottlenecks',''),coalesce(payload->'update'->>'next_steps','')); end if;
  return v_project_id;
end $$;

create or replace function public.portfolio_record_project_update(target_project_id uuid,payload jsonb) returns void language plpgsql security invoker set search_path=public as $$ begin insert into public.portfolio_financial_snapshots(project_id,snapshot_date,budget_amount,planned_execution_amount,expenditure_amount,commitments_amount,notes) values(target_project_id,(payload->>'snapshot_date')::date,coalesce((payload->>'budget_amount')::numeric,0),coalesce((payload->>'planned_execution_amount')::numeric,0),coalesce((payload->>'expenditure_amount')::numeric,0),coalesce((payload->>'commitments_amount')::numeric,0),coalesce(payload->>'notes','')) on conflict(project_id,snapshot_date) do update set budget_amount=excluded.budget_amount,planned_execution_amount=excluded.planned_execution_amount,expenditure_amount=excluded.expenditure_amount,commitments_amount=excluded.commitments_amount,notes=excluded.notes; insert into public.portfolio_project_updates(project_id,report_date,physical_progress_pct,summary,achievements,bottlenecks,next_steps) values(target_project_id,coalesce((payload->>'report_date')::date,(payload->>'snapshot_date')::date),coalesce((payload->>'physical_progress_pct')::numeric,0),coalesce(payload->>'summary',''),coalesce(payload->>'achievements',''),coalesce(payload->>'bottlenecks',''),coalesce(payload->>'next_steps','')) on conflict(project_id,report_date) do update set physical_progress_pct=excluded.physical_progress_pct,summary=excluded.summary,achievements=excluded.achievements,bottlenecks=excluded.bottlenecks,next_steps=excluded.next_steps; if payload ? 'status' then update public.portfolio_projects set status=(payload->>'status')::public.portfolio_project_status,updated_at=now() where id=target_project_id; end if; end $$;
EOF

cat > "$ROOT/supabase/migrations/202608260003_mvp_access_storage.sql" <<'EOF'
-- Acceso abierto solo para prototipo. No cargar información oficial o sensible bajo este modelo.
do $$ declare t text; begin foreach t in array array['portfolio_programmatic_areas','portfolio_projects','portfolio_project_programmatic_areas','portfolio_project_components','portfolio_results','portfolio_indicators','portfolio_staff_members','portfolio_project_staff','portfolio_project_locations','portfolio_financial_snapshots','portfolio_project_updates','portfolio_risks','portfolio_project_milestones','portfolio_project_assets'] loop execute format('alter table public.%I enable row level security',t); execute format('drop policy if exists "MVP read %s" on public.%I',t,t); execute format('create policy "MVP read %s" on public.%I for select to anon,authenticated using (true)',t,t); execute format('drop policy if exists "MVP insert %s" on public.%I',t,t); execute format('create policy "MVP insert %s" on public.%I for insert to anon,authenticated with check (true)',t,t); execute format('drop policy if exists "MVP update %s" on public.%I',t,t); execute format('create policy "MVP update %s" on public.%I for update to anon,authenticated using (true) with check (true)',t,t); end loop; end $$;
grant usage on schema public to anon,authenticated;
grant select,insert,update on all tables in schema public to anon,authenticated;
grant usage,select on all sequences in schema public to anon,authenticated;
grant execute on function public.portfolio_create_project_bundle(jsonb) to anon,authenticated;
grant execute on function public.portfolio_record_project_update(uuid,jsonb) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio-assets','portfolio-assets',true,26214400,array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','application/geo+json','application/zip']) on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "MVP public read portfolio assets" on storage.objects; create policy "MVP public read portfolio assets" on storage.objects for select to anon,authenticated using(bucket_id='portfolio-assets');
drop policy if exists "MVP public insert portfolio assets" on storage.objects; create policy "MVP public insert portfolio assets" on storage.objects for insert to anon,authenticated with check(bucket_id='portfolio-assets');
EOF

cat > "$ROOT/docs/ARQUITECTURA.md" <<'EOF'
# Arquitectura funcional

```text
Next.js / React
├── Centro de mando
├── Cartera de proyectos
├── Geoportal municipal
├── Ficha Proyecto 360°
└── Alta y actualización progresiva
        │
        ▼
Supabase
├── PostgreSQL + PostGIS
├── Vistas agregadas
├── RPC transaccionales
├── Storage de evidencias
└── Cortes técnicos y financieros históricos
```

## Reglas de interpretación

1. El presupuesto se contabiliza una sola vez bajo el área principal.
2. Las áreas secundarias expresan contribución, no duplicación del monto.
3. Una ubicación municipal indica presencia; no equivale automáticamente a inversión municipal.
4. Las superposiciones se calculan con proyectos distintos por municipio.
5. Gasto y compromisos se mantienen separados.
6. El avance técnico se conserva como serie histórica, no como un único porcentaje sobrescrito.
7. RRHH se modela como persona y asignación para evitar confundir personas únicas con dedicaciones por proyecto.
EOF

cat > "$ROOT/docs/DICCIONARIO_DATOS.md" <<'EOF'
# Diccionario de datos resumido

| Entidad | Finalidad |
|---|---|
| `portfolio_projects` | Identidad, vigencia, presupuesto y estado del proyecto |
| `portfolio_programmatic_areas` | Cuatro Mejoras y catálogo programático |
| `portfolio_project_programmatic_areas` | Área principal y contribuciones secundarias |
| `portfolio_project_components` | Componentes operativos y avance |
| `portfolio_results` | Cadena de impacto, outcomes y outputs |
| `portfolio_indicators` | Línea base, meta, valor y fuente |
| `portfolio_financial_snapshots` | Cortes históricos de presupuesto, plan, gasto y compromisos |
| `portfolio_project_updates` | Cortes históricos de avance físico, logros y cuellos de botella |
| `portfolio_staff_members` | Catálogo de personas |
| `portfolio_project_staff` | Rol y dedicación por proyecto |
| `portfolio_project_locations` | Punto, municipio, polígono, corredor o paisaje |
| `portfolio_risks` | Riesgos, severidad, mitigación y responsable |
| `portfolio_project_milestones` | Hitos, fechas y responsables |
| `portfolio_project_assets` | Fotografías, documentos, mapas y bases de datos |
EOF

cat > "$ROOT/README.md" <<'EOF'
# Geoportal de Proyectos FAO Honduras · MVP

Aplicación web para organizar, visualizar y monitorear la cartera de proyectos desde una arquitectura común de programas, recursos, resultados, equipos y territorio.

## Incluye

- Centro de mando ejecutivo.
- Cuatro Mejoras: Producción, Nutrición, Ambiente y Vida.
- Presupuesto, gasto, compromisos, ejecución y avance físico.
- Explorador de cartera con búsqueda y filtros.
- Geoportal oscuro de Honduras con límites municipales y convergencias.
- Ficha Proyecto 360°.
- Matriz de resultados e indicadores.
- Registro progresivo de proyectos.
- Captura de coordenadas mediante mapa.
- Carga de fotografías y documentos a Supabase Storage.
- Cortes periódicos que conservan el historial.
- Modo demostrativo local cuando faltan las variables de Supabase.

## Ejecutar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`.

## Backend conectado

La instancia inicial utiliza el proyecto Supabase `Geoportal`. Configure en `.env.local` la URL y una clave publicable. Nunca coloque una clave `service_role` en variables `NEXT_PUBLIC_*`.

## Seguridad

Por decisión de alcance, esta primera versión no incorpora autenticación ni roles. Las políticas de escritura abiertas existen únicamente para probar el flujo funcional. **No cargue datos oficiales, personales, contractuales o sensibles** hasta implementar autenticación, permisos y políticas RLS restrictivas.

## Datos demostrativos

Los proyectos y cifras iniciales están marcados como `DEMO`; no representan información oficial de FAO Honduras.
EOF

cat > "$ROOT/VALIDATION.md" <<'EOF'
# Validación

El flujo automatizado del repositorio ejecuta instalación, ESLint y compilación de producción con Node.js 22. La arquitectura de base de datos incluye migraciones reproducibles y el backend conectado fue probado previamente con transacciones y `ROLLBACK`.

La publicación institucional requiere una segunda revisión de seguridad antes de usar datos reales.
EOF

cat > "START_HERE_GEOportal.md" <<'EOF'
# Inicio rápido · Geoportal de Proyectos FAO Honduras

El código del MVP se encuentra en [`geoportal-mvp`](./geoportal-mvp).

```bash
cd geoportal-mvp
npm install
cp .env.example .env.local
npm run dev
```

Los datos precargados son demostrativos. Antes de una puesta en producción deben implementarse autenticación, permisos por operación y separación entre información pública e interna.
EOF

printf 'Geoportal generado en %s\n' "$ROOT"
