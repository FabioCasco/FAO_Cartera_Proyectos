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
