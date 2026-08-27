"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BriefcaseBusiness, ChevronRight, Database, FolderPlus, Map, Menu, X } from "lucide-react";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

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
          <img src={`${publicBasePath}/geoportal-mark.svg`} alt="" width="42" height="42" />
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
          <div><strong>Supabase · lectura pública</strong><small>MVP · datos demostrativos</small></div>
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
