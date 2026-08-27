"use client";

import { getSupabase } from "./supabase";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Revise las variables públicas del despliegue.",
    );
  }
  return supabase;
}

function rows(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data || [];
}

async function fetchJson(path, label) {
  const response = await fetch(`${publicBasePath}${path}`, {
    cache: "force-cache",
  });
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`);
  }
  return response.json();
}

export async function getGeoportalSnapshot() {
  const supabase = requireClient();
  const [presence, areas, departments, municipalities] = await Promise.all([
    supabase
      .from("portfolio_geo_presence_v")
      .select("*")
      .order("department")
      .order("municipality"),
    supabase
      .from("portfolio_geo_area_summary")
      .select("*")
      .order("area_id"),
    supabase
      .from("portfolio_geo_department_summary")
      .select("*")
      .order("project_count", { ascending: false })
      .order("department"),
    supabase
      .from("portfolio_geo_municipality_summary")
      .select("*")
      .order("project_count", { ascending: false })
      .order("department")
      .order("municipality"),
  ]);

  return {
    presence: rows(presence, "No fue posible cargar la presencia territorial"),
    areas: rows(areas, "No fue posible cargar el resumen por área"),
    departments: rows(
      departments,
      "No fue posible cargar el resumen por departamento",
    ),
    municipalities: rows(
      municipalities,
      "No fue posible cargar el resumen por municipio",
    ),
  };
}

export async function loadHondurasBoundaries() {
  const [departments, municipalities, index] = await Promise.all([
    fetchJson("/data/hnd-adm1.geojson", "Límites departamentales"),
    fetchJson("/data/hnd-adm2.geojson", "Límites municipales"),
    fetchJson("/data/hnd-admin-index.json", "Catálogo administrativo"),
  ]);

  return { departments, municipalities, index };
}
