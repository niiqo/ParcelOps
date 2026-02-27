"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/ingreso", label: "Ingreso" },
  { href: "/retiro", label: "Retiros" },
  { href: "/busqueda", label: "Búsqueda" },
  { href: "/reportes", label: "Reportes" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Panel",
  "/ingreso": "Ingreso",
  "/retiro": "Retiros",
  "/busqueda": "Búsqueda",
  "/reportes": "Reportes",
};

const SHELL_EXCLUDED_PREFIXES = ["/login"];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isExcluded = useMemo(
    () => SHELL_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix)),
    [pathname],
  );

  const title = PAGE_TITLES[pathname] ?? "ParcelOps";

  if (isExcluded) return <>{children}</>;

  return (
    <div className="app-shell">
      <div className="app-shell__layout">
        <aside className={`app-shell__sidebar ${mobileOpen ? "is-open" : ""}`}>
          <div className="app-shell__brand">
            <p>ParcelOps</p>
            <span>Dashboard de operaciones</span>
          </div>

          <nav>
            <ul className="app-shell__nav-list">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`app-shell__nav-link ${isActive ? "is-active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            className="app-shell__backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
        ) : null}

        <div className="app-shell__content">
          <header className="app-shell__header">
            <button
              type="button"
              className="app-shell__menu-btn"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-expanded={mobileOpen}
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <h1>{title}</h1>
            <div id="app-shell-actions" />
          </header>

          <main className="app-shell__main">{children}</main>
        </div>
      </div>
    </div>
  );
}
