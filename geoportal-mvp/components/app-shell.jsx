"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  Database,
  FolderPlus,
  LogOut,
  Map,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useRouteScrollRestoration } from "@/lib/persistent-state";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nav = [
  { href: "/", label: "Centro de mando", icon: BarChart3 },
  { href: "/projects", label: "Cartera", icon: BriefcaseBusiness },
  { href: "/geoportal", label: "Geoportal", icon: Map },
  { href: "/projects/new", label: "Agregar proyecto", icon: FolderPlus },
];

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href === "/projects") {
    return pathname === "/projects" || pathname === "/project";
  }
  return pathname.startsWith(href);
}

function connectionTitle(connection) {
  if (connection === "connected") return "FAO-HN-GeoHub conectado";
  if (connection === "degraded") return "Sesión activa · conexión inestable";
  if (connection === "error") return "Supabase requiere atención";
  return "Verificando Supabase";
}

export function AppShell({ children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { user, connection, connectionMessage, signOut } = useAuth();

  useRouteScrollRestoration(pathname);

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error.message || "No fue posible cerrar la sesión.");
    }
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <img
            src={`${publicBasePath}/geoportal-mark.svg`}
            alt=""
            width="42"
            height="42"
          />
          <div>
            <strong>FAO Honduras</strong>
            <span>Portfolio Intelligence</span>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "nav-item--active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                <ChevronRight className="nav-arrow" size={14} />
              </Link>
            );
          })}
        </nav>

        <div className={`sidebar-status sidebar-status--${connection}`}>
          <span className="status-dot" />
          <div>
            <strong>{connectionTitle(connection)}</strong>
            <small>{connectionMessage}</small>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Menú"
            type="button"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-title">
            <Database size={16} />
            <span>Sistema Integrado de Cartera y Resultados</span>
          </div>

          <div className="topbar-actions">
            <div className="pilot-chip">
              <ShieldCheck size={13} /> PILOTO OPERATIVO
            </div>
            <div className="account-menu">
              <button
                className="account-trigger"
                onClick={() => setAccountOpen((value) => !value)}
                type="button"
              >
                <UserRound size={16} />
                <span>{user?.email || "Usuario"}</span>
              </button>
              {accountOpen && (
                <div className="account-popover">
                  <span className="eyebrow">SESIÓN PROTEGIDA</span>
                  <strong>{user?.email}</strong>
                  <small>Supabase Auth · operador de cartera</small>
                  {signOutError && (
                    <div className="form-error">{signOutError}</div>
                  )}
                  <button onClick={handleSignOut} type="button">
                    <LogOut size={15} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">{children}</main>
      </div>

      {open && (
        <button
          className="backdrop"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
          type="button"
        />
      )}
    </div>
  );
}
