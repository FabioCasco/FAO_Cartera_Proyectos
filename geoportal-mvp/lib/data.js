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
  if (!sb || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") {
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
  if (!sb || !files?.length || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") return [];
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
  if (!sb || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") return true;
  const { error } = await sb.rpc("portfolio_record_project_update", { target_project_id: projectId, payload });
  if (error) throw error;
  return true;
}
