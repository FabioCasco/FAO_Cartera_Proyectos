"use client";

import { getSupabase } from "./supabase";
import {
  demoAreas,
  demoLocations,
  demoMonthly,
  demoProjectDetail,
  demoProjects,
} from "./demo-data";

const deploymentMode =
  process.env.NEXT_PUBLIC_DEPLOYMENT_MODE || "operational";
const explicitDemoMode = deploymentMode === "demo";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Revise las variables de GitHub Actions.",
    );
  }
  return supabase;
}

async function requireSession() {
  const supabase = requireClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session) {
    throw new Error("La sesión expiró. Inicie sesión nuevamente.");
  }

  return { supabase, session };
}

function ensureData(result, fallback, label) {
  if (result.error) {
    if (explicitDemoMode) return fallback;
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data || [];
}

export async function getAreas() {
  if (explicitDemoMode) return demoAreas;
  const supabase = requireClient();
  const result = await supabase
    .from("portfolio_area_summary")
    .select("*")
    .order("id");
  return ensureData(result, demoAreas, "No fue posible cargar las áreas");
}

export async function getProjects() {
  if (explicitDemoMode) return demoProjects;
  const supabase = requireClient();
  const result = await supabase
    .from("portfolio_project_summary")
    .select("*")
    .order("updated_at", { ascending: false });
  return ensureData(result, demoProjects, "No fue posible cargar la cartera");
}

export async function getMonthlyExecution() {
  if (explicitDemoMode) return demoMonthly;
  const supabase = requireClient();
  const result = await supabase
    .from("portfolio_monthly_execution")
    .select("*")
    .order("month_key");
  return ensureData(
    result,
    demoMonthly,
    "No fue posible cargar la ejecución mensual",
  );
}

export async function getLocations() {
  if (explicitDemoMode) return demoLocations;
  const supabase = requireClient();
  const result = await supabase
    .from("portfolio_project_locations_v")
    .select("*");
  return ensureData(
    result,
    demoLocations,
    "No fue posible cargar las intervenciones territoriales",
  );
}

export async function getDashboard() {
  const [areas, projects, monthly, locations] = await Promise.all([
    getAreas(),
    getProjects(),
    getMonthlyExecution(),
    getLocations(),
  ]);
  return { areas, projects, monthly, locations };
}

async function signAssetUrls(supabase, assets) {
  return Promise.all(
    (assets || []).map(async (asset) => {
      if (!asset.storage_path) return asset;
      const bucket = asset.storage_bucket || "portfolio-assets";
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      return {
        ...asset,
        external_url: error ? "" : data.signedUrl,
        signed_url_error: error?.message || "",
      };
    }),
  );
}

export async function getProject(id) {
  if (!id) throw new Error("No se especificó el proyecto.");
  if (explicitDemoMode || id.startsWith("demo-")) {
    return demoProjectDetail(id);
  }

  const supabase = requireClient();
  const [
    summary,
    components,
    results,
    indicators,
    staff,
    locations,
    risks,
    milestones,
    assets,
    snapshots,
    updates,
  ] = await Promise.all([
    supabase
      .from("portfolio_project_summary")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("portfolio_project_components")
      .select("*")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("portfolio_results")
      .select("*")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("portfolio_indicators")
      .select("*")
      .eq("project_id", id)
      .order("code"),
    supabase
      .from("portfolio_project_staff_v")
      .select("*")
      .eq("project_id", id),
    supabase
      .from("portfolio_project_locations_v")
      .select("*")
      .eq("project_id", id),
    supabase
      .from("portfolio_risks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_project_milestones")
      .select("*")
      .eq("project_id", id)
      .order("due_date"),
    supabase
      .from("portfolio_project_assets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("portfolio_financial_snapshots")
      .select("*")
      .eq("project_id", id)
      .order("snapshot_date"),
    supabase
      .from("portfolio_project_updates")
      .select("*")
      .eq("project_id", id)
      .order("report_date", { ascending: false }),
  ]);

  const queries = [
    summary,
    components,
    results,
    indicators,
    staff,
    locations,
    risks,
    milestones,
    assets,
    snapshots,
    updates,
  ];
  const failed = queries.find((query) => query.error);
  if (failed?.error) throw failed.error;
  if (!summary.data) {
    throw new Error(
      "El proyecto no existe, fue retirado de la cartera o no está disponible para esta cuenta.",
    );
  }

  return {
    project: summary.data,
    components: components.data || [],
    results: results.data || [],
    indicators: indicators.data || [],
    staff: staff.data || [],
    locations: locations.data || [],
    risks: risks.data || [],
    milestones: milestones.data || [],
    assets: await signAssetUrls(supabase, assets.data || []),
    snapshots: snapshots.data || [],
    updates: updates.data || [],
  };
}

export async function createProjectBundle(payload) {
  if (explicitDemoMode) {
    throw new Error(
      "El modo demostrativo no permite crear proyectos institucionales.",
    );
  }

  const { supabase } = await requireSession();
  const { data, error } = await supabase.rpc(
    "portfolio_create_project_bundle",
    { payload },
  );
  if (error) throw error;
  return data;
}

export async function uploadProjectAssets(projectId, files) {
  if (!files?.length) return [];
  const { supabase, session } = await requireSession();
  const uploaded = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storagePath = `${projectId}/${session.user.id}/${Date.now()}-${safeName}`;
    const bucket = "portfolio-assets";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
    if (uploadError) throw uploadError;

    const { data, error: rowError } = await supabase
      .from("portfolio_project_assets")
      .insert({
        project_id: projectId,
        title: file.name,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_bucket: bucket,
        storage_path: storagePath,
        external_url: "",
        asset_type: file.type.startsWith("image/") ? "photo" : "document",
      })
      .select()
      .single();

    if (rowError) {
      await supabase.storage.from(bucket).remove([storagePath]);
      throw rowError;
    }

    uploaded.push(data);
  }

  return uploaded;
}

export async function recordProjectUpdate(projectId, payload) {
  const { supabase } = await requireSession();
  const { error } = await supabase.rpc("portfolio_record_project_update", {
    target_project_id: projectId,
    payload,
  });
  if (error) throw error;
  return true;
}

export async function deleteProject(projectId, confirmationCode) {
  const { supabase } = await requireSession();
  const { error } = await supabase.rpc("portfolio_delete_project", {
    target_project_id: projectId,
    confirmation_code: confirmationCode,
  });
  if (error) throw error;
  return true;
}
