#!/usr/bin/env python3
"""Adapt the generated FAO Honduras Geoportal for GitHub Pages.

The generator remains the reproducible source for the MVP. This script applies
static-export routing, safe public-demo behaviour and React quality fixes before
GitHub Actions runs lint and the production build.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Required pattern not found: {label}")
    return text.replace(old, new, 1)


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "geoportal-mvp")
    if not root.exists():
        raise SystemExit(f"Application directory does not exist: {root}")

    (root / "next.config.mjs").write_text(
        dedent(
            '''\
            /** @type {import("next").NextConfig} */
            const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] || "FAO_Cartera_Proyectos";
            const isGitHubPages = process.env.GITHUB_PAGES === "true";
            const basePath = isGitHubPages ? `/${repositoryName}` : "";

            const nextConfig = {
              reactStrictMode: true,
              poweredByHeader: false,
              output: "export",
              trailingSlash: true,
              basePath,
              assetPrefix: basePath || undefined,
              images: { unoptimized: true },
            };

            export default nextConfig;
            '''
        )
    )

    # GitHub Pages cannot resolve an arbitrary dynamic route at request time.
    # Project links therefore use a single static page plus a query parameter.
    for path in [*root.rglob("*.js"), *root.rglob("*.jsx")]:
        text = path.read_text()
        text = text.replace("`/projects/${", "`/project?id=${")
        text = text.replace("'/projects/${", "'/project?id=${")
        text = text.replace('"/projects/${', '"/project?id=${')
        path.write_text(text)

    project_component = root / "components" / "project-360.jsx"
    text = project_component.read_text()
    text = text.replace('import { useParams } from "next/navigation";\n', "")
    text = replace_once(
        text,
        'export function Project360() {\n  const { id } = useParams();',
        'export function Project360({ id }) {',
        "Project360 route parameter",
    )
    project_component.write_text(text)

    dynamic_route = root / "app" / "projects" / "[id]"
    if dynamic_route.exists():
        shutil.rmtree(dynamic_route)

    static_route = root / "app" / "project"
    static_route.mkdir(parents=True, exist_ok=True)
    (static_route / "page.jsx").write_text(
        dedent(
            '''\
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
            '''
        )
    )

    app_shell = root / "components" / "app-shell.jsx"
    text = app_shell.read_text()
    if "NEXT_PUBLIC_BASE_PATH" not in text:
        text = replace_once(
            text,
            "const nav = [",
            'const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";\n\nconst nav = [',
            "public base path",
        )
    text = text.replace(
        'src="/geoportal-mark.svg"',
        'src={`${publicBasePath}/geoportal-mark.svg`}',
    )
    text = text.replace("Supabase conectado", "Supabase · lectura pública")
    app_shell.write_text(text)

    # The Pages publication reads live portfolio data from Supabase. Mutating
    # actions remain local in public-demo mode until authentication is added.
    data_file = root / "lib" / "data.js"
    text = data_file.read_text()
    text = replace_once(
        text,
        "if (!sb) {",
        'if (!sb || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") {',
        "local project creation fallback",
    )
    text = text.replace(
        "if (!sb || !files?.length) return [];",
        'if (!sb || !files?.length || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") return [];',
    )
    text = text.replace(
        "if (!sb) return true;",
        'if (!sb || process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === "public-demo") return true;',
    )
    data_file.write_text(text)

    dashboard = root / "components" / "dashboard.jsx"
    text = dashboard.read_text()
    bad_alerts = '  const alerts = [...data.projects].filter((p) => ["attention", "critical", "closing"].includes(p.status)).sort((a, b) => ({ critical: 0, attention: 1, closing: 2 }[a.status] - ({ critical: 0, attention: 1, closing: 2 }[b.status])).slice(0, 4);'
    good_alerts = '  const alertOrder = { critical: 0, attention: 1, closing: 2 };\n  const alerts = [...data.projects].filter((p) => ["attention", "critical", "closing"].includes(p.status)).sort((a, b) => (alertOrder[a.status] ?? 99) - (alertOrder[b.status] ?? 99)).slice(0, 4);'
    dashboard.write_text(
        replace_once(text, bad_alerts, good_alerts, "dashboard alert ordering")
    )

    project_360 = root / "components" / "project-360.jsx"
    text = project_360.read_text()
    old_data_state = '  const [data, setData] = useState(null); const [tab, setTab] = useState("Resumen"); const [updateOpen, setUpdateOpen] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");'
    text = replace_once(
        text,
        old_data_state,
        old_data_state + '\n  const [now, setNow] = useState(null);',
        "Project360 now state",
    )
    old_fetch = '  useEffect(() => { getProject(id).then(setData); }, [id]);'
    text = replace_once(
        text,
        old_fetch,
        old_fetch + '\n  useEffect(() => { const timer = window.setTimeout(() => setNow(Date.now()), 0); return () => window.clearTimeout(timer); }, []);',
        "Project360 current time effect",
    )
    old_time = '  const timeProgress = useMemo(() => { if (!p) return 0; const start = new Date(p.start_date).getTime(); const end = new Date(p.end_date).getTime(); return Math.max(0, Math.min(100, (Date.now() - start) / (end - start) * 100)); }, [p]);'
    new_time = '  const timeProgress = useMemo(() => { if (!p || !now) return 0; const start = new Date(p.start_date).getTime(); const end = new Date(p.end_date).getTime(); return Math.max(0, Math.min(100, (now - start) / (end - start) * 100)); }, [p, now]);'
    text = replace_once(text, old_time, new_time, "Project360 pure time progress")
    old_form_effect = '  useEffect(() => { if (p) setForm((v) => ({ ...v, expenditure_amount: p.spent || 0, commitments_amount: p.commitments || 0, physical_progress_pct: p.physical_progress_pct || 0, status: p.status || "active" })); }, [p]);\n'
    open_update = dedent(
        '''\
          function openUpdate() {
            setMessage("");
            setForm((current) => ({
              ...current,
              expenditure_amount: p?.spent || 0,
              commitments_amount: p?.commitments || 0,
              physical_progress_pct: p?.physical_progress_pct || 0,
              status: p?.status || "active",
            }));
            setUpdateOpen(true);
          }
        '''
    )
    text = replace_once(
        text,
        old_form_effect,
        open_update,
        "Project360 update form initialization",
    )
    text = replace_once(
        text,
        'onClick={() => setUpdateOpen(true)}',
        'onClick={openUpdate}',
        "Project360 update button",
    )
    project_360.write_text(text)

    project_form = root / "components" / "project-form.jsx"
    text = project_form.read_text()
    old_budget_effect = '  useEffect(() => { setFinancial((v) => ({ ...v, budget_amount: Number(project.budget_total || 0) })); }, [project.budget_total]);\n'
    project_form.write_text(
        replace_once(text, old_budget_effect, "", "redundant budget effect")
    )

    env_example = root / ".env.example"
    if env_example.exists():
        env_example.write_text(
            dedent(
                '''\
                NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
                NEXT_PUBLIC_HONDURAS_ADM2_GEOJSON_URL=https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/HND/ADM2/geoBoundaries-HND-ADM2_simplified.geojson
                NEXT_PUBLIC_DEPLOYMENT_MODE=local
                '''
            )
        )

    print(f"GitHub Pages preparation completed for {root}")


if __name__ == "__main__":
    main()
