"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthProvider";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/busqueda", label: "Búsqueda", icon: "🔎" },
  { href: "/ingreso", label: "Ingreso", icon: "📦" },
  { href: "/retiro", label: "Retiros", icon: "🚚" },
  { href: "/reorganizacion", label: "Reorganización", icon: "🔄"},
  { href: "/paquetes", label: "Paquetes", icon: "🗂️" },
  { href: "/reportes", label: "Reportes", icon: "📊" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Panel",
  "/reorganizacion": "Reorganización",
  "/ingreso": "Ingreso",
  "/paquetes": "Paquetes",
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

  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const title = PAGE_TITLES[pathname] ?? "ParcelOps";

  if (isExcluded) return <>{children}</>;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full">
        {/* Sidebar (desktop) */}
        <aside className="hidden h-full w-72 flex-col overflow-hidden border-r bg-white lg:flex">
          <div className="px-5 py-5">
            <div className="text-lg font-semibold">ParcelOps</div>
            <div className="text-sm text-slate-600">Dashboard de operaciones</div>
          </div>

          {/* SOLO el nav puede scrollear si crece */}
          <nav className="flex-1 overflow-y-auto px-3">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer fijo abajo */}
          <div className="border-t p-3">
            <div className="mb-2 px-2 text-xs text-slate-500">
              {user?.email ?? "Sesión iniciada"}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            />

            <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col overflow-hidden border-r bg-white lg:hidden">
              <div className="flex items-start justify-between px-5 py-5">
                <div>
                  <div className="text-lg font-semibold">ParcelOps</div>
                  <div className="text-sm text-slate-600">
                    Dashboard de operaciones
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-md border px-2 py-1 text-sm hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3">
                <ul className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                            isActive
                              ? "bg-slate-900 text-white"
                              : "text-slate-700 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          <span aria-hidden="true">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t p-3">
                <div className="mb-2 px-2 text-xs text-slate-500">
                  {user?.email ?? "Sesión iniciada"}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await handleLogout();
                  }}
                  className="flex w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Cerrar sesión
                </button>
              </div>
            </aside>
          </>
        ) : null}

        {/* Content */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-expanded={mobileOpen}
                aria-label="Abrir menú"
              >
                ☰
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-semibold">{title}</h1>
                <p className="text-xs text-slate-500">
                  Gestión de paquetería y movimientos
                </p>
              </div>

              <div id="app-shell-actions" />
            </div>
          </header>

          {/* SOLO main scrollea */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}